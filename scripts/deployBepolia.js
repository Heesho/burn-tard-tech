const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const pointZeroOne = convert("0.01", 18);

const VOTER_ADDRESS = "0x54cCcf999B5bd3Ea12c52810fA60BB0eB41d109c";
const OBERO_ADDRESS = "0x935938EC3a925d09365e6Bd1f4eec04faF870b6e";
const WBERA_ADDRESS = "0x6969696969696969696969696969696969696969";
const VAULT_FACTORY_ADDRESS = "0x94Ad6Ac84f6C6FbA8b8CCbD71d9f4f101def52a8";
const MULTISIG_ADDRESS = "0x039ec2E90454892fCbA461Ecf8878D0C45FDdFeE";

// Contract Variables
let tech, plugin, multicall;

/*===================================================================*/
/*===========================  CONTRACT DATA  =======================*/

async function getContracts() {
  tech = await ethers.getContractAt(
    "contracts/BurnTardTech.sol:BurnTardTech",
    "0xAa90118Aa7d14853a42ee6555E73e9205ee66bAE"
  );
  plugin = await ethers.getContractAt(
    "contracts/BurnTardTechPlugin.sol:BurnTardTechPlugin",
    "0xeaB1A53350041eC038718e9b855d15FF471Ce172"
  );
  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0xC1559ffbe1479481E66e53F9f158850f9B46CB80"
  );
  console.log("Contracts Retrieved");
}

/*===========================  END CONTRACT DATA  ===================*/
/*===================================================================*/

async function deployTech() {
  console.log("Starting Tech Deployment");
  const techArtifact = await ethers.getContractFactory("BurnTardTech");
  const techContract = await techArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  tech = await techContract.deployed();
  await sleep(5000);
  console.log("Tech Deployed at:", tech.address);
}

async function deployPlugin(wallet) {
  console.log("Starting Plugin Deployment");
  const pluginArtifact = await ethers.getContractFactory("BurnTardTechPlugin");
  const pluginContract = await pluginArtifact.deploy(
    WBERA_ADDRESS,
    VOTER_ADDRESS,
    [WBERA_ADDRESS],
    [WBERA_ADDRESS],
    VAULT_FACTORY_ADDRESS,
    tech.address,
    wallet.address,
    wallet.address,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  plugin = await pluginContract.deployed();
  await sleep(5000);
  console.log("Plugin Deployed at:", plugin.address);
}

async function deployMulticall() {
  console.log("Starting Multicall Deployment");
  const multicallArtifact = await ethers.getContractFactory("Multicall");
  const multicallContract = await multicallArtifact.deploy(
    tech.address,
    plugin.address,
    OBERO_ADDRESS,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  multicall = await multicallContract.deployed();
  console.log("Multicall Deployed at:", multicall.address);
}

async function printDeployment() {
  console.log("**************************************************************");
  console.log("Tech: ", tech.address);
  console.log("Plugin: ", plugin.address);
  console.log("Multicall: ", multicall.address);
  console.log("**************************************************************");
}

async function systemSetup(wallet) {
  console.log("Starting System Set Up");
  await tech.initialize(plugin.address);
  console.log("System Initialized");
}

async function verifyTech() {
  await hre.run("verify:verify", {
    address: tech.address,
    constructorArguments: [],
  });
}

async function verifyPlugin(wallet) {
  await hre.run("verify:verify", {
    address: plugin.address,
    constructorArguments: [
      WBERA_ADDRESS,
      VOTER_ADDRESS,
      [WBERA_ADDRESS],
      [WBERA_ADDRESS],
      VAULT_FACTORY_ADDRESS,
      tech.address,
      wallet.address,
      wallet.address,
    ],
  });
}

async function verifyMulticall() {
  await hre.run("verify:verify", {
    address: multicall.address,
    constructorArguments: [tech.address, plugin.address, OBERO_ADDRESS],
  });
}

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log("Using wallet: ", wallet.address);

  await getContracts();

  // await deployTech();
  // await deployPlugin(wallet);
  // await deployMulticall();
  // await printDeployment();

  // await verifyTech();
  // await verifyPlugin(wallet);
  // await verifyMulticall();

  // await systemSetup(wallet);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
