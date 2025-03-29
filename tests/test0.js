const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointZeroOne = convert("0.01", 18);
const one = convert("1", 18);

let owner, treasury, user0, user1, user2, user3;
let base, voter;
let henloTech, plugin, multicall, vaultFactory;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, treasury, user0, user1, user2, user3] = await ethers.getSigners();

    const vaultFactoryArtifact = await ethers.getContractFactory(
      "BerachainRewardVaultFactory"
    );
    vaultFactory = await vaultFactoryArtifact.deploy();
    console.log("- Vault Factory Initialized");

    const baseArtifact = await ethers.getContractFactory("Base");
    base = await baseArtifact.deploy();
    console.log("- BASE Initialized");

    const voterArtifact = await ethers.getContractFactory("Voter");
    voter = await voterArtifact.deploy();
    console.log("- Voter Initialized");

    const henloTechArtifact = await ethers.getContractFactory("HenloTech");
    henloTech = await henloTechArtifact.deploy();
    console.log("- HenloTech Initialized");

    const pluginArtifact = await ethers.getContractFactory("HenloTechPlugin");
    plugin = await pluginArtifact.deploy(
      base.address,
      voter.address,
      [base.address],
      [base.address],
      vaultFactory.address,
      henloTech.address,
      treasury.address,
      treasury.address
    );
    console.log("- Plugin Initialized");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(
      henloTech.address,
      plugin.address,
      await voter.OTOKEN()
    );
    console.log("- Multicall Initialized");

    await henloTech.initialize(plugin.address);
    await voter.setPlugin(plugin.address);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("First test", async function () {
    console.log("******************************************************");
  });
});
