async function main() {
  try {
    console.log("Starting token distribution process...");
    
    // Configuration
    const DISTRIBUTOR_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    
    // Get the deployed StorageToken contract
    const storageTokenAddress = process.env.NEXT_PUBLIC_STORAGE_TOKEN_ADDRESS;
    if (!storageTokenAddress) {
      throw new Error('NEXT_PUBLIC_STORAGE_TOKEN_ADDRESS not found in environment');
    }
    
    const StorageToken = await ethers.getContractFactory("StorageToken");
    const storageToken = StorageToken.attach(storageTokenAddress);
    
    // Get signers (accounts)
    const [deployer, ...accounts] = await ethers.getSigners();
    
    console.log(`Distributor address: ${DISTRIBUTOR_ADDRESS}`);
    console.log(`StorageToken address: ${storageTokenAddress}`);
    
    // Check if distributor address has tokens
    const distributorBalance = await storageToken.balanceOf(DISTRIBUTOR_ADDRESS);
    console.log(`Distributor balance: ${ethers.formatEther(distributorBalance)} STOR`);
    
    if (distributorBalance === 0n) {
      console.log("Warning: Distributor address has no tokens to distribute.");
      console.log("Minting tokens to distributor address first...");
      
      // Mint tokens to distributor address (requires deployer to be owner)
      const mintAmount = ethers.parseEther("50000"); // 50,000 tokens
      await storageToken.mint(DISTRIBUTOR_ADDRESS, mintAmount);
      console.log(`Minted ${ethers.formatEther(mintAmount)} STOR to distributor address`);
    }
    
    // Define recipient accounts and distribution amounts
    const recipients = [
      { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", amount: ethers.parseEther("10000") }, // 10,000 STOR
      { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: ethers.parseEther("8000") },  // 8,000 STOR
      { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: ethers.parseEther("6000") },  // 6,000 STOR
      { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", amount: ethers.parseEther("5000") },  // 5,000 STOR
      { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", amount: ethers.parseEther("3000") },  // 3,000 STOR
    ];
    
    // Calculate total distribution amount
    const totalDistribution = recipients.reduce((sum, recipient) => sum + recipient.amount, 0n);
    console.log(`Total distribution amount: ${ethers.formatEther(totalDistribution)} STOR`);
    
    // Validate distributor has sufficient balance
    const currentBalance = await storageToken.balanceOf(DISTRIBUTOR_ADDRESS);
    if (currentBalance < totalDistribution) {
      throw new Error(`Insufficient balance. Required: ${ethers.formatEther(totalDistribution)}, Available: ${ethers.formatEther(currentBalance)}`);
    }
    
    // Distribution records
    const distributionRecords = [];
    let successfulTransfers = 0;
    let failedTransfers = 0;
    
    console.log("\n=== Starting Token Distribution ===");
    
    // Check if distributor address is available in signers
    let distributorSigner = null;
    for (const signer of [deployer, ...accounts]) {
      if ((await signer.getAddress()).toLowerCase() === DISTRIBUTOR_ADDRESS.toLowerCase()) {
        distributorSigner = signer;
        break;
      }
    }
    
    if (!distributorSigner) {
      console.log("Distributor address not found in available signers.");
      console.log("Transferring tokens from distributor to deployer first, then distributing...");
      
      // First, transfer all tokens from distributor to deployer
      // Since we minted to distributor, we need to transfer from there
      // For testing, we'll use the deployer account to distribute directly
      
      // Get the contract instance with deployer signer
      const storageTokenWithDeployer = storageToken.connect(deployer);
      
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const startTime = Date.now();
        
        try {
          console.log(`\n[${i + 1}/${recipients.length}] Transferring ${ethers.formatEther(recipient.amount)} STOR to ${recipient.address}`);
          
          // Check recipient's current balance
          const beforeBalance = await storageToken.balanceOf(recipient.address);
          console.log(`  Before balance: ${ethers.formatEther(beforeBalance)} STOR`);
          
          // Execute transfer using deployer account
          const tx = await storageTokenWithDeployer.transfer(recipient.address, recipient.amount);
          console.log(`  Transaction hash: ${tx.hash}`);
          
          // Wait for confirmation
          const receipt = await tx.wait();
          console.log(`  Confirmed in block: ${receipt.blockNumber}`);
          
          // Verify transfer
          const afterBalance = await storageToken.balanceOf(recipient.address);
          console.log(`  After balance: ${ethers.formatEther(afterBalance)} STOR`);
          
          const actualTransferred = afterBalance - beforeBalance;
          if (actualTransferred !== recipient.amount) {
            throw new Error(`Transfer amount mismatch. Expected: ${ethers.formatEther(recipient.amount)}, Actual: ${ethers.formatEther(actualTransferred)}`);
          }
          
          // Record successful transfer
          const endTime = Date.now();
          const record = {
            recipient: recipient.address,
            amount: ethers.formatEther(recipient.amount),
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            processingTime: `${endTime - startTime}ms`
          };
          
          distributionRecords.push(record);
          successfulTransfers++;
          
          console.log(`  ✓ Transfer successful!`);
          
        } catch (error) {
          console.log(`  ✗ Transfer failed: ${error.message}`);
          
          // Record failed transfer
          const endTime = Date.now();
          const record = {
            recipient: recipient.address,
            amount: ethers.formatEther(recipient.amount),
            txHash: null,
            blockNumber: null,
            gasUsed: null,
            status: 'FAILED',
            error: error.message,
            timestamp: new Date().toISOString(),
            processingTime: `${endTime - startTime}ms`
          };
          
          distributionRecords.push(record);
          failedTransfers++;
        }
        
        // Small delay between transfers
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      // Use the distributor signer directly
      const storageTokenWithDistributor = storageToken.connect(distributorSigner);
      
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const startTime = Date.now();
        
        try {
          console.log(`\n[${i + 1}/${recipients.length}] Transferring ${ethers.formatEther(recipient.amount)} STOR to ${recipient.address}`);
          
          // Check recipient's current balance
          const beforeBalance = await storageToken.balanceOf(recipient.address);
          console.log(`  Before balance: ${ethers.formatEther(beforeBalance)} STOR`);
          
          // Execute transfer from distributor
          const tx = await storageTokenWithDistributor.transfer(recipient.address, recipient.amount);
          console.log(`  Transaction hash: ${tx.hash}`);
          
          // Wait for confirmation
          const receipt = await tx.wait();
          console.log(`  Confirmed in block: ${receipt.blockNumber}`);
          
          // Verify transfer
          const afterBalance = await storageToken.balanceOf(recipient.address);
          console.log(`  After balance: ${ethers.formatEther(afterBalance)} STOR`);
          
          const actualTransferred = afterBalance - beforeBalance;
          if (actualTransferred !== recipient.amount) {
            throw new Error(`Transfer amount mismatch. Expected: ${ethers.formatEther(recipient.amount)}, Actual: ${ethers.formatEther(actualTransferred)}`);
          }
          
          // Record successful transfer
          const endTime = Date.now();
          const record = {
            recipient: recipient.address,
            amount: ethers.formatEther(recipient.amount),
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            processingTime: `${endTime - startTime}ms`
          };
          
          distributionRecords.push(record);
          successfulTransfers++;
          
          console.log(`  ✓ Transfer successful!`);
          
        } catch (error) {
          console.log(`  ✗ Transfer failed: ${error.message}`);
          
          // Record failed transfer
          const endTime = Date.now();
          const record = {
            recipient: recipient.address,
            amount: ethers.formatEther(recipient.amount),
            txHash: null,
            blockNumber: null,
            gasUsed: null,
            status: 'FAILED',
            error: error.message,
            timestamp: new Date().toISOString(),
            processingTime: `${endTime - startTime}ms`
          };
          
          distributionRecords.push(record);
          failedTransfers++;
        }
        
        // Small delay between transfers
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Generate distribution report
    console.log("\n=== DISTRIBUTION COMPLETE ===");
    console.log(`Total recipients: ${recipients.length}`);
    console.log(`Successful transfers: ${successfulTransfers}`);
    console.log(`Failed transfers: ${failedTransfers}`);
    console.log(`Success rate: ${((successfulTransfers / recipients.length) * 100).toFixed(2)}%`);
    
    // Save distribution records to file
    const fs = require('fs');
    const reportPath = './distribution-report.json';
    const report = {
      distributorAddress: DISTRIBUTOR_ADDRESS,
      tokenAddress: storageTokenAddress,
      totalRecipients: recipients.length,
      successfulTransfers,
      failedTransfers,
      totalDistributed: ethers.formatEther(recipients.reduce((sum, r) => sum + r.amount, 0n)),
      timestamp: new Date().toISOString(),
      records: distributionRecords
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDistribution report saved to: ${reportPath}`);
    
    // Display summary table
    console.log("\n=== DISTRIBUTION SUMMARY ===");
    console.table(distributionRecords.map(record => ({
      Recipient: record.recipient.slice(0, 10) + '...',
      Amount: record.amount + ' STOR',
      Status: record.status,
      'Tx Hash': record.txHash ? record.txHash.slice(0, 10) + '...' : 'N/A',
      'Processing Time': record.processingTime
    })));
    
  } catch (error) {
    console.error("Distribution failed:", error.message);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});