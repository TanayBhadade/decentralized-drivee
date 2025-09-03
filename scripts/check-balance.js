async function main() {
    const { ethers } = require("hardhat");
    
    // Address to check
    const addressToCheck = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    
    try {
        // Get the StorageToken contract
        const StorageToken = await ethers.getContractFactory("StorageToken");
        
        // Connect to the deployed contract
        // You may need to update this address based on your deployment
        const storageTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const storageToken = StorageToken.attach(storageTokenAddress);
        
        // Check balance
        const balance = await storageToken.balanceOf(addressToCheck);
        const decimals = await storageToken.decimals();
        
        // Convert from wei to readable format
        const readableBalance = ethers.formatUnits(balance, decimals);
        
        console.log(`\n=== STOR Token Balance Check ===`);
        console.log(`Address: ${addressToCheck}`);
        console.log(`Balance: ${readableBalance} STOR`);
        console.log(`Raw Balance: ${balance.toString()} (wei)`);
        console.log(`Token Contract: ${storageTokenAddress}`);
        console.log(`================================\n`);
        
    } catch (error) {
        console.error("Error checking balance:", error.message);
        
        if (error.message.includes("ECONNREFUSED")) {
            console.log("\nMake sure the Hardhat node is running with: npx hardhat node");
        }
        
        if (error.message.includes("contract runner does not support calling")) {
            console.log("\nMake sure the StorageToken contract is deployed.");
            console.log("Run: npx hardhat run scripts/deploy-complete.js --network localhost");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });