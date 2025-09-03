const { ethers } = require('hardhat');
require('dotenv').config({ path: './my-app/.env.local' });

async function testContractInteraction() {
  try {
    console.log('=== Testing Contract Interaction ===');
    
    // Get the deployed contract addresses
    const storageTokenAddress = process.env.NEXT_PUBLIC_STORAGE_TOKEN_ADDRESS;
    const fileManagerAddress = process.env.NEXT_PUBLIC_FILE_MANAGER_ADDRESS;
    
    console.log('StorageToken Address:', storageTokenAddress);
    console.log('FileManager Address:', fileManagerAddress);
    
    if (!storageTokenAddress || !fileManagerAddress) {
      throw new Error('Contract addresses not found in environment variables');
    }
    
    // Get signers
    const [deployer, user1] = await ethers.getSigners();
    console.log('Deployer address:', deployer.address);
    console.log('User1 address:', user1.address);
    
    // Get StorageToken contract
    const StorageToken = await ethers.getContractFactory('StorageToken');
    const storageToken = StorageToken.attach(storageTokenAddress);
    
    // Test balanceOf call with different accounts
    console.log('\n=== Testing balanceOf calls ===');
    
    try {
      const deployerBalance = await storageToken.balanceOf(deployer.address);
      console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)} STOR`);
    } catch (error) {
      console.error('Error getting deployer balance:', error.message);
    }
    
    try {
      const user1Balance = await storageToken.balanceOf(user1.address);
      console.log(`User1 balance: ${ethers.formatEther(user1Balance)} STOR`);
    } catch (error) {
      console.error('Error getting user1 balance:', error.message);
    }
    
    // Test with the specific address from the error
    const testAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
    try {
      const testBalance = await storageToken.balanceOf(testAddress);
      console.log(`Test address (${testAddress}) balance: ${ethers.formatEther(testBalance)} STOR`);
    } catch (error) {
      console.error(`Error getting balance for ${testAddress}:`, error.message);
    }
    
    // Test contract code verification
    console.log('\n=== Testing Contract Code Verification ===');
    const provider = ethers.provider;
    const code = await provider.getCode(storageTokenAddress);
    console.log('Contract code length:', code.length);
    console.log('Contract deployed:', code !== '0x');
    
    console.log('\n=== Test completed successfully ===');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testContractInteraction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });