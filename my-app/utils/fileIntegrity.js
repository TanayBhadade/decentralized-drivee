import CryptoJS from 'crypto-js';
import EncryptionService from './encryption.js';

/**
 * Enhanced file integrity and content addressing system
 * Provides cryptographic verification, proof of storage, and content identification
 */
class FileIntegrityService {
  constructor() {
    this.hashAlgorithm = 'SHA256';
    this.merkleTreeCache = new Map();
    this.integrityChecks = new Map();
    this.proofOfStorage = new Map();
  }

  /**
   * Calculate comprehensive file hash with metadata
   * @param {ArrayBuffer|Uint8Array} fileData - File data
   * @param {Object} metadata - File metadata
   * @returns {Object} Hash information
   */
  calculateFileHash(fileData, metadata = {}) {
    const contentHash = EncryptionService.calculateSHA256(fileData);
    const metadataHash = CryptoJS.SHA256(JSON.stringify(metadata)).toString();
    const combinedHash = CryptoJS.SHA256(contentHash + metadataHash).toString();
    
    return {
      contentHash,
      metadataHash,
      combinedHash,
      algorithm: this.hashAlgorithm,
      timestamp: Date.now(),
      fileSize: fileData.byteLength
    };
  }

  /**
   * Generate Content Identifier (CID) compatible with IPFS
   * @param {ArrayBuffer|Uint8Array} fileData - File data
   * @param {Object} options - CID generation options
   * @returns {string} Content identifier
   */
  generateCID(fileData, options = {}) {
    const {
      version = 1,
      codec = 'dag-pb',
      hashFunction = 'sha2-256'
    } = options;

    const hash = EncryptionService.calculateSHA256(fileData);
    
    // Simplified CID generation (in production, use proper IPFS CID library)
    const prefix = version === 0 ? 'Qm' : 'baf';
    const cidHash = hash.substring(0, 44);
    
    return `${prefix}${cidHash}`;
  }

  /**
   * Create Merkle tree for file chunks
   * @param {Array} chunks - Array of file chunks
   * @returns {Object} Merkle tree structure
   */
  createMerkleTree(chunks) {
    if (!chunks || chunks.length === 0) {
      throw new Error('Cannot create Merkle tree from empty chunks');
    }

    // Calculate leaf hashes
    const leaves = chunks.map((chunk, index) => ({
      index,
      hash: EncryptionService.calculateSHA256(chunk),
      data: chunk
    }));

    // Build tree bottom-up
    let currentLevel = leaves;
    const tree = [currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Handle odd number of nodes
        
        const combinedHash = CryptoJS.SHA256(left.hash + right.hash).toString();
        nextLevel.push({
          hash: combinedHash,
          left: left.hash,
          right: right.hash
        });
      }
      
      currentLevel = nextLevel;
      tree.push(currentLevel);
    }

    const rootHash = currentLevel[0].hash;
    
    return {
      rootHash,
      tree,
      leaves,
      depth: tree.length - 1,
      totalChunks: chunks.length
    };
  }

  /**
   * Generate Merkle proof for a specific chunk
   * @param {Object} merkleTree - Merkle tree structure
   * @param {number} chunkIndex - Index of chunk to prove
   * @returns {Array} Merkle proof path
   */
  generateMerkleProof(merkleTree, chunkIndex) {
    const { tree, leaves } = merkleTree;
    const proof = [];
    
    if (chunkIndex >= leaves.length) {
      throw new Error('Chunk index out of range');
    }

    let currentIndex = chunkIndex;
    
    // Traverse from leaf to root
    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push({
          hash: currentLevel[siblingIndex].hash,
          position: isRightNode ? 'left' : 'right'
        });
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return proof;
  }

  /**
   * Verify Merkle proof
   * @param {string} leafHash - Hash of the leaf to verify
   * @param {Array} proof - Merkle proof path
   * @param {string} rootHash - Expected root hash
   * @returns {boolean} True if proof is valid
   */
  verifyMerkleProof(leafHash, proof, rootHash) {
    let currentHash = leafHash;
    
    for (const proofElement of proof) {
      const { hash: siblingHash, position } = proofElement;
      
      if (position === 'left') {
        currentHash = CryptoJS.SHA256(siblingHash + currentHash).toString();
      } else {
        currentHash = CryptoJS.SHA256(currentHash + siblingHash).toString();
      }
    }
    
    return currentHash === rootHash;
  }

  /**
   * Create proof of storage challenge
   * @param {string} fileId - File identifier
   * @param {Object} merkleTree - File's Merkle tree
   * @returns {Object} Storage challenge
   */
  createStorageChallenge(fileId, merkleTree) {
    const challengeId = this.generateChallengeId();
    const randomChunkIndex = Math.floor(Math.random() * merkleTree.totalChunks);
    const proof = this.generateMerkleProof(merkleTree, randomChunkIndex);
    
    const challenge = {
      challengeId,
      fileId,
      chunkIndex: randomChunkIndex,
      expectedHash: merkleTree.leaves[randomChunkIndex].hash,
      rootHash: merkleTree.rootHash,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
    
    this.proofOfStorage.set(challengeId, challenge);
    
    return {
      challengeId,
      chunkIndex: randomChunkIndex,
      expiresAt: challenge.expiresAt
    };
  }

  /**
   * Verify proof of storage response
   * @param {string} challengeId - Challenge identifier
   * @param {ArrayBuffer|Uint8Array} chunkData - Provided chunk data
   * @param {Array} merkleProof - Merkle proof for the chunk
   * @returns {Object} Verification result
   */
  verifyStorageProof(challengeId, chunkData, merkleProof) {
    const challenge = this.proofOfStorage.get(challengeId);
    
    if (!challenge) {
      return { valid: false, reason: 'Challenge not found' };
    }
    
    if (Date.now() > challenge.expiresAt) {
      this.proofOfStorage.delete(challengeId);
      return { valid: false, reason: 'Challenge expired' };
    }
    
    // Verify chunk hash
    const chunkHash = EncryptionService.calculateSHA256(chunkData);
    if (chunkHash !== challenge.expectedHash) {
      return { valid: false, reason: 'Chunk hash mismatch' };
    }
    
    // Verify Merkle proof
    const proofValid = this.verifyMerkleProof(
      chunkHash,
      merkleProof,
      challenge.rootHash
    );
    
    if (!proofValid) {
      return { valid: false, reason: 'Invalid Merkle proof' };
    }
    
    // Clean up challenge
    this.proofOfStorage.delete(challengeId);
    
    return {
      valid: true,
      challengeId,
      verifiedAt: Date.now()
    };
  }

  /**
   * Perform integrity check on file
   * @param {string} fileId - File identifier
   * @param {ArrayBuffer|Uint8Array} fileData - File data to check
   * @param {string} expectedHash - Expected file hash
   * @returns {Object} Integrity check result
   */
  performIntegrityCheck(fileId, fileData, expectedHash) {
    const actualHash = EncryptionService.calculateSHA256(fileData);
    const isValid = actualHash === expectedHash;
    
    const checkResult = {
      fileId,
      isValid,
      expectedHash,
      actualHash,
      timestamp: Date.now(),
      fileSize: fileData.byteLength
    };
    
    // Store check result
    if (!this.integrityChecks.has(fileId)) {
      this.integrityChecks.set(fileId, []);
    }
    this.integrityChecks.get(fileId).push(checkResult);
    
    return checkResult;
  }

  /**
   * Get integrity check history for a file
   * @param {string} fileId - File identifier
   * @param {number} limit - Maximum number of checks to return
   * @returns {Array} Array of integrity checks
   */
  getIntegrityHistory(fileId, limit = 50) {
    const checks = this.integrityChecks.get(fileId) || [];
    return checks
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Calculate file similarity using fuzzy hashing
   * @param {ArrayBuffer|Uint8Array} file1 - First file data
   * @param {ArrayBuffer|Uint8Array} file2 - Second file data
   * @returns {number} Similarity score (0-1)
   */
  calculateFileSimilarity(file1, file2) {
    // Simple similarity based on chunk comparison
    const chunkSize = 1024; // 1KB chunks
    const chunks1 = this.createFileChunks(file1, chunkSize);
    const chunks2 = this.createFileChunks(file2, chunkSize);
    
    const hashes1 = chunks1.map(chunk => EncryptionService.calculateSHA256(chunk));
    const hashes2 = chunks2.map(chunk => EncryptionService.calculateSHA256(chunk));
    
    const commonHashes = hashes1.filter(hash => hashes2.includes(hash));
    const totalUniqueHashes = new Set([...hashes1, ...hashes2]).size;
    
    return commonHashes.length / totalUniqueHashes;
  }

  /**
   * Create file chunks for processing
   * @param {ArrayBuffer|Uint8Array} fileData - File data
   * @param {number} chunkSize - Size of each chunk
   * @returns {Array} Array of chunks
   */
  createFileChunks(fileData, chunkSize = 1024 * 1024) {
    const chunks = [];
    const data = new Uint8Array(fileData);
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Generate unique challenge identifier
   * @returns {string} Challenge ID
   */
  generateChallengeId() {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Hex.stringify(randomBytes);
  }

  /**
   * Clean up expired challenges and old integrity checks
   */
  cleanup() {
    const now = Date.now();
    
    // Clean up expired storage challenges
    for (const [challengeId, challenge] of this.proofOfStorage) {
      if (now > challenge.expiresAt) {
        this.proofOfStorage.delete(challengeId);
      }
    }
    
    // Clean up old integrity checks (keep last 100 per file)
    for (const [fileId, checks] of this.integrityChecks) {
      if (checks.length > 100) {
        const sortedChecks = checks.sort((a, b) => b.timestamp - a.timestamp);
        this.integrityChecks.set(fileId, sortedChecks.slice(0, 100));
      }
    }
  }

  /**
   * Download file with integrity verification
   * @param {string} fileId - File identifier
   * @param {string} expectedHash - Expected file hash
   * @returns {Object} Download result with integrity verification
   */
  async downloadWithIntegrityCheck(fileId, expectedHash) {
    try {
      // Simulate file download process
      const downloadedData = await this.simulateFileDownload(fileId);
      
      // Verify integrity
      const actualHash = EncryptionService.calculateSHA256(downloadedData);
      
      if (actualHash !== expectedHash) {
        throw new Error('File integrity check failed: hash mismatch');
      }
      
      // Log successful integrity check
      this.performIntegrityCheck(fileId, downloadedData, expectedHash);
      
      return {
        success: true,
        data: downloadedData,
        hash: actualHash,
        verified: true
      };
    } catch (error) {
      // Log failed integrity check
      const checkResult = {
        fileId,
        isValid: false,
        expectedHash,
        actualHash: null,
        timestamp: Date.now(),
        error: error.message
      };
      
      if (!this.integrityChecks.has(fileId)) {
        this.integrityChecks.set(fileId, []);
      }
      this.integrityChecks.get(fileId).push(checkResult);
      
      throw error;
    }
  }

  /**
   * Simulate file download (replace with actual download logic)
   * @param {string} fileId - File identifier
   * @returns {Uint8Array} Mock file data
   */
  async simulateFileDownload(fileId) {
    // This method should be replaced with actual file download logic
    throw new Error('simulateFileDownload method needs to be implemented with actual download logic');
  }

  /**
   * Export file integrity report
   * @param {string} fileId - File identifier
   * @returns {Object} Comprehensive integrity report
   */
  generateIntegrityReport(fileId) {
    const integrityHistory = this.getIntegrityHistory(fileId);
    const lastCheck = integrityHistory[0];
    const totalChecks = integrityHistory.length;
    const validChecks = integrityHistory.filter(check => check.isValid).length;
    
    return {
      fileId,
      lastCheckTimestamp: lastCheck?.timestamp,
      lastCheckValid: lastCheck?.isValid,
      totalChecks,
      validChecks,
      integrityScore: totalChecks > 0 ? validChecks / totalChecks : 0,
      generatedAt: Date.now()
    };
  }
}

// Export singleton instance
export default new FileIntegrityService();

// Export class for testing
export { FileIntegrityService };

// Export specific functions for direct import
export const downloadWithIntegrityCheck = async (cid, fileName, encryptionKey, metadata = {}) => {
  try {
    // Create a temporary link to download from IPFS gateway
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    
    const response = await fetch(ipfsUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const encryptedData = await response.arrayBuffer();
    
    // Decrypt the file if encryption key is provided
    let fileData;
    if (encryptionKey) {
      const CryptoJS = (await import('crypto-js')).default;
      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedBase64, encryptionKey);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Failed to decrypt file - invalid encryption key');
      }
      
      // Convert back to binary data
      const binaryString = atob(decryptedString);
      fileData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileData[i] = binaryString.charCodeAt(i);
      }
    } else {
      fileData = new Uint8Array(encryptedData);
    }
    
    // Create download link
    const blob = new Blob([fileData]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Perform integrity check if metadata contains expected hash
    if (metadata.expectedHash) {
      const service = new FileIntegrityService();
      const actualHash = service.calculateFileHash(fileData).contentHash;
      
      if (actualHash !== metadata.expectedHash) {
        console.warn('File integrity check failed: hash mismatch');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Download with integrity check failed:', error);
    throw error;
  }
};