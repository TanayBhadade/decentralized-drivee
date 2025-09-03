async function main() {
  try {
    console.log("Minting STOR tokens for testing...");
    
    // Get the deployed StorageToken contract
    const storageTokenAddress = process.env.NEXT_PUBLIC_STORAGE_TOKEN_ADDRESS;
    if (!storageTokenAddress) {
      throw new Error('NEXT_PUBLIC_STORAGE_TOKEN_ADDRESS not found in environment');
    }
    
    const StorageToken = await ethers.getContractFactory("StorageToken");
    const storageToken = StorageToken.attach(storageTokenAddress);
    
    // Get signers (accounts)
    const [deployer, ...accounts] = await ethers.getSigners();
    
    console.log(`Deployer address: ${deployer.address}`);
    console.log(`StorageToken address: ${storageTokenAddress}`);
    
    // Mint tokens for the first few accounts (including deployer)
    const mintAmount = ethers.parseEther("5000"); // 5,000 tokens per account
    const accountsToMint = [deployer, ...accounts.slice(0, 4)]; // First 5 accounts
    
    for (let i = 0; i < accountsToMint.length; i++) {
      const account = accountsToMint[i];
      console.log(`\nMinting ${ethers.formatEther(mintAmount)} STOR tokens for account ${i}: ${account.address}`);
      
      try {
        const tx = await storageToken.mint(account.address, mintAmount);
        await tx.wait();
        
        const balance = await storageToken.balanceOf(account.address);
        console.log(`✓ Success! New balance: ${ethers.formatEther(balance)} STOR`);
      } catch (error) {
        console.log(`✗ Failed to mint for ${account.address}: ${error.message}`);
      }
    }
    
    console.log("\n=== TOKEN MINTING COMPLETE ===");
    console.log("You can now use these accounts to test storage provider registration.");
    console.log("Each account has 5,000 STOR tokens (minimum required: 1,000 STOR).");
    
  } catch (error) {
    console.error("Token minting failed:", error.message);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});