const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointZeroOne = convert("0.01", 18);
const one = convert("1", 18);

let owner, treasury, developer, user0, user1, user2, user3, user4, user5;
let base, voter;
let tech, plugin, multicall, vaultFactory;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, treasury, developer, user0, user1, user2, user3, user4, user5] =
      await ethers.getSigners();

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

    const techArtifact = await ethers.getContractFactory("BurnTardTech");
    tech = await techArtifact.deploy();
    console.log("- BurnTardTech Initialized");

    const pluginArtifact = await ethers.getContractFactory(
      "BurnTardTechPlugin"
    );
    plugin = await pluginArtifact.deploy(
      base.address,
      voter.address,
      [base.address],
      [base.address],
      vaultFactory.address,
      tech.address,
      treasury.address,
      developer.address
    );
    console.log("- Plugin Initialized");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(
      tech.address,
      plugin.address,
      await voter.OTOKEN()
    );
    console.log("- Multicall Initialized");

    await tech.initialize(plugin.address);
    await voter.setPlugin(plugin.address);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("First test", async function () {
    console.log("******************************************************");
  });

  it("Enroll at BurnTardTech", async function () {
    console.log("******************************************************");
    await expect(
      tech.enroll(user0.address, "ipfs0", { value: one })
    ).to.be.revertedWith("BurnTardTech__NotAdmitted");

    await tech.setAccountAdmissions([user0.address, user1.address], true);

    // Track plugin token balance before enrollment
    const userPluginTokenBalanceBefore = await plugin.balanceOf(user0.address);

    await tech.enroll(user0.address, "ipfs0", { value: one });

    // Check that user0's plugin balance increased by enrollment fee
    const userPluginTokenBalanceAfter = await plugin.balanceOf(user0.address);
    expect(userPluginTokenBalanceAfter).to.equal(
      userPluginTokenBalanceBefore.add(one)
    );

    // Track plugin token balance before second enrollment
    const user1PluginTokenBalanceBefore = await plugin.balanceOf(user1.address);

    await tech.enroll(user1.address, "ipfs1", { value: one });

    // Check that user1's plugin balance increased by enrollment fee
    const user1PluginTokenBalanceAfter = await plugin.balanceOf(user1.address);
    expect(user1PluginTokenBalanceAfter).to.equal(
      user1PluginTokenBalanceBefore.add(one)
    );
  });

  it("Plagiarize tokenid 0", async function () {
    console.log("******************************************************");
    let prevTuition = await tech.getCurrentTuition(0);
    let newTuition = await tech.getNextTuition(0);
    let surplus = newTuition.sub(prevTuition);

    console.log("Previous Tuition:", divDec(prevTuition));
    console.log("New Tuition:", divDec(newTuition));
    console.log("Surplus:", divDec(surplus));

    // Track ETH balances before
    const prevOwnerBalanceBefore = await user0.getBalance();
    const pluginBalanceBefore = await ethers.provider.getBalance(
      plugin.address
    );
    const creatorBalanceBefore = await user0.getBalance(); // In this case, creator is same as prev owner

    // Track plugin token balance before plagiarize
    const user2PluginTokenBalanceBefore = await plugin.balanceOf(user2.address);

    // Execute plagiarize
    expect(await tech.ownerOf(0)).to.equal(user0.address);
    await tech
      .connect(user2)
      .plagiarize(user2.address, 0, { value: newTuition });
    expect(await tech.ownerOf(0)).to.equal(user2.address);

    // Check distributions
    const prevOwnerBalanceAfter = await user0.getBalance();
    const pluginBalanceAfter = await ethers.provider.getBalance(plugin.address);
    const creatorBalanceAfter = await user0.getBalance();

    // Previous owner/creator should get: prevTuition + (surplus * 6/10)
    expect(prevOwnerBalanceAfter.sub(prevOwnerBalanceBefore)).to.equal(
      prevTuition.add(surplus.mul(6).div(10))
    );

    // Plugin should get: surplus * 4/10
    expect(pluginBalanceAfter.sub(pluginBalanceBefore)).to.equal(
      surplus.mul(4).div(10)
    );

    // Check that user2's plugin balance increased by tuition amount
    const user2PluginTokenBalanceAfter = await plugin.balanceOf(user2.address);
    expect(user2PluginTokenBalanceAfter).to.equal(
      user2PluginTokenBalanceBefore.add(newTuition)
    );
  });

  it("Plagiarize tokenid 0 again - test creator rewards", async function () {
    console.log("******************************************************");
    let prevTuition = await tech.getCurrentTuition(0);
    let newTuition = await tech.getNextTuition(0);
    let surplus = newTuition.sub(prevTuition);

    console.log("Previous Tuition:", divDec(prevTuition));
    console.log("New Tuition:", divDec(newTuition));
    console.log("Surplus:", divDec(surplus));

    // Track ETH balances before
    const prevOwnerBalanceBefore = await user2.getBalance(); // user2 is previous owner
    const pluginBalanceBefore = await ethers.provider.getBalance(
      plugin.address
    );
    const creatorBalanceBefore = await user0.getBalance(); // user0 is creator

    // Track plugin token balance before plagiarize
    const user3PluginTokenBalanceBefore = await plugin.balanceOf(user3.address);

    // Execute plagiarize
    expect(await tech.ownerOf(0)).to.equal(user2.address);
    await tech
      .connect(user3)
      .plagiarize(user3.address, 0, { value: newTuition });
    expect(await tech.ownerOf(0)).to.equal(user3.address);

    // Check distributions
    const prevOwnerBalanceAfter = await user2.getBalance();
    const pluginBalanceAfter = await ethers.provider.getBalance(plugin.address);
    const creatorBalanceAfter = await user0.getBalance();

    // Previous owner should get: prevTuition + (surplus * 4/10)
    expect(prevOwnerBalanceAfter.sub(prevOwnerBalanceBefore)).to.equal(
      prevTuition.add(surplus.mul(4).div(10))
    );

    // Plugin should get: surplus * 4/10
    expect(pluginBalanceAfter.sub(pluginBalanceBefore)).to.equal(
      surplus.mul(4).div(10)
    );

    // Creator should get: surplus * 2/10
    expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
      surplus.mul(2).div(10)
    );

    // Check that user3's plugin balance increased by tuition amount
    const user3PluginTokenBalanceAfter = await plugin.balanceOf(user3.address);
    expect(user3PluginTokenBalanceAfter).to.equal(
      user3PluginTokenBalanceBefore.add(newTuition)
    );
  });

  it("owner steals for user0 from user3", async function () {
    console.log("******************************************************");
    let prevTuition = await tech.getCurrentTuition(0);
    let newTuition = await tech.getNextTuition(0);
    let surplus = newTuition.sub(prevTuition);

    console.log("Previous Tuition:", divDec(prevTuition));
    console.log("New Tuition:", divDec(newTuition));
    console.log("Surplus:", divDec(surplus));

    // Track ETH balances before
    const prevOwnerBalanceBefore = await user3.getBalance(); // user3 is previous owner
    const pluginBalanceBefore = await ethers.provider.getBalance(
      plugin.address
    );
    const creatorBalanceBefore = await user0.getBalance(); // user0 is creator and new owner

    // Track plugin token balance before plagiarize
    const user3PluginTokenBalanceBefore = await plugin.balanceOf(user3.address);

    // Execute plagiarize
    expect(await tech.ownerOf(0)).to.equal(user3.address);
    await tech
      .connect(owner)
      .plagiarize(user0.address, 0, { value: newTuition });
    expect(await tech.ownerOf(0)).to.equal(user0.address);

    // Check distributions
    const prevOwnerBalanceAfter = await user3.getBalance();
    const pluginBalanceAfter = await ethers.provider.getBalance(plugin.address);
    const creatorBalanceAfter = await user0.getBalance();

    // Previous owner (user3) should get: prevTuition + (surplus * 4/10)
    expect(prevOwnerBalanceAfter.sub(prevOwnerBalanceBefore)).to.equal(
      prevTuition.add(surplus.mul(4).div(10))
    );

    // Plugin should get: surplus * 4/10
    expect(pluginBalanceAfter.sub(pluginBalanceBefore)).to.equal(
      surplus.mul(4).div(10)
    );

    // Creator (user0) should get: surplus * 2/10
    expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
      surplus.mul(2).div(10)
    );

    // Check that user3's plugin balance decreased by tuition amount
    const user3PluginTokenBalanceAfter = await plugin.balanceOf(user3.address);
    expect(user3PluginTokenBalanceAfter).to.equal(
      user3PluginTokenBalanceBefore.sub(prevTuition)
    );
  });

  it("User3 plagiarizes tokenid 1 and expels it", async function () {
    console.log("******************************************************");
    // First, user3 plagiarizes from user1
    let tokenId = 1; // user1's NFT
    let prevTuition = await tech.getCurrentTuition(tokenId);
    let newTuition = await tech.getNextTuition(tokenId);
    let surplus = newTuition.sub(prevTuition);

    console.log("Previous Tuition:", divDec(prevTuition));
    console.log("New Tuition:", divDec(newTuition));
    console.log("Surplus:", divDec(surplus));

    // Track ETH balances before plagiarize
    const prevOwnerBalanceBefore = await user1.getBalance(); // user1 is previous owner
    const pluginEthBalanceBefore = await ethers.provider.getBalance(
      plugin.address
    );
    const creatorBalanceBefore = await user1.getBalance(); // user1 is also creator

    // Track plugin token balance before plagiarize
    const user1PluginTokenBalanceBefore = await plugin.balanceOf(user1.address);

    // Execute plagiarize
    expect(await tech.ownerOf(tokenId)).to.equal(user1.address);
    await tech
      .connect(user3)
      .plagiarize(user3.address, tokenId, { value: newTuition });
    expect(await tech.ownerOf(tokenId)).to.equal(user3.address);

    // Check plagiarize distributions
    const prevOwnerBalanceAfter = await user1.getBalance();
    const pluginEthBalanceAfter = await ethers.provider.getBalance(
      plugin.address
    );
    const creatorBalanceAfter = await user1.getBalance();

    // Previous owner/creator (user1) should get: prevTuition + (surplus * 6/10)
    expect(prevOwnerBalanceAfter.sub(prevOwnerBalanceBefore)).to.equal(
      prevTuition.add(surplus.mul(6).div(10))
    );

    // Plugin should get: surplus * 4/10
    expect(pluginEthBalanceAfter.sub(pluginEthBalanceBefore)).to.equal(
      surplus.mul(4).div(10)
    );

    // Store classSize and plugin balance before expel
    const classSizeBefore = await tech.classSize();
    const pluginBalanceBeforeExpel = await ethers.provider.getBalance(
      plugin.address
    );

    // Store user3's plugin balance before expel
    const userPluginTokenBalanceBeforeExpel = await plugin.balanceOf(
      user3.address
    );

    // Now expel the NFT
    const balanceBeforeExpel = await user3.getBalance();

    const expelTx = await tech.connect(user3).expel(tokenId);
    const expelReceipt = await expelTx.wait();
    const expelGasCost = expelReceipt.gasUsed.mul(expelTx.gasPrice);

    const balanceAfterExpel = await user3.getBalance();

    // Check expel results
    expect(await tech.id_Expelled(tokenId)).to.be.true;

    // Check user3's ETH balance change (should just be gas costs)
    expect(balanceAfterExpel.sub(balanceBeforeExpel)).to.equal(
      expelGasCost.mul(-1)
    );

    // Check that classSize increased
    const classSizeAfter = await tech.classSize();
    expect(classSizeAfter).to.equal(classSizeBefore.add(1));

    // Check that user3's plugin balance decreased by the tuition amount
    const userPluginTokenBalanceAfterExpel = await plugin.balanceOf(
      user3.address
    );
    expect(userPluginTokenBalanceAfterExpel).to.equal(
      userPluginTokenBalanceBeforeExpel.sub(newTuition)
    );

    // Check that user1's plugin balance decreased by tuition amount
    const user1PluginTokenBalanceAfter = await plugin.balanceOf(user1.address);
    expect(user1PluginTokenBalanceAfter).to.equal(
      user1PluginTokenBalanceBefore.sub(prevTuition)
    );

    // Try to plagiarize expelled NFT (should fail)
    await expect(
      tech
        .connect(user0)
        .plagiarize(user0.address, tokenId, { value: newTuition })
    ).to.be.revertedWith("BurnTardTech__WorksExpelled");
  });

  it("User1 enrolls a new meme after expulsion", async function () {
    console.log("******************************************************");

    // Track plugin token balance before enrollment
    const user1PluginTokenBalanceBefore = await plugin.balanceOf(user1.address);

    await expect(
      tech.enroll(user1.address, "ipfs2", { value: one })
    ).to.be.revertedWith("BurnTardTech__NotAdmitted");

    await expect(
      tech.connect(user1).setAccountAdmissions([user1.address], true)
    ).to.be.reverted;

    await tech.connect(owner).setAccountAdmissions([user1.address], true);

    await tech.enroll(user1.address, "ipfs2", { value: one });

    // Check that user1's plugin balance increased by enrollment fee
    const user1PluginTokenBalanceAfter = await plugin.balanceOf(user1.address);
    expect(user1PluginTokenBalanceAfter).to.equal(
      user1PluginTokenBalanceBefore.add(one)
    );

    // Verify the new token exists and belongs to user1
    const newTokenId = 2; // Should be token ID 2 since it's the third token minted
    expect(await tech.ownerOf(newTokenId)).to.equal(user1.address);
  });

  it("View student state for user2", async function () {
    console.log("\n******************************************************");
    console.log("STUDENT STATE FOR:", user2.address);
    console.log("******************************************************");

    const studentState = await multicall.getStudent(user2.address);

    console.log("\nBasic Info:");
    console.log("- Address:", studentState.studentAddress);
    console.log("- Is Admitted:", studentState.isAdmitted);
    console.log("- Works Owned:", studentState.worksOwned.toString());
    console.log(
      "- Owned Work IDs:",
      studentState.ownedWorkIds.map((id) => id.toString())
    );

    console.log("\nStaking & Rewards:");
    console.log(
      "- Total Value Staked:",
      divDec(studentState.totalValueStaked),
      "ETH"
    );
    console.log("- Gauge Balance:", divDec(studentState.gaugeBalance));
    console.log("- Gauge Total Supply:", divDec(studentState.gaugeTotalSupply));
    console.log("- Reward Per Token:", divDec(studentState.rewardPerToken));
    console.log(
      "- Unclaimed Rewards:",
      divDec(studentState.rewardsEarned),
      "oBERO"
    );
    console.log("- oBERO Balance:", divDec(studentState.oBeroBalance), "oBERO");

    // Optional: Print details of each owned work
    if (studentState.worksOwned > 0) {
      console.log("\nOwned Works Details:");
      for (let i = 0; i < studentState.ownedWorkIds.length; i++) {
        const workId = studentState.ownedWorkIds[i];
        const workState = await multicall.getWork(workId);
        console.log(`\nWork #${workId}:`);
        console.log(
          "- Current Tuition:",
          divDec(workState.currentTuition),
          "ETH"
        );
        console.log("- Next Tuition:", divDec(workState.nextTuition), "ETH");
        console.log(
          "- Time Since Last Plagiarism:",
          workState.timeSinceLastPlagiarism.toString(),
          "seconds"
        );
        console.log("- Creator:", workState.creator);
        console.log("- Graduated:", workState.isGraduated);
        console.log("- Expelled:", workState.isExpelled);
        console.log("- Can Graduate:", workState.canGraduate);
      }
    }
  });

  it("View student state for zero address", async function () {
    console.log("\n******************************************************");
    console.log(
      "STUDENT STATE FOR: 0x0000000000000000000000000000000000000000"
    );
    console.log("******************************************************");

    try {
      const studentState = await multicall.getStudent(
        "0x0000000000000000000000000000000000000000"
      );

      console.log("\nBasic Info:");
      console.log("- Address:", studentState.studentAddress);
      console.log("- Is Admitted:", studentState.isAdmitted);
      console.log("- Works Owned:", studentState.worksOwned.toString());
      console.log(
        "- Owned Work IDs:",
        studentState.ownedWorkIds.map((id) => id.toString())
      );

      console.log("\nStaking & Rewards:");
      console.log(
        "- Total Value Staked:",
        divDec(studentState.totalValueStaked),
        "ETH"
      );
      console.log("- Gauge Balance:", divDec(studentState.gaugeBalance));
      console.log(
        "- Gauge Total Supply:",
        divDec(studentState.gaugeTotalSupply)
      );
      console.log("- Reward Per Token:", divDec(studentState.rewardPerToken));
      console.log(
        "- Unclaimed Rewards:",
        divDec(studentState.rewardsEarned),
        "oBERO"
      );
      console.log(
        "- oBERO Balance:",
        divDec(studentState.oBeroBalance),
        "oBERO"
      );
    } catch (error) {
      console.log("\nError encountered:");
      console.log(error.message);
    }
  });

  it("View work state for token ID 0", async function () {
    console.log("\n******************************************************");
    console.log("WORK STATE FOR TOKEN ID: 0");
    console.log("******************************************************");

    try {
      const workState = await multicall.getWork(0);

      console.log("\nWork Details:");
      console.log("- Token ID:", workState.tokenId.toString());
      console.log(
        "- Current Tuition:",
        divDec(workState.currentTuition),
        "ETH"
      );
      console.log("- Next Tuition:", divDec(workState.nextTuition), "ETH");
      console.log(
        "- Last Plagiarized:",
        new Date(workState.lastPlagiarized * 1000).toLocaleString()
      );
      console.log(
        "- Time Since Last Plagiarism:",
        Math.floor(workState.timeSinceLastPlagiarism / 3600),
        "hours",
        Math.floor((workState.timeSinceLastPlagiarism % 3600) / 60),
        "minutes"
      );

      console.log("\nOwnership:");
      console.log("- Current Owner:", workState.currentOwner);
      console.log("- Creator:", workState.creator);
      console.log("- URI:", workState.uri);

      console.log("\nStatus:");
      console.log("- Graduated:", workState.isGraduated);
      console.log("- Expelled:", workState.isExpelled);
      console.log("- Can Graduate:", workState.canGraduate);
    } catch (error) {
      console.log("\nError encountered:");
      console.log(error.message);
    }
  });

  it("View class state", async function () {
    console.log("\n******************************************************");
    console.log("CLASS STATE");
    console.log("******************************************************");

    try {
      const classState = await multicall.getClass();

      console.log("\nClass Size:");
      console.log(
        "- Current Class Size:",
        classState.currentClassSize.toString()
      );
      console.log("- Maximum Class Size:", classState.maxClassSize.toString());
      console.log("- Total Works Created:", classState.nextTokenId.toString());

      console.log("\nTuition Info:");
      console.log(
        "- Initial Tuition:",
        divDec(classState.initialTuition),
        "ETH"
      );
      console.log(
        "- Graduation Requirement:",
        divDec(classState.graduationRequirement),
        "ETH"
      );

      console.log("\nAdmissions:");
      console.log("- Open Admissions:", classState.isOpenAdmissions);

      console.log("\nValue Locked:");
      console.log(
        "- Total Value Locked:",
        divDec(classState.totalValueLocked),
        "ETH"
      );
    } catch (error) {
      console.log("\nError encountered:");
      console.log(error.message);
    }
  });
});
