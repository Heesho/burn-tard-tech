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
let units, key, factory, plugin, multicall, vaultFactory;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, treasury, user0, user1, user2, user3] = await ethers.getSigners();

    const vaultFactoryArtifact = await ethers.getContractFactory(
      "BerachainRewardsVaultFactory"
    );
    vaultFactory = await vaultFactoryArtifact.deploy();
    console.log("- Vault Factory Initialized");

    const baseArtifact = await ethers.getContractFactory("Base");
    base = await baseArtifact.deploy();
    console.log("- BASE Initialized");

    const voterArtifact = await ethers.getContractFactory("Voter");
    voter = await voterArtifact.deploy();
    console.log("- Voter Initialized");

    const keyArtifact = await ethers.getContractFactory("Key");
    key = await keyArtifact.deploy();
    console.log("- Key Initialized");

    const unitsArtifact = await ethers.getContractFactory("Units");
    units = await unitsArtifact.deploy();
    console.log("- Units Initialized");

    const factoryArtifact = await ethers.getContractFactory("Factory");
    factory = await factoryArtifact.deploy(units.address, key.address);
    console.log("- Factory Initialized");

    const pluginArtifact = await ethers.getContractFactory("QueuePlugin");
    plugin = await pluginArtifact.deploy(
      base.address,
      voter.address,
      [base.address],
      [base.address],
      treasury.address,
      factory.address,
      units.address,
      key.address,
      vaultFactory.address
    );
    console.log("- Plugin Initialized");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(
      units.address,
      factory.address,
      key.address,
      plugin.address,
      AddressZero
    );
    console.log("- Multicall Initialized");

    await units.setMinter(factory.address, true);
    await units.setMinter(plugin.address, true);
    await voter.setPlugin(plugin.address);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("User0 mints a clicker", async function () {
    console.log("******************************************************");
    await key.connect(user0).mint();
    await key.connect(user1).mint();
    await key.connect(user2).mint();
    await key.connect(user3).mint();
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
    price = await plugin.getPrice();

    await expect(
      plugin.connect(user0).click(1, "this is a message", {
        value: pointZeroOne,
      })
    ).to.be.revertedWith("Plugin__InvalidPayment");

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("Owner sets tools", async function () {
    console.log("******************************************************");
    await factory
      .connect(owner)
      .setTool(
        [
          ethers.utils.parseUnits("0.0000001", 18),
          ethers.utils.parseUnits("0.000001", 18),
          ethers.utils.parseUnits("0.000008", 18),
          ethers.utils.parseUnits("0.000047", 18),
          ethers.utils.parseUnits("0.00026", 18),
          ethers.utils.parseUnits("0.0014", 18),
        ],
        [
          ethers.utils.parseUnits("0.000015", 18),
          ethers.utils.parseUnits("0.0001", 18),
          ethers.utils.parseUnits("0.0011", 18),
          ethers.utils.parseUnits("0.012", 18),
          ethers.utils.parseUnits("0.13", 18),
          ethers.utils.parseUnits("1.4", 18),
        ]
      );
  });

  it("Owner sets tool multipliers", async function () {
    console.log("******************************************************");
    await factory.connect(owner).setToolMultipliers([
      "1000000000000000000", // 1
      "1150000000000000000", // 2
      "1322500000000000000", // 3
      "1520875000000000000", // 4
      "1749006250000000000", // 5
      "2011357187500000000", // 6
      "2313060768750000000", // 7
      "2660019884062500000", // 8
      "3059022867265625000", // 9
      "3517876297355468750", // 10
      "4045557736969289062",
      "4652391392514672421",
      "5350250105891873285",
      "6152787621674654277",
      "7075705764925852415",
      "8137061629665738723",
      "9357620874116591137",
      "10761264009734079868",
      "12375453609734181844",
      "14231771647954150830", // 20
      "16366537393147273455",
      "18821517902019348493",
      "21644745787322255767",
      "24891457556820594132",
      "28625176193143683252",
      "32918952612105216229",
      "37856795515121028664",
      "43535314841394182944",
      "50065612067598320385",
      "57575453877633198463", // 30
      "66211771960298198222",
      "76143537754252997955",
      "87565068417320947649",
      "10069982869941708939",
      "11580480300432965283",
      "13317552345497960076",
      "15315185197222654087",
      "17612462976706053100",
      "20254332423211961060",
      "23292482286663755219", // 40
    ]);
  });

  it("Owner sets power", async function () {
    console.log("******************************************************");
    await factory
      .connect(owner)
      .setPower([
        "0",
        "1000000000000000000",
        "2000000000000000000",
        "3000000000000000000",
      ]);
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 1);
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 claims units", async function () {
    console.log("******************************************************");
    await factory.connect(user0).claim(1);
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 5);
  });

  it("Owner sets levels", async function () {
    console.log("******************************************************");
    await factory
      .connect(owner)
      .setLvl(["0", "10", "50", "500"], [0, 1, 5, 25]);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradeTool(1, 0);
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 4);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradeTool(1, 0);
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Get id of owner", async function () {
    console.log("******************************************************");
    console.log(await key.tokenOfOwnerByIndex(user0.address, 0));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 3, 1);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 building id 1 costs", async function () {
    console.log("******************************************************");
    console.log(await factory.getMultipleToolCost(0, 10, 15));
    console.log(await multicall.getMultipleToolCost(1, 0, 5));
    console.log(await factory.getMultipleToolCost(0, 10, 27));
    console.log(await multicall.getMultipleToolCost(1, 0, 17));
  });

  it("Forward 8 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
    await network.provider.send("evm_mine");
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building1", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 1, 10);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building2", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 2, 10);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building3", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 3, 9);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building4", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 4, 10);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building5", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 5, 10);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 20);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 1, 10);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 1, 10);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 2, 8);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward 8 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 bakery state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 100 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [100]);
    await network.provider.send("evm_mine");
  });

  // im going to make user3 click with user1's key (id = 0)
  // this should increment user3's balance then try to decrement it later
  // it should cause a failure
  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    await plugin.connect(user3).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 600 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [100]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 100 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [100]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 100 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [100]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });
    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("View Queue", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueue());
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Count: ", await plugin.count());
  });

  it("Queue Data 2", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueueSize());
  });

  it("Queue Data 3", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueueFragment(0, 10));
  });

  it("Claim and distro from plugin", async function () {
    console.log("******************************************************");
    console.log("Treasury Balance: ", await base.balanceOf(treasury.address));
    await plugin.claimAndDistribute();
    console.log("Treasury Balance: ", await base.balanceOf(treasury.address));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 2, 12);
    await factory.connect(user0).purchaseTool(1, 3, 20);
    await factory.connect(user0).purchaseTool(1, 4, 20);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 5, 20);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("claim", async function () {
    console.log("******************************************************");
    await factory.claim(1);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("claim", async function () {
    console.log("******************************************************");
    await factory.claim(1);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 10);
    await factory.connect(user0).purchaseTool(1, 1, 10);
    await factory.connect(user0).purchaseTool(1, 2, 10);
    await factory.connect(user0).purchaseTool(1, 3, 10);
    await factory.connect(user0).purchaseTool(1, 4, 10);
    await factory.connect(user0).purchaseTool(1, 5, 10);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 4, 5)
    ).to.be.revertedWith("Factory__AmountMaxed");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 5, 5)
    ).to.be.revertedWith("Factory__AmountMaxed");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 6, 5)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 7, 1)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 7, 5)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 7, 5)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradeTool(1, 0);
    await factory.connect(user0).upgradeTool(1, 1);
    await factory.connect(user0).upgradeTool(1, 2);
    await factory.connect(user0).upgradeTool(1, 3);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await expect(factory.connect(user0).upgradeTool(1, 0)).to.be.revertedWith(
      "Factory__LevelMaxed"
    );
    await factory.connect(user0).upgradeTool(1, 1);
    await factory.connect(user0).upgradeTool(1, 2);
    await factory.connect(user0).upgradeTool(1, 3);
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await expect(factory.connect(user0).upgradeTool(1, 0)).to.be.revertedWith(
      "Factory__LevelMaxed"
    );
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 upgrades power", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradePower(1);
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user1).click(2, "this is a message", {
      value: price,
    });

    price = await plugin.getPrice();

    await plugin.connect(user2).click(3, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("Queue Data 2", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueueSize());
  });

  it("Forward 5 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [5 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("User0 upgrades power", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradePower(1);
  });

  it("User0 upgrades power", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradePower(1);
  });

  it("User0 upgrades power", async function () {
    console.log("******************************************************");
    await expect(factory.connect(user0).upgradePower(1)).to.be.revertedWith(
      "Factory__PowerMaxed"
    );
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  // queue data
  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();

    await plugin.connect(user0).click(1, "this is a message", {
      value: price,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });
});
