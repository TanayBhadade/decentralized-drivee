"use client";
import { useState, useEffect } from 'react';
import { create } from '@storacha/client';
import CryptoJS from 'crypto-js';
import dynamic from 'next/dynamic';

import { useRouter } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import StorachaAuthService, { StorachaAuthErrors } from '../../utils/storachaAuth';

// Components
import Sidebar from '../../components/Sidebar';
import FileCrystal from '../../components/FileCrystal';
import FileTable from '../../components/FileTable';
import Dashboard from '../../components/Dashboard';
import FileSharing from '../../components/FileSharing';
import FileVersions from '../../components/FileVersions';
import SharedFiles from '../../components/SharedFiles';
import ModernSidebar from '../../components/dashboard/ModernSidebar';
import StatCard from '../../components/dashboard/StatCard';
import UploadCenter from '../../components/UploadCenter';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import StorachaStatus from '../../components/StorachaStatus';
import { ToastManager } from '../../components/NotificationToast';
// Dynamic import for AIFileChat to reduce initial bundle size
const AIFileChat = dynamic(() => import('../../components/AIFileChat'), {
  loading: () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl p-8">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin"></div>
          <span className="text-light-silver">Loading AI Chat...</span>
        </div>
      </div>
    </div>
  ),
  ssr: false
});
// Dynamic import for AnalysisResults to reduce initial bundle size
const AnalysisResults = dynamic(() => import('../../components/AnalysisResults'), {
  loading: () => (
    <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl p-6">
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin"></div>
        <span className="text-light-silver">Loading Analysis Results...</span>
      </div>
    </div>
  ),
  ssr: false
});
import AnalysisProgress from '../../components/AnalysisProgress';
import { clientAI } from '../../utils/clientAI';
import { decryptFile } from '../../utils/autoEncryption';


export default function DashboardPage() {
  const router = useRouter();
  const { account, connectWallet, contract, disconnectWallet, isInitialized } = useWallet();

  // All useState hooks must be called before any early returns
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isClient, setIsClient] = useState(false); // State to handle hydration
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFileForSharing, setSelectedFileForSharing] = useState(null);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedFileForVersions, setSelectedFileForVersions] = useState(null);
  const [activeTab, setActiveTab] = useState('myFiles'); // 'myFiles' or 'sharedFiles'
  const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard', 'vault', 'upload', 'analytics', 'settings'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [selectedFileForDedicatedSharing, setSelectedFileForDedicatedSharing] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    storageUsed: '0 MB',
    uploadsThisMonth: 0,
    activeShares: 0
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');
  const [analyzingFileName, setAnalyzingFileName] = useState('');
  
  // Storacha client states
  const [storachaClient, setStorachaClient] = useState(null);
  const [isStorachaReady, setIsStorachaReady] = useState(false);
  const [storachaEmail, setStorachaEmail] = useState('');
  const [isStorachaLoading, setIsStorachaLoading] = useState(false);
  const [storachaSpace, setStorachaSpace] = useState(null);
  const [userAccount, setUserAccount] = useState(null); // Store authenticated user account
  const [authError, setAuthError] = useState(null);
  
  // STOR token economy states
  const [storBalance, setStorBalance] = useState(1000); // Initial airdrop of 1000 STOR
  const [showBuyStorModal, setShowBuyStorModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // All useEffect hooks must be called before any early returns
  // This effect runs only once on the client after the component mounts
  useEffect(() => {
    setIsClient(true);
    // Initialize Storacha client and restore session
    const initStoracha = async () => {
      try {
        const client = await create();
        setStorachaClient(client);
        
        // First, check for existing session using client.login() without email
        // This is the proper way to check for session persistence according to Storacha docs
        try {
          console.log('Checking for existing Storacha session...');
          const account = await client.login(); // No email parameter - checks for existing session
          
          if (account) {
            console.log('Found existing authenticated session:', account.did());
            setUserAccount(account);
            
            // Try to restore space from local storage
            const existingSession = StorachaAuthService.getSession();
            if (existingSession && existingSession.email && existingSession.sessionData?.space) {
              const space = existingSession.sessionData.space;
              try {
                await client.setCurrentSpace(space.did || space.toString());
                setStorachaSpace(space);
                setStorachaEmail(existingSession.email);
                setIsStorachaReady(true);
                setAuthError(null);
                
                console.log('Session fully restored with space:', space.did || space.toString());
                if (window.showToast) {
                  window.showToast('Welcome back! Your Storacha session has been restored.', 'success');
                }
                return;
              } catch (spaceError) {
                console.warn('Failed to restore space, but account is authenticated:', spaceError);
              }
            }
            
            // Account is authenticated but no space - save session and set ready state
            const email = existingSession?.email || account.did();
            try {
              StorachaAuthService.saveSession(email, null, { loginTimestamp: Date.now() });
            } catch (saveError) {
              console.warn('Failed to save session without space:', saveError.message);
            }
            
            setStorachaEmail(email);
            setIsStorachaReady(true);
            setAuthError(null);
            
            console.log('Session restored, but space needs to be created or selected');
            if (window.showToast) {
              window.showToast('Session restored. Please create or select a space to continue.', 'info');
            }
            return;
          }
        } catch (loginError) {
          console.log('No existing session found or session invalid:', loginError.message);
          // No existing session, continue to check local storage for fallback
        }
        
        // Fallback: Check local storage for session data (legacy support)
        try {
          const existingSession = StorachaAuthService.getSession();
          if (existingSession && existingSession.email) {
            console.log('Found local session data for:', existingSession.email);
            
            // Validate session integrity
            const sessionValidation = StorachaAuthService.validateSessionIntegrity();
            if (!sessionValidation.isValid) {
              console.log('Local session validation failed:', sessionValidation.error);
              StorachaAuthService.clearSession();
              setIsStorachaReady(false);
              return;
            }
            
            // Try to restore authentication using stored email (legacy fallback)
            try {
              console.log('Attempting to restore session with stored email...');
              const account = await client.login(existingSession.email);
              
              if (account) {
                setUserAccount(account);
                setStorachaEmail(existingSession.email);
                setIsStorachaReady(true);
                setAuthError(null);
                
                console.log('Session restored via email login');
                if (window.showToast) {
                  window.showToast('Session restored. Please create or select a space.', 'info');
                }
                return;
              }
            } catch (restoreError) {
              console.log('Failed to restore session with stored email:', restoreError.message);
              StorachaAuthService.clearSession();
            }
          } else {
            console.log('No local session data found');
          }
        } catch (error) {
          // Handle specific authentication errors
          if (error.type === StorachaAuthErrors.SESSION_EXPIRED) {
            console.log('Session expired during initialization');
            setAuthError('Your session has expired. Please log in again.');
            if (window.showToast) {
              window.showToast('Your Storacha session has expired. Please log in again.', 'warning');
            }
          } else if (error.type === StorachaAuthErrors.SESSION_CORRUPTED) {
            console.log('Session corrupted during initialization');
            setAuthError('Session data is corrupted. Please log in again.');
            if (window.showToast) {
              window.showToast('Session data is corrupted. Please log in again.', 'error');
            }
          } else if (error.type === StorachaAuthErrors.STORAGE_NOT_AVAILABLE) {
            console.error('Storage not available');
            setAuthError('Browser storage is not available. Please check your browser settings.');
            if (window.showToast) {
              window.showToast('Browser storage is not available. Please check your browser settings.', 'error');
            }
          } else {
            console.error('Unknown error during session restoration:', error);
            setAuthError('Failed to restore session. Please log in again.');
            if (window.showToast) {
              window.showToast('Failed to restore Storacha session. Please log in again.', 'error');
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize Storacha client:', error);
        setAuthError('Failed to initialize Storacha client');
      }
    };
     initStoracha();
   }, []);

   const handleStorachaLogout = () => {
      try {
        // Use secure cleanup for enhanced security
        const cleanupSuccess = StorachaAuthService.secureCleanup();
        
        setIsStorachaReady(false);
        setStorachaEmail('');
        setStorachaSpace(null);
        setUserAccount(null); // Clear user account
        setAuthError(null);
        console.log('Storacha logout successful');
        
        if (cleanupSuccess && window.showToast) {
          window.showToast('Successfully disconnected from Storacha', 'info');
        } else if (window.showToast) {
          window.showToast('Disconnected, but some cleanup operations failed', 'warning');
        }
      } catch (error) {
        console.error('Error during logout:', error);
        setAuthError('Error during logout');
        if (window.showToast) {
          window.showToast('Error during logout', 'error');
        }
      }
    };

    // Monitor session expiry and auto-logout with enhanced validation
    useEffect(() => {
      if (!isStorachaReady) return;

      const performSessionHealthCheck = () => {
        const healthCheck = StorachaAuthService.performHealthCheck();
        
        if (!healthCheck.overall.healthy) {
          console.log('Storacha session health check failed:', healthCheck.overall.issues);
          
          if (healthCheck.integrity.errorType === 'SESSION_EXPIRED') {
            handleStorachaLogout();
            setAuthError('Your Storacha session has expired. Please log in again.');
            if (window.showToast) {
              window.showToast('Your Storacha session has expired. Please log in again.', 'warning');
            }
          } else if (!healthCheck.storageAvailable) {
            setAuthError('Browser storage is not available. Session cannot be maintained.');
            if (window.showToast) {
              window.showToast('Browser storage is not available. Session cannot be maintained.', 'error');
            }
          } else if (healthCheck.integrity.errorType === 'SESSION_CORRUPTED') {
            handleStorachaLogout();
            setAuthError('Session data is corrupted. Please log in again.');
            if (window.showToast) {
              window.showToast('Session data is corrupted. Please log in again.', 'error');
            }
          }
        } else {
          // Check for expiry warnings
          const expiryWarning = StorachaAuthService.getExpiryWarning();
          if (expiryWarning.shouldWarn && window.showToast) {
            window.showToast(expiryWarning.message, 'warning');
          }
          
          // Auto-refresh session if needed
          StorachaAuthService.autoRefreshIfNeeded();
        }
      };

      // Check session health every 5 minutes
      const intervalId = setInterval(performSessionHealthCheck, 5 * 60 * 1000);
      
      // Also check immediately
      performSessionHealthCheck();

      return () => clearInterval(intervalId);
    }, [isStorachaReady]);

  // Redirect to login if not connected (but only if Storacha is also not ready)
  useEffect(() => {
    if (isClient && isInitialized && !account && !isStorachaReady) {
      // Add a small delay to prevent conflicts with session validation
      const timeoutId = setTimeout(() => {
        router.push('/auth/login');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [account, isClient, router, isInitialized, isStorachaReady]);

  // Load files effect - moved before early return
  useEffect(() => {
    const loadFiles = async () => {
      if (contract && account) {
        try {
          const totalFiles = await contract.getTotalFiles();
          const allFileIds = [];
          
          // Get all file IDs
          for (let i = 0; i < totalFiles; i++) {
            try {
              const fileId = await contract.allFiles(i);
              allFileIds.push(fileId);
            } catch (error) {
              console.error(`Error getting file ID ${i}:`, error);
            }
          }
          
          const loadedFiles = [];
          
          // Get file info for each file and filter by owner
          for (const fileId of allFileIds) {
            try {
              const [id, contentHash, owner, fileSize, uploadTimestamp, isPublic, accessCount] = await contract.getFileInfo(fileId);
              
              // Only include files owned by the current user
              if (owner.toLowerCase() === account.toLowerCase()) {
                loadedFiles.push({
                  id: fileId,
                  name: fileId, // Using fileId as name for now
                  type: 'file', // Default type
                  cid: contentHash,
                  size: `${(Number(fileSize) / 1024 / 1024).toFixed(2)} MB`,
                  uploadDate: new Date(Number(uploadTimestamp) * 1000).toLocaleDateString(),
                  isPublic: isPublic,
                  accessCount: Number(accessCount)
                });
              }
            } catch (fileError) {
              console.error(`Error loading file info for ${fileId}:`, fileError);
            }
          }
          
          setFiles(loadedFiles);
          
          // Update statistics
          setStats({
            totalFiles: loadedFiles.length,
            storageUsed: `${(loadedFiles.length * 2.5).toFixed(1)} MB`, // Estimated
            uploadsThisMonth: loadedFiles.filter(file => {
              const uploadDate = new Date(file.uploadDate);
              const now = new Date();
              return uploadDate.getMonth() === now.getMonth() && uploadDate.getFullYear() === now.getFullYear();
            }).length,
            activeShares: Math.floor(loadedFiles.length * 0.3) // Estimated 30% shared
          });
        } catch (error) {
          console.error('Could not fetch files.', error);
          if (error.code === 'BAD_DATA' && error.value === '0x') {
            console.log('Contract returned empty data. Please ensure:');
            console.log('1. MetaMask is connected to localhost:8545');
            console.log('2. You are using the correct account');
            console.log('3. The contract is deployed and accessible');
          }
        }
      }
    };

    if (account) {
      loadFiles();
    }
  }, [contract, account]);

  // Show loading state while wallet is initializing - MUST be after all hooks
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900 to-space-indigo flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-cyan/30 border-t-electric-cyan rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-silver">Initializing wallet connection...</p>
        </div>
      </div>
    );
  }


  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleStorachaLogin = async (email) => {
    if (!storachaClient || !email) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    setIsStorachaLoading(true);
    setAuthError(null);
    
    try {
      console.log('Logging into Storacha with email:', email);
      
      // Check if user already has a valid session
      try {
        const existingSession = StorachaAuthService.getSession();
        if (existingSession && existingSession.email === email) {
          console.log('Using existing valid session');
          setStorachaEmail(email);
          setIsStorachaReady(true);
          if (existingSession.sessionData && existingSession.sessionData.space) {
            setStorachaSpace(existingSession.sessionData.space);
          }
          if (window.showToast) {
            window.showToast('Successfully restored your Storacha session!', 'success');
          }
          return;
        }
      } catch (sessionError) {
        // Session check failed, continue with new login
        console.log('Session check failed, proceeding with new login:', sessionError.message);
      }
      
      const account = await storachaClient.login(email);
      console.log('Storacha login successful, account:', account.did());
      
      // Store the authenticated user account
      setUserAccount(account);
      
      // After login, claim the delegation to authorize the agent
      console.log('Claiming delegation after email verification...');
      await storachaClient.capability.access.claim();
      console.log('Delegation claimed successfully');
      
      // Create a space for the user with proper authorization proof
      const space = await storachaClient.createSpace('my-decentralized-drive', { account });
      console.log('Storacha space created:', space);
      
      // Set the space as current for the client (createSpace automatically adds it)
      await storachaClient.setCurrentSpace(space.did());
      console.log('Storacha space set as current:', space.did());
      
      // Save session data
      const sessionData = {
        space: space,
        loginTimestamp: Date.now()
      };
      
      try {
        StorachaAuthService.saveSession(email, space.did || space.toString(), sessionData);
        setStorachaEmail(email);
        setStorachaSpace(space);
        setIsStorachaReady(true);
        console.log('Storacha login successful and session saved');
        if (window.showToast) {
          window.showToast('Successfully connected to Storacha! You can now upload files securely.', 'success');
        }
      } catch (saveError) {
        console.warn('Login successful but session save failed:', saveError.message);
        // Still set the session state even if save failed
        setStorachaEmail(email);
        setStorachaSpace(space);
        setIsStorachaReady(true);
        
        // Show warning to user about session persistence
        if (saveError.type === StorachaAuthErrors.STORAGE_NOT_AVAILABLE) {
          setAuthError('Login successful, but session cannot be saved. You may need to log in again after refreshing.');
          if (window.showToast) {
            window.showToast('Connected to Storacha, but session cannot be saved. You may need to log in again after refreshing.', 'warning');
          }
        } else {
          if (window.showToast) {
            window.showToast('Connected to Storacha successfully!', 'success');
          }
        }
      }
      
    } catch (error) {
      console.error('Storacha login failed:', error);
      setAuthError(`Storacha login failed: ${error.message}`);
      if (window.showToast) {
        window.showToast(`Storacha login failed: ${error.message}`, 'error');
      }
      
      // Clear any existing session on login failure
      StorachaAuthService.clearSession();
      setIsStorachaReady(false);
      setStorachaEmail('');
      setStorachaSpace(null);
    } finally {
       setIsStorachaLoading(false);
     }
   };

  // Register a mock storage provider for development
  const registerMockProvider = async () => {
    if (!contract || !account) {
      if (window.showToast) {
        window.showToast('Please connect your wallet first.', 'warning');
      }
      return;
    }

    try {
      console.log('Registering mock storage provider...');
      
      // Check if provider is already registered
      try {
        const providerInfo = await contract.getProviderInfo(account);
        if (providerInfo.isActive) {
          if (window.showToast) {
            window.showToast('Storage provider already registered for this account.', 'info');
          }
          return;
        }
      } catch (error) {
        // Provider not registered yet, continue with registration
      }

      // Register with mock data (1TB storage, 1 wei per GB, mock node ID)
      const tx = await contract.registerProvider(
        1000000000000, // 1TB in bytes
        1, // 1 wei per GB (very cheap for development)
        'mock-node-id-' + Date.now(),
        'development'
      );
      
      await tx.wait();
      
      console.log('Mock storage provider registered successfully');
      if (window.showToast) {
        window.showToast('Mock storage provider registered successfully! You can now upload files.', 'success');
      }
    } catch (error) {
      console.error('Failed to register mock provider:', error);
      let errorMessage = error.message;
      
      if (error.message.includes('Provider already registered')) {
        errorMessage = 'Storage provider already registered for this account.';
      } else if (error.message.includes('Failed to stake tokens')) {
        errorMessage = 'This contract requires staking tokens. Please use a different deployment or modify the contract.';
      }
      
      if (window.showToast) {
        window.showToast(`Failed to register provider: ${errorMessage}`, 'error');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !encryptionKey) {
          if (window.showToast) {
            window.showToast('Please select a file and enter an encryption key.', 'warning');
          }
          return;
        }
        
        if (!isStorachaReady) {
          if (window.showToast) {
            window.showToast('Please login to Storacha first.', 'warning');
          }
          return;
        }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fileContent = reader.result;
        const encrypted = CryptoJS.AES.encrypt(fileContent, encryptionKey).toString();

        const blob = new Blob([encrypted], { type: 'text/plain' });
        const file = new File([blob], selectedFile.name, { type: 'text/plain' });

        console.log('Uploading to Storacha...');
        
        // Ensure we have an authenticated space for uploading
        if (!storachaSpace) {
          throw new Error('No Storacha space available. Please reconnect to Storacha.');
        }
        
        // Use the authenticated space context for uploading
        const cid = await storachaSpace.uploadFile(file);
        console.log('Storacha upload successful, CID:', cid);
        const fileId = `${Date.now()}_${selectedFile.name}`;
        
        console.log('Uploading to blockchain...');
        // Use the correct uploadFile function with proper parameters
        const tx = await contract.uploadFile(
          fileId,                    // _fileId
          cid,                      // _contentHash (IPFS hash)
          selectedFile.size,        // _fileSize
          encryptionKey,            // _encryptionKey
          false,                    // _isPublic
          [],                       // _tags (empty array for now)
          1                         // _replicationFactor
        );
        await tx.wait();
        console.log('File uploaded successfully to blockchain');
        if (window.showToast) {
          window.showToast('File uploaded successfully!', 'success');
        }
        
        // Reload files after upload using the correct method
        const totalFiles = await contract.getTotalFiles();
        const loadedFiles = [];
        
        for (let i = 0; i < totalFiles; i++) {
          try {
            const fileId = await contract.allFiles(i);
            const fileInfo = await contract.getFileInfo(fileId);
            
            // Only include files owned by current user
            if (fileInfo.owner.toLowerCase() === account.toLowerCase()) {
              loadedFiles.push({
                id: fileId,
                name: fileId.split('_').slice(1).join('_'), // Extract original filename
                type: selectedFile.type,
                cid: fileInfo.contentHash,
                size: formatFileSize(Number(fileInfo.fileSize)),
                uploadDate: new Date(Number(fileInfo.uploadTimestamp) * 1000).toLocaleDateString()
              });
            }
          } catch (fileError) {
            console.error(`Error loading file ${i}:`, fileError);
          }
        }
        
        setFiles(loadedFiles);

      } catch (error) {
        console.error('Error uploading file:', error);
        if (window.showToast) {
          window.showToast(`File upload failed: ${error.message}`, 'error');
        }
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleShareFile = (file) => {
    // Check if user has enough STOR tokens for premium sharing
    if (storBalance < 50) {
      if (window.showToast) {
          window.showToast('Insufficient STOR balance. You need 50 STOR tokens to share files. Please buy more STOR tokens.', 'warning');
        }
      setShowBuyStorModal(true);
      return;
    }
    
    // Deduct 50 STOR tokens for premium sharing
    setStorBalance(prev => prev - 50);
    setSelectedFileForSharing(file);
    setShowShareModal(true);
    
    // Show success message
    setTimeout(() => {
      if (window.showToast) {
          window.showToast('50 STOR tokens deducted for premium file sharing!', 'success');
        }
    }, 500);
  };

  const handleDedicatedShare = () => {
    if (!selectedFileForDedicatedSharing) {
      if (window.showToast) {
        window.showToast('Please select a file to share first.', 'warning');
      }
      return;
    }
    
    // selectedFileForDedicatedSharing is already the full file object
    setSelectedFileForSharing(selectedFileForDedicatedSharing);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSelectedFileForSharing(null);
  };

  const handleViewVersions = (file) => {
    setSelectedFileForVersions(file);
    setShowVersionsModal(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const closeVersionsModal = () => {
    setShowVersionsModal(false);
    setSelectedFileForVersions(null);
  };

  const handleBuySTOR = (amount) => {
    // Simulate buying STOR tokens
    setStorBalance(prev => prev + amount);
    setShowBuyStorModal(false);
    if (window.showToast) {
      window.showToast(`Successfully purchased ${amount} STOR tokens!`, 'success');
    }
  };

  const handleDownload = async (file) => {
    if (!encryptionKey) {
        if (window.showToast) {
          window.showToast('Please enter the encryption key to download and decrypt the file.', 'warning');
        }
        return;
    }
    try {
        // Use the enhanced download function with integrity checking
        // const success = await downloadWithIntegrityCheck(file.cid, file.name, encryptionKey, {
        //   fileName: file.name,
        //   cid: file.cid
        // });
        
        // Temporary simple download notification
        if (window.showToast) {
          window.showToast('File download initiated for: ' + file.name, 'info');
        }
        console.log('Downloading file:', file.cid, file.name);
    } catch(error) {
        console.error("Error downloading or decrypting file:", error);
        if (window.showToast) {
          window.showToast('Failed to download or decrypt. Is the key correct?', 'error');
        }
    }
  };

  const handleAnalyzeFile = async (file) => {
    if (!encryptionKey) {
      if (window.showToast) {
        window.showToast('Please enter the encryption key to decrypt and analyze the file.', 'warning');
      }
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingFileName(file.name);
    setAnalysisProgress(0);
    setCurrentAnalysisStep('extraction');
    
    try {
      // Fetch the encrypted file from IPFS
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${file.cid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file from IPFS');
      }
      
      const encryptedData = await response.text();
      
      // Decrypt the file content
      const decryptedContent = decryptFile(encryptedData, encryptionKey);
      
      // Create a file object for analysis
      let text = '';
      
      if (file.name.toLowerCase().endsWith('.pdf')) {
        // For PDF files, we need to create a File object from the decrypted content
        const blob = new Blob([decryptedContent], { type: 'application/pdf' });
        const pdfFile = new File([blob], file.name, { type: 'application/pdf' });
        text = await clientAI.extractPDFText(pdfFile);
      } else {
        // For text files, use the decrypted content directly
        text = decryptedContent;
      }
      
      // Progress callback function
      const onProgress = (progress, step) => {
        setAnalysisProgress(progress);
        setCurrentAnalysisStep(step);
      };
      
      // Perform AI analysis on the extracted text with progress tracking
      const analysis = await clientAI.analyzeDocument(text, { onProgress });
      
      setAnalysisData({
        fileName: file.name,
        ...analysis
      });
      setShowAnalysisResults(true);
      
    } catch (error) {
      console.error('Error analyzing file:', error);
      if (window.showToast) {
        window.showToast(`Failed to analyze file: ${error.message}`, 'error');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setCurrentAnalysisStep('');
      setAnalyzingFileName('');
    }
  };

  // Render different sections based on activeSection
  const renderMainContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Files Stored"
                value={stats.totalFiles}
                icon="📁"
              />
              <StatCard
                title="Storage Used"
                value={stats.storageUsed}
                icon="💾"
              />
              <StatCard
                title="Uploads This Month"
                value={stats.uploadsThisMonth}
                icon="⬆️"
              />
              <StatCard
                title="Active File Shares"
                value={stats.activeShares}
                icon="🔗"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-light-silver mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {files.slice(0, 5).map((file, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-electric-cyan/5 rounded-lg border border-electric-cyan/10">
                    <div className="w-10 h-10 bg-electric-cyan/20 rounded-lg flex items-center justify-center">
                      <span className="text-electric-cyan">📄</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-light-silver font-medium">{file.name}</p>
                      <p className="text-light-silver/60 text-sm">Uploaded on {file.uploadDate}</p>
                    </div>
                    <span className="text-electric-cyan text-sm">{file.type}</span>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="text-center py-8 text-light-silver/60">
                    <span className="text-4xl mb-4 block">📭</span>
                    <p>No files uploaded yet. Start by uploading your first file!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-light-silver mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveSection('upload')}
                  className="p-4 bg-electric-cyan/10 border border-electric-cyan/20 rounded-lg hover:bg-electric-cyan/20 transition-all duration-200 text-left"
                >
                  <span className="text-2xl mb-2 block">⬆️</span>
                  <h3 className="text-light-silver font-semibold mb-1">Upload Files</h3>
                  <p className="text-light-silver/60 text-sm">Add new files to your vault</p>
                </button>
                <button
                  onClick={() => setActiveSection('vault')}
                  className="p-4 bg-electric-cyan/10 border border-electric-cyan/20 rounded-lg hover:bg-electric-cyan/20 transition-all duration-200 text-left"
                >
                  <span className="text-2xl mb-2 block">🗃️</span>
                  <h3 className="text-light-silver font-semibold mb-1">Browse Vault</h3>
                  <p className="text-light-silver/60 text-sm">View and manage your files</p>
                </button>
                <button
                  onClick={() => setActiveSection('analytics')}
                  className="p-4 bg-electric-cyan/10 border border-electric-cyan/20 rounded-lg hover:bg-electric-cyan/20 transition-all duration-200 text-left"
                >
                  <span className="text-2xl mb-2 block">📈</span>
                  <h3 className="text-light-silver font-semibold mb-1">View Analytics</h3>
                  <p className="text-light-silver/60 text-sm">Track your storage usage</p>
                </button>
              </div>
            </div>
          </div>
        );

      case 'vault':
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-light-silver">My Vault</h1>
              <div className="flex items-center space-x-6">
                {/* Share with Friend Button */}
                <div className="flex items-center space-x-3">
                  <select
                    value={selectedFileForDedicatedSharing?.id || ''}
                    onChange={(e) => {
                      const file = files.find(f => f.id === e.target.value);
                      setSelectedFileForDedicatedSharing(file || null);
                    }}
                    className="bg-space-indigo/50 border border-electric-cyan/30 text-light-silver rounded-lg px-3 py-2 focus:outline-none focus:border-electric-cyan"
                  >
                    <option value="">Select file to share...</option>
                    {files.map(file => (
                      <option key={file.id} value={file.id}>{file.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleDedicatedShare}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    <span>Share with Friend</span>
                  </button>
                </div>
                {/* Tab Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('myFiles')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === 'myFiles'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'bg-electric-cyan/20 text-electric-cyan hover:bg-electric-cyan/30'
                    }`}
                  >
                    My Files
                  </button>
                  <button
                    onClick={() => setActiveTab('sharedFiles')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === 'sharedFiles'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'bg-electric-cyan/20 text-electric-cyan hover:bg-electric-cyan/30'
                    }`}
                  >
                    Shared With Me
                  </button>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2 bg-space-indigo/50 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'table'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'text-light-silver/60 hover:text-light-silver'
                    }`}
                    title="Table View"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'text-light-silver/60 hover:text-light-silver'
                    }`}
                    title="3D View"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'myFiles' ? (
              viewMode === 'table' ? (
                <FileTable 
                  files={files} 
                  onFileAction={(action, file) => {
                    switch(action) {
                      case 'view':
                        handleViewVersions(file);
                        break;
                      case 'download':
                        handleDownload(file);
                        break;
                      case 'share':
                        handleShareFile(file);
                        break;
                      case 'analyze':
                        handleAnalyzeFile(file);
                        break;
                      case 'delete':
                        // Add delete functionality if needed
                        console.log('Delete file:', file);
                        break;
                      default:
                        console.log('Unknown action:', action);
                    }
                  }}
                />
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {files.map((file, index) => (
                    <div key={index} className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6 hover:border-electric-cyan/40 transition-all duration-300 group">
                      <div className="text-center mb-4">
                        <FileCrystal 
                          fileName={file.name} 
                          fileSize={file.size || '0 MB'}
                          uploadDate={file.uploadDate}
                          viewMode="grid"
                        />
                      </div>
                      <h3 className="text-light-silver font-semibold mb-2 truncate text-center">{file.name}</h3>
                      <p className="text-light-silver/60 text-sm mb-4 text-center">{file.uploadDate}</p>
                      <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => handleDownload(file)}
                          className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
                        >
                          Download
                        </button>

                        <button
                          onClick={() => handleViewVersions(file)}
                          className="w-full px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors duration-200"
                        >
                          Versions
                        </button>
                      </div>
                    </div>
                ))}
                {files.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <span className="text-6xl mb-4 block">📁</span>
                    <h3 className="text-2xl font-bold text-light-silver mb-2">Your vault is empty</h3>
                    <p className="text-light-silver/60 mb-6">Upload your first file to get started</p>
                    <button
                      onClick={() => setActiveSection('upload')}
                      className="px-6 py-3 bg-electric-cyan text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
                    >
                      Upload Files
                    </button>
                  </div>
                )}
              </div>
              )
            ) : (
              <SharedFiles 
                account={account} 
                contract={contract} 
                onNotification={(message, type) => {
                  if (window.showToast) {
                    window.showToast(message, type);
                  }
                }}
              />
            )}
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-light-silver mb-2">Upload Center</h1>
              <p className="text-light-silver/60">Securely upload and encrypt your files to the decentralized network.</p>
            </div>
            
            {/* Storacha Connection Status */}
            <StorachaStatus
              isReady={isStorachaReady}
              isLoading={isStorachaLoading}
              email={storachaEmail}
              authError={authError}
              onLogin={handleStorachaLogin}
              onLogout={handleStorachaLogout}
            />
            
            {/* Storage Provider Setup for Development */}
            <div className="bg-dark-navy/50 border border-electric-blue/20 rounded-lg p-6">
              <h3 className="text-light-silver font-semibold mb-2">Development Setup</h3>
              <p className="text-light-silver/60 text-sm mb-4">
                For development purposes, you need to register a storage provider before uploading files.
              </p>
              <button
                onClick={registerMockProvider}
                disabled={!account || !contract}
                className="bg-electric-blue hover:bg-electric-blue/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Register Mock Storage Provider
              </button>
            </div>
            
            <UploadCenter 
               account={account}
               onUpload={async (files, options) => {
                 console.log('Uploading files:', files, options);
                 
                 for (const fileData of files) {
                   try {
                     const reader = new FileReader();
                     
                     const uploadPromise = new Promise((resolve, reject) => {
                       reader.onloadend = async () => {
                         try {
                           const fileContent = reader.result;
                           let processedContent = fileContent;
                           
                           // Encrypt if enabled
                           if (options.encryptionEnabled && options.encryptionPassword) {
                             processedContent = CryptoJS.AES.encrypt(fileContent, options.encryptionPassword).toString();
                           }
                           
                           const blob = new Blob([processedContent], { type: 'text/plain' });
                           const formData = new FormData();
                           formData.append('file', blob, fileData.name);
                           
                           if (!isStorachaReady) {
                             throw new Error('Please login to Storacha first');
                           }
                           
                           console.log(`Uploading ${fileData.name} to Storacha...`);
                           const file = new File([blob], fileData.name, { type: 'text/plain' });
                           
                           // Use the authenticated space for upload
                           if (!storachaSpace) {
                             throw new Error('No Storacha space available. Please reconnect to Storacha.');
                           }
                           
                           // Ensure the space is set as current before uploading
                           await storachaClient.setCurrentSpace(storachaSpace.did());
                           const cidResult = await storachaClient.uploadFile(file);
                           console.log(`Storacha upload successful for ${fileData.name}, CID:`, cidResult);
                           
                           // Extract the actual CID string from the result object
                           const cid = cidResult.toString();
                           const fileId = `${Date.now()}_${fileData.name}`;
                           
                           console.log(`Uploading ${fileData.name} to blockchain...`);
                           const tx = await contract.uploadFile(
                             fileId,
                             cid,
                             fileData.file.size,
                             options.encryptionPassword || '',
                             fileData.metadata?.isPublic || false,
                             fileData.metadata?.tags || [],
                             1
                           );
                           await tx.wait();
                           
                           console.log(`${fileData.name} uploaded successfully`);
                           resolve({ fileId, cid, fileData });
                         } catch (error) {
                           reject(error);
                         }
                       };
                       reader.onerror = reject;
                     });
                     
                     reader.readAsDataURL(fileData.file);
                     await uploadPromise;
                     
                   } catch (error) {
                     console.error(`Error uploading ${fileData.name}:`, error);
                     let errorMessage = error.message;
                     
                     // Handle specific contract errors
                     if (error.message.includes('Not enough active providers')) {
                       errorMessage = 'No storage providers available. Please register a storage provider first or try again later.';
                     }
                     
                     if (window.showToast) {
                       window.showToast(`Failed to upload ${fileData.name}: ${errorMessage}`, 'error');
                     }
                   }
                 }
                 
                 // Reload files after all uploads
                 try {
                   const totalFiles = await contract.getTotalFiles();
                   const loadedFiles = [];
                   
                   for (let i = 0; i < totalFiles; i++) {
                     try {
                       const fileId = await contract.allFiles(i);
                       const fileInfo = await contract.getFileInfo(fileId);
                       
                       if (fileInfo.owner.toLowerCase() === account.toLowerCase()) {
                         loadedFiles.push({
                           id: fileId,
                           name: fileId.split('_').slice(1).join('_'),
                           type: 'application/octet-stream',
                           cid: fileInfo.contentHash,
                           size: formatFileSize(Number(fileInfo.fileSize)),
                           uploadDate: new Date(Number(fileInfo.uploadTimestamp) * 1000).toLocaleDateString()
                         });
                       }
                     } catch (fileError) {
                       console.error(`Error loading file ${i}:`, fileError);
                     }
                   }
                   
                   setFiles(loadedFiles);
                   // Files loaded from blockchain
                 } catch (error) {
                   console.error('Error reloading files:', error);
                 }
               }}
             />
          </div>
        );



      case 'analytics':
        return (
          <AnalyticsDashboard files={files} stats={stats} />
        );

      case 'settings':
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold text-light-silver">Settings</h1>
            <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6">
              <h2 className="text-xl font-bold text-light-silver mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-electric-cyan/5 rounded-lg">
                  <div>
                    <h3 className="text-light-silver font-medium">Wallet Address</h3>
                    <p className="text-light-silver/60 text-sm">{account}</p>
                  </div>
                  <button className="px-4 py-2 bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/30 rounded-lg hover:bg-electric-cyan/30 transition-colors duration-200">
                    Copy
                  </button>
                </div>
                <div className="flex justify-between items-center p-4 bg-electric-cyan/5 rounded-lg">
                  <div>
                    <h3 className="text-light-silver font-medium">Network</h3>
                    <p className="text-light-silver/60 text-sm">Polygon Amoy Testnet</p>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Connected</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Section not found</div>;
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo flex items-center justify-center">
        <div className="text-electric-cyan text-xl">Loading...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo flex items-center justify-center">
        <div className="text-electric-cyan text-xl">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo flex">
      {/* Toast Manager */}
      <ToastManager />
      
      {/* Sidebar */}
      <ModernSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        account={account}
        disconnectWallet={disconnectWallet}
        storBalance={storBalance}
        onBuySTOR={() => setShowBuyStorModal(true)}
        onAIChatClick={() => setShowAIChat(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderMainContent()}
        </div>
      </div>

      {/* Modals */}
      {showShareModal && selectedFileForSharing && (
        <FileSharing
          file={selectedFileForSharing}
          contract={contract}
          account={account}
          onClose={closeShareModal}
        />
      )}

      {showVersionsModal && selectedFileForVersions && (
        <FileVersions
          file={selectedFileForVersions}
          contract={contract}
          account={account}
          encryptionKey={encryptionKey}
          onClose={closeVersionsModal}
          onNotification={(message, type) => {
            if (window.showToast) {
              window.showToast(message, type);
            }
          }}
        />
      )}

      {showAnalysisResults && analysisData && (
        <AnalysisResults
          analysis={analysisData}
          onClose={() => {
            setShowAnalysisResults(false);
            setAnalysisData(null);
          }}
          onNotification={(message, type) => {
            if (window.showToast) {
              window.showToast(message, type);
            }
          }}
        />
      )}

      <AnalysisProgress
        isVisible={isAnalyzing}
        progress={analysisProgress}
        currentStep={currentAnalysisStep}
        fileName={analyzingFileName}
      />
      
      {/* Buy STOR Modal */}
      {showBuyStorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-light-silver mb-6 text-center">💰 Buy STOR Tokens</h2>
            <p className="text-light-silver/60 mb-6 text-center">Choose a token pack to purchase with your preferred payment method</p>
            
            <div className="space-y-4 mb-6">
              <div className="bg-electric-cyan/10 border border-electric-cyan/30 rounded-lg p-4 hover:bg-electric-cyan/20 transition-colors cursor-pointer" onClick={() => handleBuySTOR(1000)}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-light-silver font-semibold">Starter Pack</h3>
                    <p className="text-light-silver/60 text-sm">1,000 STOR tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-electric-cyan font-bold">₹100</p>
                    <p className="text-light-silver/60 text-xs">~$1.20</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-electric-cyan/10 border border-electric-cyan/30 rounded-lg p-4 hover:bg-electric-cyan/20 transition-colors cursor-pointer" onClick={() => handleBuySTOR(5000)}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-light-silver font-semibold">Pro Pack</h3>
                    <p className="text-light-silver/60 text-sm">5,000 STOR tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-electric-cyan font-bold">₹450</p>
                    <p className="text-light-silver/60 text-xs">~$5.40</p>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">10% OFF</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-electric-cyan/10 border border-electric-cyan/30 rounded-lg p-4 hover:bg-electric-cyan/20 transition-colors cursor-pointer" onClick={() => handleBuySTOR(10000)}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-light-silver font-semibold">Premium Pack</h3>
                    <p className="text-light-silver/60 text-sm">10,000 STOR tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-electric-cyan font-bold">₹800</p>
                    <p className="text-light-silver/60 text-xs">~$9.60</p>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">20% OFF</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowBuyStorModal(false)}
                className="flex-1 px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-light-silver/40 text-xs">💳 Supports UPI, Cards & Net Banking</p>
              <p className="text-light-silver/40 text-xs">🔒 Secure payment powered by Razorpay</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showAIChat && (
        <AIFileChat 
          files={files} 
          account={account} 
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}

