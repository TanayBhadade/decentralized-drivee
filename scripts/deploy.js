async function main() {
  try {
    // Get the contract factory
    const FileManager = await ethers.getContractFactory("DecentralizedStorageManager");

    // Start the deployment with explicit gas settings
    console.log("Deploying FileManager contract...");
    const deploymentOptions = {
      gasLimit: 5000000, // Increased gas limit for complex contract
      gasPrice: 25000000000 // 25 gwei
    };

    console.log("Deployment options:", deploymentOptions);
    // Deploy FileManager without token dependencies
    const fileManager = await FileManager.deploy(deploymentOptions);

    // Wait for the deployment to be confirmed
    console.log("Waiting for deployment confirmation...");
    await fileManager.waitForDeployment();

    // Print the contract address
    console.log(`FileManager contract deployed to: ${fileManager.target}`);

    // Return the contract address for use in the frontend
    console.log("Add this address to your .env.local file as NEXT_PUBLIC_CONTRACT_ADDRESS");
  } catch (error) {
    console.error("Deployment failed:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("\n===== INSUFFICIENT FUNDS ERROR =====");
      console.log("You need more testnet MATIC tokens to deploy this contract.");
      console.log("Get free Amoy testnet MATIC from: https://faucet.polygon.technology/");
      console.log("Enter your wallet address and select 'Amoy' network.");
      console.log("==============================\n");
    }

    throw error;
  }
}

// Run the deployment and handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
