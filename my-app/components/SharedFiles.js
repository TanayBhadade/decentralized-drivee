import React, { useState, useEffect } from 'react';
import { 
  SharedFileStorage, 
  decryptSharedFile, 
  validateAccessToken,
  getSharedKeyFromToken
} from '../utils/keyManagement';
import { downloadWithIntegrityCheck } from '../utils/fileIntegrity.js';

const SharedFiles = ({ account, contract, onNotification }) => {
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessibleFiles, setAccessibleFiles] = useState([]);

  useEffect(() => {
    if (account) {
      loadSharedFiles();
    }
  }, [account]);

  const loadSharedFiles = async () => {
    try {
      setLoading(true);
      
      // Get all shared files from local storage
      const allSharedFileIds = SharedFileStorage.listSharedFiles();
      const accessible = [];
      
      for (const fileId of allSharedFileIds) {
        const sharingPackage = SharedFileStorage.getSharedFile(fileId);
        
        if (sharingPackage && sharingPackage.accessTokens[account]) {
          const accessToken = sharingPackage.accessTokens[account];
          
          // Validate the access token
          if (validateAccessToken(account, accessToken)) {
            accessible.push({
              id: fileId,
              ...sharingPackage.fileMetadata,
              accessToken,
              sharedBy: 'Unknown', // In a real app, you'd track this
              sharedAt: new Date(accessToken.timestamp).toLocaleDateString()
            });
          }
        }
      }
      
      setAccessibleFiles(accessible);
    } catch (error) {
      console.error('Error loading shared files:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadSharedFile = async (file) => {
    try {
      setLoading(true);
      
      // Get the sharing package
      const sharingPackage = SharedFileStorage.getSharedFile(file.id);
      if (!sharingPackage) {
        throw new Error('Sharing package not found');
      }
      
      // Get the shared key using the access token
      const sharedKey = getSharedKeyFromToken(account, file.accessToken);
      
      // Download the file using the shared key
      const success = await downloadWithIntegrityCheck(
        file.cid, 
        file.name, 
        sharedKey, 
        {
          fileName: file.name,
          cid: file.cid,
          shared: true
        }
      );
      
      if (success) {
        if (onNotification) {
          onNotification(`Shared file "${file.name}" downloaded successfully!`, 'success');
        } else {
          console.log(`Shared file "${file.name}" downloaded successfully!`);
        }
      }
    } catch (error) {
      console.error('Error downloading shared file:', error);
      if (onNotification) {
          onNotification(`Error downloading shared file: ${error.message}`, 'error');
        } else {
          console.error(`Error downloading shared file: ${error.message}`);
        }
    } finally {
      setLoading(false);
    }
  };

  const removeExpiredTokens = () => {
    try {
      const allSharedFileIds = SharedFileStorage.listSharedFiles();
      let removedCount = 0;
      
      allSharedFileIds.forEach(fileId => {
        const sharingPackage = SharedFileStorage.getSharedFile(fileId);
        if (sharingPackage && sharingPackage.accessTokens[account]) {
          const accessToken = sharingPackage.accessTokens[account];
          
          if (!validateAccessToken(account, accessToken)) {
            // Remove expired token
            delete sharingPackage.accessTokens[account];
            SharedFileStorage.storeSharedFile(fileId, sharingPackage);
            removedCount++;
          }
        }
      });
      
      if (removedCount > 0) {
        if (onNotification) {
          onNotification(`Removed ${removedCount} expired access token(s)`, 'success');
        } else {
          console.log(`Removed ${removedCount} expired access token(s)`);
        }
        loadSharedFiles(); // Refresh the list
      } else {
        if (onNotification) {
          onNotification('No expired tokens found', 'info');
        } else {
          console.log('No expired tokens found');
        }
      }
    } catch (error) {
      console.error('Error removing expired tokens:', error);
      if (onNotification) {
          onNotification('Error cleaning up expired tokens', 'error');
        } else {
          console.error('Error cleaning up expired tokens');
        }
    }
  };

  if (!account) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Shared Files</h2>
        <p className="text-gray-400">Please connect your wallet to view shared files.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Files Shared With Me</h2>
        <div className="flex gap-2">
          <button
            onClick={loadSharedFiles}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={removeExpiredTokens}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Clean Expired
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading shared files...</p>
        </div>
      ) : accessibleFiles.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📁</div>
          <p className="text-gray-400 mb-2">No shared files available</p>
          <p className="text-sm text-gray-500">
            Files shared with you will appear here when you have valid access tokens.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accessibleFiles.map((file) => (
            <div key={file.id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📄</span>
                    <h3 className="font-semibold text-white">{file.name}</h3>
                    <span className="px-2 py-1 bg-green-600 text-xs rounded-full">
                      Shared
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 space-y-1">
                    <p><strong>Type:</strong> {file.type}</p>
                    <p><strong>Size:</strong> {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown'}</p>
                    <p><strong>Shared on:</strong> {file.sharedAt}</p>
                    <p><strong>CID:</strong> 
                      <span className="font-mono text-xs ml-1">
                        {file.cid ? `${file.cid.substring(0, 10)}...` : 'N/A'}
                      </span>
                    </p>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-green-400">🔐 Secure Access Active</span>
                    <span className="text-xs text-gray-500">
                      Token expires: {new Date(file.accessToken.timestamp + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => downloadSharedFile(file)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Download
                  </button>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(file.cid);
                      if (onNotification) {
        onNotification('CID copied to clipboard!', 'success');
      } else {
        console.log('CID copied to clipboard!');
      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm"
                  >
                    Copy CID
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {accessibleFiles.length > 0 && (
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg">
          <h3 className="font-semibold mb-2">🔒 Secure Sharing Information</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Files are encrypted with unique shared keys</li>
            <li>• Access tokens are user-specific and time-limited</li>
            <li>• File integrity is verified during download</li>
            <li>• Original file owners can revoke access at any time</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SharedFiles;