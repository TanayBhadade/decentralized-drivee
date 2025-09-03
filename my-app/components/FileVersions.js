import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { downloadWithIntegrityCheck } from '../utils/fileIntegrity.js';

const FileVersions = ({ file, contract, account, encryptionKey, onClose, onNotification }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingVersion, setDownloadingVersion] = useState(null);

  useEffect(() => {
    loadVersions();
  }, [file, contract, account]);

  const loadVersions = async () => {
    if (!contract || !file) return;

    try {
      setLoading(true);
      
      // Get the total number of versions for this file
      const versionCount = await contract.getFileVersionCount(account, file.id);
      const versionsArray = [];
      
      // Load each version
      for (let i = 0; i < versionCount; i++) {
        try {
          const [cid, timestamp] = await contract.getFileVersion(account, file.id, i);
          versionsArray.push({
            id: i,
            cid: cid,
            timestamp: new Date(Number(timestamp) * 1000),
            isLatest: i === versionCount - 1
          });
        } catch (versionError) {
          console.error(`Error loading version ${i}:`, versionError);
        }
      }
      
      // If no versions found, show current file as fallback
      if (versionsArray.length === 0) {
        versionsArray.push({
          id: 0,
          cid: file.cid,
          timestamp: new Date(),
          isLatest: true
        });
      }
      
      setVersions(versionsArray);
    } catch (error) {
      console.error('Error loading versions:', error);
      // Fallback to showing current file
      setVersions([{
        id: 0,
        cid: file.cid,
        timestamp: new Date(),
        isLatest: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVersion = async (version) => {
    if (!encryptionKey) {
      if (onNotification) {
        onNotification('Please enter the encryption key to download and decrypt the file.', 'warning');
      } else {
        console.warn('Please enter the encryption key to download and decrypt the file.');
      }
      return;
    }

    try {
      setDownloadingVersion(version.id);
      
      // Use the enhanced download function with integrity checking
      const fileName = `${file.name}_v${version.id + 1}`;
      const success = await downloadWithIntegrityCheck(version.cid, fileName, encryptionKey, {
        fileName: fileName,
        cid: version.cid,
        version: version.id + 1
      });
      
      if (success) {
        if (onNotification) {
          onNotification(`Version ${version.id + 1} downloaded successfully with integrity verification!`, 'success');
        } else {
          console.log(`Version ${version.id + 1} downloaded successfully with integrity verification!`);
        }
      }
    } catch (error) {
      console.error('Error downloading version:', error);
      if (onNotification) {
        onNotification(`Error downloading version: ${error.message}`, 'error');
      } else {
        console.error(`Error downloading version: ${error.message}`);
      }
    } finally {
      setDownloadingVersion(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">File Versions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg text-white mb-2">{file.name}</h3>
          <p className="text-gray-400 text-sm">View and download different versions of this file</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-white">Loading versions...</div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400">No versions found</div>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`bg-gray-700 rounded-lg p-4 border ${
                  version.isLatest ? 'border-cyan-400' : 'border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-medium">
                        Version {version.id + 1}
                      </h4>
                      {version.isLatest && (
                        <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      {version.timestamp.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs font-mono">
                      CID: {version.cid.substring(0, 20)}...
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadVersion(version)}
                      disabled={downloadingVersion === version.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {downloadingVersion === version.id ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs">
            Note: Each version represents a snapshot of the file at the time it was uploaded.
            The latest version is automatically selected when accessing the file normally.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileVersions;