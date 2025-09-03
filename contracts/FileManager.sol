// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title DecentralizedStorageManager
 * @dev Comprehensive smart contract for decentralized file storage with incentives
 */
contract DecentralizedStorageManager is Ownable, ReentrancyGuard {

    // Storage provider structure
    struct StorageProvider {
        address providerAddress;
        uint256 totalStorage; // in bytes
        uint256 usedStorage;
        uint256 reputation; // 0-1000 scale
        bool isActive;
        uint256 joinedTimestamp;
        string nodeId; // IPFS node ID
        string region;
    }

    // File metadata structure
    struct FileMetadata {
        string fileId;
        string contentHash; // IPFS hash or content identifier
        address owner;
        uint256 fileSize;
        uint256 uploadTimestamp;
        uint256 lastAccessTimestamp;
        string encryptionKey; // encrypted with owner's public key
        bool isPublic;
        uint256 accessCount;
        string[] tags;
        mapping(address => bool) authorizedUsers;
        address[] storageProviders;
        uint256 replicationFactor;
    }

    // Storage contract structure
    struct StorageContract {
        string fileId;
        address provider;
        address client;
        uint256 duration; // in days
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 lastProofTime;
    }

    // State variables
    mapping(address => StorageProvider) public storageProviders;
    mapping(string => FileMetadata) public fileMetadata;
    mapping(bytes32 => StorageContract) public storageContracts;
    
    address[] public activeProviders;
    string[] public allFiles;
    
    uint256 public constant PROOF_INTERVAL = 1 days;
    uint256 public constant MAX_REPUTATION = 1000;
    
    // Events
    event ProviderRegistered(address indexed provider, string nodeId);
    event FileUploaded(string indexed fileId, address indexed owner, uint256 fileSize);
    event StorageContractCreated(bytes32 indexed contractId, string fileId, address provider, address client);
    event ProofOfStorageSubmitted(bytes32 indexed contractId, address provider, bool success);
    event FileAccessed(string indexed fileId, address indexed user);

    constructor() Ownable(msg.sender) {
        // Initialize contract without token dependencies
    }

    /**
     * @dev Register as a storage provider
     * @param _totalStorage Total storage capacity in bytes
     * @param _nodeId IPFS node identifier
     * @param _region Geographic region
     */
    function registerProvider(
        uint256 _totalStorage,
        string memory _nodeId,
        string memory _region
    ) external {
        require(_totalStorage > 0, "Storage capacity must be greater than 0");
        require(!storageProviders[msg.sender].isActive, "Provider already registered");

        storageProviders[msg.sender] = StorageProvider({
            providerAddress: msg.sender,
            totalStorage: _totalStorage,
            usedStorage: 0,
            reputation: 500, // Start with medium reputation
            isActive: true,
            joinedTimestamp: block.timestamp,
            nodeId: _nodeId,
            region: _region
        });

        activeProviders.push(msg.sender);
        emit ProviderRegistered(msg.sender, _nodeId);
    }

    /**
     * @dev Upload file metadata to the contract
     * @param _fileId Unique file identifier
     * @param _contentHash IPFS content hash
     * @param _fileSize File size in bytes
     * @param _encryptionKey Encrypted encryption key
     * @param _isPublic Whether file is publicly accessible
     * @param _tags File tags for categorization
     * @param _replicationFactor Number of copies to maintain
     */
    function uploadFile(
        string memory _fileId,
        string memory _contentHash,
        uint256 _fileSize,
        string memory _encryptionKey,
        bool _isPublic,
        string[] memory _tags,
        uint256 _replicationFactor
    ) external {
        require(bytes(_fileId).length > 0, "File ID cannot be empty");
        require(bytes(_contentHash).length > 0, "Content hash cannot be empty");
        require(_fileSize > 0, "File size must be greater than 0");
        require(_replicationFactor > 0 && _replicationFactor <= 10, "Invalid replication factor");
        require(bytes(fileMetadata[_fileId].fileId).length == 0, "File already exists");

        FileMetadata storage newFile = fileMetadata[_fileId];
        newFile.fileId = _fileId;
        newFile.contentHash = _contentHash;
        newFile.owner = msg.sender;
        newFile.fileSize = _fileSize;
        newFile.uploadTimestamp = block.timestamp;
        newFile.lastAccessTimestamp = block.timestamp;
        newFile.encryptionKey = _encryptionKey;
        newFile.isPublic = _isPublic;
        newFile.accessCount = 0;
        newFile.tags = _tags;
        newFile.replicationFactor = _replicationFactor;

        allFiles.push(_fileId);
        emit FileUploaded(_fileId, msg.sender, _fileSize);

        // Automatically create storage contracts with best providers
        _createStorageContracts(_fileId, _replicationFactor);
    }

    /**
     * @dev Create storage contracts with selected providers
     * @param _fileId File identifier
     * @param _replicationFactor Number of providers needed
     */
    function _createStorageContracts(string memory _fileId, uint256 _replicationFactor) internal {
        address[] memory selectedProviders = _selectBestProviders(_replicationFactor, fileMetadata[_fileId].fileSize);
        
        for (uint256 i = 0; i < selectedProviders.length; i++) {
            address provider = selectedProviders[i];
            StorageProvider storage providerData = storageProviders[provider];
            
            bytes32 contractId = keccak256(abi.encodePacked(_fileId, provider, block.timestamp));
            uint256 duration = 365; // 1 year default
            
            storageContracts[contractId] = StorageContract({
                fileId: _fileId,
                provider: provider,
                client: msg.sender,
                duration: duration,
                startTime: block.timestamp,
                endTime: block.timestamp + (duration * 1 days),
                isActive: true,
                lastProofTime: block.timestamp
            });

            // Update provider's used storage
            providerData.usedStorage = providerData.usedStorage + fileMetadata[_fileId].fileSize;
            fileMetadata[_fileId].storageProviders.push(provider);

            emit StorageContractCreated(contractId, _fileId, provider, msg.sender);
        }
    }

    /**
     * @dev Select best storage providers based on reputation and availability
     * @param _count Number of providers to select
     * @param _fileSize Size of file to store
     * @return Array of selected provider addresses
     */
    function _selectBestProviders(uint256 _count, uint256 _fileSize) internal view returns (address[] memory) {
        require(_count <= activeProviders.length, "Not enough active providers");
        
        address[] memory availableProviders = new address[](activeProviders.length);
        uint256 availableCount = 0;
        
        // Filter available providers
        for (uint256 i = 0; i < activeProviders.length; i++) {
            address provider = activeProviders[i];
            StorageProvider storage providerData = storageProviders[provider];
            
            if (providerData.isActive && 
                providerData.totalStorage - providerData.usedStorage >= _fileSize) {
                availableProviders[availableCount] = provider;
                availableCount++;
            }
        }
        
        require(availableCount >= _count, "Not enough available storage capacity");
        
        // Simple selection based on reputation (in production, use more sophisticated algorithm)
        address[] memory selected = new address[](_count);
        for (uint256 i = 0; i < _count && i < availableCount; i++) {
            selected[i] = availableProviders[i];
        }
        
        return selected;
    }

    /**
     * @dev Submit proof of storage for a file
     * @param _contractId Storage contract identifier
     * @param _merkleProof Merkle proof of file possession
     * @param _challengeResponse Response to storage challenge
     */
    function submitProofOfStorage(
        bytes32 _contractId,
        bytes32[] memory _merkleProof,
        bytes32 _challengeResponse
    ) external {
        StorageContract storage storageContract = storageContracts[_contractId];
        require(storageContract.isActive, "Contract is not active");
        require(storageContract.provider == msg.sender, "Only provider can submit proof");
        require(
            block.timestamp >= storageContract.lastProofTime + PROOF_INTERVAL,
            "Proof submitted too early"
        );

        // Verify proof (simplified - in production, implement proper verification)
        bool proofValid = _verifyStorageProof(_merkleProof, _challengeResponse, storageContract.fileId);
        
        StorageProvider storage provider = storageProviders[msg.sender];
        
        if (proofValid) {
            // Update reputation positively
            if (provider.reputation < MAX_REPUTATION) {
                provider.reputation = provider.reputation + 1;
            }
            
            storageContract.lastProofTime = block.timestamp;
            emit ProofOfStorageSubmitted(_contractId, msg.sender, true);
        } else {
            // Decrease reputation for failed proof
            if (provider.reputation >= 10) {
                provider.reputation = provider.reputation - 10;
            } else {
                provider.reputation = 0;
            }
            
            emit ProofOfStorageSubmitted(_contractId, msg.sender, false);
        }
    }

    /**
     * @dev Verify storage proof (simplified implementation)
     * @param _merkleProof Merkle proof
     * @param _challengeResponse Challenge response
     * @param _fileId File identifier
     * @return True if proof is valid
     */
    function _verifyStorageProof(
        bytes32[] memory _merkleProof,
        bytes32 _challengeResponse,
        string memory _fileId
    ) internal pure returns (bool) {
        // Simplified verification - in production, implement proper Merkle tree verification
        return _merkleProof.length > 0 && _challengeResponse != bytes32(0) && bytes(_fileId).length > 0;
    }



    /**
     * @dev Access a file (updates access statistics)
     * @param _fileId File identifier
     */
    function accessFile(string memory _fileId) external {
        FileMetadata storage file = fileMetadata[_fileId];
        require(bytes(file.fileId).length > 0, "File does not exist");
        require(
            file.isPublic || file.owner == msg.sender || file.authorizedUsers[msg.sender],
            "Access denied"
        );

        file.lastAccessTimestamp = block.timestamp;
        file.accessCount = file.accessCount + 1;
        
        emit FileAccessed(_fileId, msg.sender);
    }

    /**
     * @dev Grant access to a user for a specific file
     * @param _fileId File identifier
     * @param _user User address to grant access
     */
    function grantFileAccess(string memory _fileId, address _user) external {
        FileMetadata storage file = fileMetadata[_fileId];
        require(file.owner == msg.sender, "Only owner can grant access");
        
        file.authorizedUsers[_user] = true;
    }

    /**
     * @dev Revoke access from a user for a specific file
     * @param _fileId File identifier
     * @param _user User address to revoke access
     */
    function revokeFileAccess(string memory _fileId, address _user) external {
        FileMetadata storage file = fileMetadata[_fileId];
        require(file.owner == msg.sender, "Only owner can revoke access");
        
        file.authorizedUsers[_user] = false;
    }

    /**
     * @dev Deactivate a provider (only owner)
     * @param _provider Provider address
     * @param _reason Reason for deactivation
     */
    function deactivateProvider(address _provider, string memory _reason) external onlyOwner {
        StorageProvider storage provider = storageProviders[_provider];
        require(provider.isActive, "Provider is not active");
        
        provider.isActive = false;
        
        // Remove from active providers array
        for (uint256 i = 0; i < activeProviders.length; i++) {
            if (activeProviders[i] == _provider) {
                activeProviders[i] = activeProviders[activeProviders.length - 1];
                activeProviders.pop();
                break;
            }
        }
    }

    /**
     * @dev Get file information
     * @param _fileId File identifier
     * @return fileId The file identifier
     * @return contentHash The content hash of the file
     * @return owner The owner address
     * @return fileSize The size of the file
     * @return uploadTimestamp When the file was uploaded
     * @return isPublic Whether the file is public
     * @return accessCount Number of times accessed
     */
    function getFileInfo(string memory _fileId) external view returns (
        string memory fileId,
        string memory contentHash,
        address owner,
        uint256 fileSize,
        uint256 uploadTimestamp,
        bool isPublic,
        uint256 accessCount
    ) {
        FileMetadata storage file = fileMetadata[_fileId];
        return (
            file.fileId,
            file.contentHash,
            file.owner,
            file.fileSize,
            file.uploadTimestamp,
            file.isPublic,
            file.accessCount
        );
    }

    /**
     * @dev Get provider information
     * @param _provider Provider address
     * @return totalStorage Total storage capacity
     * @return usedStorage Currently used storage
     * @return reputation Provider reputation score
     * @return isActive Whether provider is active
     */
    function getProviderInfo(address _provider) external view returns (
        uint256 totalStorage,
        uint256 usedStorage,
        uint256 reputation,
        bool isActive
    ) {
        StorageProvider storage provider = storageProviders[_provider];
        return (
            provider.totalStorage,
            provider.usedStorage,
            provider.reputation,
            provider.isActive
        );
    }

    /**
     * @dev Get total number of files
     * @return Number of files
     */
    function getTotalFiles() external view returns (uint256) {
        return allFiles.length;
    }

    /**
     * @dev Get total number of active providers
     * @return Number of active providers
     */
    function getTotalProviders() external view returns (uint256) {
        return activeProviders.length;
    }


}
