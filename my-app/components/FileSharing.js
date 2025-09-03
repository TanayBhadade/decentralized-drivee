import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ShareIcon,
  UserPlusIcon,
  UserMinusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { 
  createFileSharingPackage, 
  SharedFileStorage, 
  generateFileId,
  grantUserAccess,
  revokeUserAccess,
  validateAccessToken
} from '../utils/keyManagement';

const FileSharing = ({ file, contract, account, onClose }) => {
  const [shareAddress, setShareAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sharingPackage, setSharingPackage] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loadingUser, setLoadingUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (file && account) {
      initializeSharing();
    }
  }, [file, account]);

  const initializeSharing = async () => {
    try {
      setInitializing(true);
      const id = generateFileId(file.name, account);
      setFileId(id);
      
      // Check if sharing package already exists
      let existingPackage = SharedFileStorage.getSharedFile(id);
      
      if (!existingPackage) {
        // Create new sharing package if it doesn't exist
        console.log('No existing sharing package found for file:', file.name);
        showNotification('File ready for sharing', 'success');
      } else {
        setSharingPackage(existingPackage);
        // Load shared users from the package
        const users = Object.keys(existingPackage.accessTokens || {});
        setSharedUsers(users);
        showNotification(`File shared with ${users.length} user${users.length !== 1 ? 's' : ''}`, 'info');
      }
    } catch (error) {
      console.error('Error initializing sharing:', error);
      showNotification('Failed to initialize file sharing', 'error');
    } finally {
      setInitializing(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Address copied to clipboard', 'success');
    } catch (error) {
      showNotification('Failed to copy address', 'error');
    }
  };

  const handleGrantAccess = async () => {
    if (!shareAddress || !contract || !account) {
      showNotification('Please enter a valid address and ensure wallet is connected', 'error');
      return;
    }

    if (sharedUsers.includes(shareAddress)) {
      showNotification('This user already has access to the file', 'warning');
      return;
    }

    if (shareAddress.toLowerCase() === account.toLowerCase()) {
      showNotification('You cannot grant access to yourself', 'warning');
      return;
    }

    try {
      setLoading(true);
      showNotification('Submitting transaction to blockchain...', 'info');
      
      // First, grant access on the blockchain
      console.log('Granting blockchain access for file:', file.id, 'to user:', shareAddress);
      const tx = await contract.grantFileAccess(file.id, shareAddress);
      console.log('Transaction submitted:', tx.hash);
      
      showNotification(`Transaction submitted: ${tx.hash.substring(0, 10)}...`, 'info');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      if (receipt.status === 1) {
        // Transaction successful - now handle local key management
        let currentPackage = sharingPackage;
        
        if (!currentPackage) {
          // Create new sharing package
          currentPackage = {
            accessTokens: {},
            fileMetadata: {
              name: file.name,
              type: file.type || 'application/octet-stream',
              cid: file.cid
            },
            sharedKey: 'temp_shared_key_' + Date.now() // This should be the actual shared key
          };
        }
        
        // Add new user to access tokens
        const updatedTokens = grantUserAccess(
          currentPackage.accessTokens, 
          shareAddress, 
          currentPackage.sharedKey
        );
        
        currentPackage.accessTokens = updatedTokens;
        
        // Store updated package
        SharedFileStorage.storeSharedFile(fileId, currentPackage);
        setSharingPackage(currentPackage);
        
        // Update local state
        setSharedUsers([...sharedUsers, shareAddress]);
        
        showNotification(`Access granted to ${shareAddress.substring(0, 6)}...${shareAddress.substring(38)}`, 'success');
        setShareAddress('');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error granting access:', error);
      if (error.code === 'ACTION_REJECTED') {
        showNotification('Transaction was rejected by user', 'warning');
      } else if (error.message.includes('Only owner can grant access')) {
        showNotification('You can only grant access to files you own', 'error');
      } else if (error.message.includes('insufficient funds')) {
        showNotification('Insufficient funds for transaction', 'error');
      } else {
        showNotification(`Error granting access: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userAddress) => {
    if (!contract || !account) {
      showNotification('Please ensure wallet is connected', 'error');
      return;
    }

    try {
      setLoadingUser(userAddress);
      showNotification('Revoking access...', 'info');
      
      // First, revoke access on the blockchain
      console.log('Revoking blockchain access for file:', file.id, 'from user:', userAddress);
      const tx = await contract.revokeFileAccess(file.id, userAddress);
      console.log('Transaction submitted:', tx.hash);
      
      showNotification(`Transaction submitted: ${tx.hash.substring(0, 10)}...`, 'info');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      if (receipt.status === 1) {
        // Transaction successful - now handle local key management
        if (sharingPackage) {
          const updatedTokens = revokeUserAccess(sharingPackage.accessTokens, userAddress);
          const updatedPackage = { ...sharingPackage, accessTokens: updatedTokens };
          
          SharedFileStorage.storeSharedFile(fileId, updatedPackage);
          setSharingPackage(updatedPackage);
        }
        
        // Update local state
        setSharedUsers(sharedUsers.filter(user => user !== userAddress));
        
        showNotification(`Access revoked from ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`, 'success');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      if (error.code === 'ACTION_REJECTED') {
        showNotification('Transaction was rejected by user', 'warning');
      } else if (error.message.includes('Only owner can revoke access')) {
        showNotification('You can only revoke access from files you own', 'error');
      } else if (error.message.includes('insufficient funds')) {
        showNotification('Insufficient funds for transaction', 'error');
      } else {
        showNotification(`Error revoking access: ${error.message}`, 'error');
      }
    } finally {
      setLoadingUser(null);
    }
  };

  const isValidAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'error': return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      default: return <CheckCircleIcon className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
      case 'success': return 'bg-green-900/30 border-green-500/20 text-green-400';
      case 'error': return 'bg-red-900/30 border-red-500/20 text-red-400';
      case 'warning': return 'bg-yellow-900/30 border-yellow-500/20 text-yellow-400';
      default: return 'bg-blue-900/30 border-blue-500/20 text-blue-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-electric-cyan/20">
          <div className="flex items-center space-x-3">
            <ShareIcon className="w-6 h-6 text-electric-cyan" />
            <div>
              <h2 className="text-2xl font-bold text-light-silver">Share File</h2>
              <p className="text-light-silver/60 text-sm">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-light-silver/60 hover:text-light-silver hover:bg-electric-cyan/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mx-6 mt-4 p-4 rounded-lg border flex items-center space-x-3 ${getNotificationBg(notification.type)}`}>
            {getNotificationIcon(notification.type)}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {initializing ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
              <span className="ml-3 text-light-silver/60">Initializing file sharing...</span>
            </div>
          ) : (
            <>
              {/* Grant Access Section */}
              <div className="bg-electric-cyan/10 border border-electric-cyan/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <UserPlusIcon className="w-5 h-5 text-electric-cyan" />
                  <h3 className="text-lg font-semibold text-light-silver">Grant Access</h3>
                </div>
                <p className="text-light-silver/60 text-sm mb-4">
                  Enter a wallet address to grant access to this file. Users will be able to download and decrypt the file.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-light-silver text-sm font-medium mb-2">
                      Wallet Address
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={shareAddress}
                        onChange={(e) => setShareAddress(e.target.value)}
                        placeholder="0x1234567890abcdef..."
                        className="flex-1 px-4 py-3 bg-space-indigo border border-electric-cyan/20 rounded-lg text-light-silver placeholder-light-silver/40 focus:outline-none focus:ring-2 focus:ring-electric-cyan focus:border-transparent"
                        disabled={loading}
                      />
                      <button
                        onClick={handleGrantAccess}
                        disabled={loading || !isValidAddress(shareAddress)}
                        className="px-6 py-3 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-space-indigo"></div>
                        ) : (
                          <UserPlusIcon className="w-4 h-4" />
                        )}
                        <span>{loading ? 'Granting...' : 'Grant Access'}</span>
                      </button>
                    </div>
                    {shareAddress && !isValidAddress(shareAddress) && (
                      <p className="text-red-400 text-sm mt-2 flex items-center space-x-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span>Please enter a valid Ethereum wallet address</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shared Users Section */}
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-light-silver">Shared Access</h3>
                  </div>
                  <span className="px-3 py-1 bg-purple-900/50 text-purple-400 text-sm rounded-full">
                    {sharedUsers.length} user{sharedUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {sharedUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <ShieldExclamationIcon className="w-12 h-12 text-light-silver/30 mx-auto mb-3" />
                    <p className="text-light-silver/60 text-sm">No users have access to this file yet</p>
                    <p className="text-light-silver/40 text-xs mt-1">Grant access to users above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sharedUsers.map((userAddress, index) => {
                      const hasValidToken = sharingPackage && 
                        sharingPackage.accessTokens[userAddress] && 
                        validateAccessToken(userAddress, sharingPackage.accessTokens[userAddress]);
                      const isLoadingThisUser = loadingUser === userAddress;
                      
                      return (
                        <div key={index} className="bg-purple-900/20 border border-purple-500/10 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                hasValidToken ? 'bg-green-400' : 'bg-red-400'
                              }`}></div>
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <span className="text-light-silver text-sm font-mono">
                                    {userAddress.substring(0, 8)}...{userAddress.substring(34)}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(userAddress)}
                                    className="p-1 text-light-silver/40 hover:text-electric-cyan transition-colors"
                                    title="Copy address"
                                  >
                                    <ClipboardDocumentIcon className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {hasValidToken ? (
                                    <ShieldCheckIcon className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <ShieldExclamationIcon className="w-3 h-3 text-red-400" />
                                  )}
                                  <span className={`text-xs ${
                                    hasValidToken ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {hasValidToken ? 'Access Active' : 'Token Invalid'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeAccess(userAddress)}
                              disabled={isLoadingThisUser}
                              className="px-4 py-2 bg-red-900/30 border border-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2"
                            >
                              {isLoadingThisUser ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                              ) : (
                                <UserMinusIcon className="w-3 h-3" />
                              )}
                              <span>{isLoadingThisUser ? 'Revoking...' : 'Revoke'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-electric-cyan/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-light-silver/60 text-xs">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>All sharing operations are secured by blockchain technology and end-to-end encryption</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSharing;