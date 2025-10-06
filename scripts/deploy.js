const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Network:', hre.network.name);

  const Contract = await hre.ethers.getContractFactory('EthUsdPriceConsumer');
  const contract = await Contract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('EthUsdPriceConsumer deployed to:', address);

  // Optional: verify automatically if ETHERSCAN_API_KEY is set and on live network
  if (['mainnet', 'sepolia'].includes(hre.network.name) && process.env.ETHERSCAN_API_KEY) {
    console.log('Verifying on Etherscan...');
    try {
      await hre.run('verify:verify', {
        address,
        constructorArguments: []
      });
      console.log('Verification complete');
    } catch (e) {
      console.log('Verification skipped/failed:', e.message || e);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
