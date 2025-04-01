const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointZeroOne = convert("0.01", 18);
const one = convert("1", 18);
const five = convert("5", 18);
const seven = convert("7", 18);

let owner,
  treasury,
  developer,
  user0,
  user1,
  user2,
  user3,
  user4,
  user5,
  user6,
  user7,
  user8,
  user9;
let base, voter;
let tech, plugin, multicall, vaultFactory;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [
      owner,
      treasury,
      developer,
      user0,
      user1,
      user2,
      user3,
      user4,
      user5,
      user6,
      user7,
      user8,
      user9,
    ] = await ethers.getSigners();

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

  it("NFTs should not be transferrable under any circumstances", async function () {
    console.log("\n******************************************************");
    console.log("TESTING NFT TRANSFER RESTRICTIONS");
    console.log("******************************************************");

    const tokenId = 0;
    const workState = await multicall.getWork(tokenId);
    const owner = await ethers.getSigner(workState.currentOwner);

    console.log("\nWork State:");
    console.log("- Token ID:", tokenId);
    console.log("- Current Owner:", workState.currentOwner);
    console.log("- Is Graduated:", workState.isGraduated);

    console.log("\nTesting transfer scenarios...");

    // 1. Try transferFrom
    console.log("\n1. Testing transferFrom:");
    try {
      await tech
        .connect(owner)
        .transferFrom(workState.currentOwner, user1.address, tokenId);
      console.log("❌ transferFrom succeeded when it should have failed");
    } catch (error) {
      console.log("✅ transferFrom failed as expected:");
      console.log(error.message);
    }

    // 2. Try safeTransferFrom without data
    console.log("\n2. Testing safeTransferFrom (no data):");
    try {
      await tech
        .connect(owner)
        ["safeTransferFrom(address,address,uint256)"](
          workState.currentOwner,
          user1.address,
          tokenId
        );
      console.log("❌ safeTransferFrom succeeded when it should have failed");
    } catch (error) {
      console.log("✅ safeTransferFrom failed as expected:");
      console.log(error.message);
    }

    // 3. Try safeTransferFrom with data
    console.log("\n3. Testing safeTransferFrom (with data):");
    try {
      await tech
        .connect(owner)
        ["safeTransferFrom(address,address,uint256,bytes)"](
          workState.currentOwner,
          user1.address,
          tokenId,
          "0x"
        );
      console.log(
        "❌ safeTransferFrom with data succeeded when it should have failed"
      );
    } catch (error) {
      console.log("✅ safeTransferFrom with data failed as expected:");
      console.log(error.message);
    }

    // 4. Try approve and transfer
    console.log("\n4. Testing approve and transfer:");
    try {
      await tech.connect(owner).approve(user1.address, tokenId);
      await tech
        .connect(user1)
        .transferFrom(workState.currentOwner, user1.address, tokenId);
      console.log(
        "❌ approve and transfer succeeded when it should have failed"
      );
    } catch (error) {
      console.log("✅ approve and transfer failed as expected:");
      console.log(error.message);
    }

    // Verify owner hasn't changed
    const finalOwner = await tech.ownerOf(tokenId);
    console.log("\nFinal ownership check:");
    console.log("- Original Owner:", workState.currentOwner);
    console.log("- Current Owner:", finalOwner);
    console.log(
      "- Ownership Unchanged:",
      finalOwner === workState.currentOwner ? "✅" : "❌"
    );
  });

  it("Plagiarize tokenid 0", async function () {
    console.log("******************************************************");
    let prevTuition = await tech.id_Tuition(0);
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
    let prevTuition = await tech.id_Tuition(0);
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
    let prevTuition = await tech.id_Tuition(0);
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
    let prevTuition = await tech.id_Tuition(tokenId);
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

  it("Plagiarize tokenid 0", async function () {
    console.log("******************************************************");
    let prevTuition = await tech.id_Tuition(0);
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
    for (let i = 0; i < 20; i++) {
      let newTuition = await tech.getNextTuition(0);
      await tech
        .connect(user0)
        .plagiarize(user0.address, 0, { value: newTuition });
      console.log("Current Tuition: ", divDec(await tech.id_Tuition(0)));
      console.log("Next Tuition: ", divDec(await tech.getNextTuition(0)));
      console.log();
    }
  });

  it("Attempt to graduate token 0 (should fail)", async function () {
    console.log("\n******************************************************");
    console.log("ATTEMPTING EARLY GRADUATION FOR TOKEN ID 0");
    console.log("******************************************************");

    const workState = await multicall.getWork(0);

    console.log("\nCurrent Work State:");
    console.log("- Current Tuition:", divDec(workState.currentTuition), "ETH");
    console.log(
      "- Credit Requirement:",
      divDec(await tech.creditRequirement()),
      "ETH"
    );
    console.log(
      "- Time Requirement:",
      (await tech.timeRequirement()).toString(),
      "seconds"
    );
    console.log(
      "- Time Since Last Plagiarism:",
      workState.timeSinceLastPlagiarism.toString(),
      "seconds"
    );
    console.log("- Can Graduate:", workState.canGraduate);
    console.log("- Current Owner:", workState.currentOwner);

    try {
      console.log("\nAttempting to graduate...");
      await tech
        .connect(await ethers.getSigner(workState.currentOwner))
        .graduate(0);
      console.log("❌ Graduation succeeded when it should have failed");
    } catch (error) {
      console.log("✅ Graduation failed as expected");
      console.log("Error:", error.message);
    }
  });

  it("Plagiarize tokenid 0 again - test creator rewards", async function () {
    console.log("******************************************************");
    for (let i = 0; i < 1; i++) {
      let newTuition = await tech.getNextTuition(0);
      await tech
        .connect(user0)
        .plagiarize(user0.address, 0, { value: newTuition });
      console.log("Current Tuition: ", divDec(await tech.id_Tuition(0)));
      console.log("Next Tuition: ", divDec(await tech.getNextTuition(0)));
      console.log();
    }
  });

  it("Graduate token 0 (should fail due to time requirement)", async function () {
    console.log("\n******************************************************");
    console.log("ATTEMPTING GRADUATION (Should fail - time requirement)");
    console.log("******************************************************");

    const workState = await multicall.getWork(0);
    const owner = await ethers.getSigner(workState.currentOwner);

    console.log("\nPre-Graduation State:");
    console.log("- Current Tuition:", divDec(workState.currentTuition), "ETH");
    console.log(
      "- Credit Requirement:",
      divDec(await tech.creditRequirement()),
      "ETH"
    );
    console.log(
      "- Time Requirement:",
      (await tech.timeRequirement()).toString(),
      "seconds"
    );
    console.log(
      "- Time Since Last Plagiarism:",
      workState.timeSinceLastPlagiarism.toString(),
      "seconds"
    );
    console.log("- Can Graduate:", workState.canGraduate);

    try {
      console.log("\nAttempting graduation (should fail)...");
      await tech.connect(owner).graduate(0);
      console.log("❌ Graduation succeeded when it should have failed");
    } catch (error) {
      console.log("✅ Graduation failed as expected due to time requirement");
      console.log("Error:", error.message);
    }
  });

  it("Graduate token 0 (should succeed after waiting)", async function () {
    console.log("\n******************************************************");
    console.log("GRADUATING AFTER TIME REQUIREMENT");
    console.log("******************************************************");

    // Forward time 24 hours
    console.log("\nForwarding time 24 hours...");
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    const workState = await multicall.getWork(0);
    const owner = await ethers.getSigner(workState.currentOwner);

    console.log("\nPre-Graduation State:");
    console.log("- Current Tuition:", divDec(workState.currentTuition), "ETH");
    console.log(
      "- Credit Requirement:",
      divDec(await tech.creditRequirement()),
      "ETH"
    );
    console.log(
      "- Time Requirement:",
      (await tech.timeRequirement()).toString(),
      "seconds"
    );
    console.log(
      "- Time Since Last Plagiarism:",
      workState.timeSinceLastPlagiarism.toString(),
      "seconds"
    );
    console.log("- Can Graduate:", workState.canGraduate);

    // Track plugin balances before graduation
    const ownerPluginBalanceBefore = await plugin.balanceOf(
      workState.currentOwner
    );
    const creatorPluginBalanceBefore = await plugin.balanceOf(
      workState.creator
    );

    try {
      console.log("\nExecuting graduation...");
      await tech.connect(owner).graduate(0);

      const graduatedState = await multicall.getWork(0);
      console.log("\nPost-Graduation State:");
      console.log("- Is Graduated:", graduatedState.isGraduated);
      console.log(
        "- Final Tuition:",
        divDec(graduatedState.currentTuition),
        "ETH"
      );

      // Check plugin balance changes
      const ownerPluginBalanceAfter = await plugin.balanceOf(
        workState.currentOwner
      );
      const creatorPluginBalanceAfter = await plugin.balanceOf(
        workState.creator
      );

      console.log("\nPlugin Balance Changes:");
      console.log("Owner:", workState.currentOwner);
      console.log("- Before:", divDec(ownerPluginBalanceBefore), "ETH");
      console.log("- After:", divDec(ownerPluginBalanceAfter), "ETH");
      console.log(
        "- Change:",
        divDec(ownerPluginBalanceAfter.sub(ownerPluginBalanceBefore)),
        "ETH"
      );

      console.log("\nCreator:", workState.creator);
      console.log("- Before:", divDec(creatorPluginBalanceBefore), "ETH");
      console.log("- After:", divDec(creatorPluginBalanceAfter), "ETH");
      console.log(
        "- Change:",
        divDec(creatorPluginBalanceAfter.sub(creatorPluginBalanceBefore)),
        "ETH"
      );

      console.log("\n✅ Graduation succeeded after time requirement met!");
    } catch (error) {
      console.log("\n❌ Graduation failed unexpectedly");
      console.log("Error:", error.message);
    }
  });

  it("View student record for user0", async function () {
    console.log("\n******************************************************");
    console.log("STUDENT RECORD FOR USER0");
    console.log("******************************************************");

    const studentState = await multicall.getStudent(user0.address);

    console.log("\nBasic Info:");
    console.log("- Address:", user0.address);
    console.log("- Is Admitted:", studentState.isAdmitted);
    console.log("- Works Owned:", studentState.worksOwned.toString());

    if (studentState.worksOwned > 0) {
      console.log("\nOwned Works:");
      for (let i = 0; i < studentState.ownedWorkIds.length; i++) {
        const workId = studentState.ownedWorkIds[i];
        const workState = await multicall.getWork(workId);
        console.log(`\nWork #${workId}:`);
        console.log(
          "- Current Tuition:",
          divDec(workState.currentTuition),
          "ETH"
        );
        console.log("- Creator:", workState.creator);
        console.log("- Is Graduated:", workState.isGraduated);
        console.log("- Is Expelled:", workState.isExpelled);
        console.log(
          "- Last Plagiarized:",
          new Date(workState.lastPlagiarized * 1000).toLocaleString()
        );
        console.log("- Can Graduate:", workState.canGraduate);
        if (!workState.isGraduated && !workState.isExpelled) {
          console.log(
            "- Time Until Graduation Eligible:",
            Math.max(
              0,
              (await tech.timeRequirement())
                .sub(workState.timeSinceLastPlagiarism)
                .toNumber()
            ),
            "seconds"
          );
        }
      }
    }

    console.log("\nStaking & Rewards:");
    console.log(
      "- Total Value Staked:",
      divDec(studentState.totalValueStaked),
      "ETH"
    );
    console.log("- Gauge Balance:", divDec(studentState.gaugeBalance));
    console.log("- Reward Per Token:", divDec(studentState.rewardPerToken));
    console.log(
      "- Unclaimed Rewards:",
      divDec(studentState.rewardsEarned),
      "oBERO"
    );
    console.log("- oBERO Balance:", divDec(studentState.oBeroBalance), "oBERO");
  });

  it("Cannot graduate or plagiarize already graduated work", async function () {
    console.log("\n******************************************************");
    console.log("ATTEMPTING OPERATIONS ON GRADUATED WORK (TOKEN 0)");
    console.log("******************************************************");

    const workState = await multicall.getWork(0);
    console.log("\nWork State:");
    console.log("- Is Graduated:", workState.isGraduated);
    console.log("- Current Tuition:", divDec(workState.currentTuition), "ETH");

    // Try to graduate again
    console.log("\nAttempting to graduate again...");
    try {
      await tech
        .connect(await ethers.getSigner(workState.currentOwner))
        .graduate(0);
      console.log("❌ Second graduation succeeded when it should have failed");
    } catch (error) {
      console.log("✅ Second graduation failed as expected:");
      console.log(error.message);
    }

    // Try to plagiarize
    console.log("\nAttempting to plagiarize graduated work...");
    try {
      await tech
        .connect(user1)
        .plagiarize(user1.address, 0, { value: workState.nextTuition });
      console.log("❌ Plagiarism succeeded when it should have failed");
    } catch (error) {
      console.log("✅ Plagiarism failed as expected:");
      console.log(error.message);
    }
  });

  it("Cannot expel graduated work", async function () {
    console.log("\n******************************************************");
    console.log("TESTING THAT GRADUATED WORKS CANNOT BE EXPELLED");
    console.log("******************************************************");

    const workState = await multicall.getWork(0);

    console.log("\nInitial Work State:");
    console.log("- Token ID: 0");
    console.log("- Is Graduated:", workState.isGraduated);
    console.log("- Is Expelled:", workState.isExpelled);
    console.log("- Current Tuition:", divDec(workState.currentTuition), "ETH");
    console.log("- Owner:", workState.currentOwner);

    // Track plugin balances before expulsion
    const ownerPluginBalanceBefore = await plugin.balanceOf(
      workState.currentOwner
    );
    const creatorPluginBalanceBefore = await plugin.balanceOf(
      workState.creator
    );

    console.log("\nPlugin Balances Before:");
    console.log("- Owner Balance:", divDec(ownerPluginBalanceBefore), "ETH");
    console.log(
      "- Creator Balance:",
      divDec(creatorPluginBalanceBefore),
      "ETH"
    );

    console.log("\nAttempting expulsion...");
    try {
      // Get the owner of token 0 and try to expel with them
      const owner = await ethers.getSigner(workState.currentOwner);
      await tech.connect(owner).expel(0);

      const expelledState = await multicall.getWork(0);
      console.log("\nPost-Expulsion State:");
      console.log("- Is Graduated:", expelledState.isGraduated);
      console.log("- Is Expelled:", expelledState.isExpelled);
      console.log(
        "- Current Tuition:",
        divDec(expelledState.currentTuition),
        "ETH"
      );

      // Check if plugin balances changed
      const ownerPluginBalanceAfter = await plugin.balanceOf(
        workState.currentOwner
      );
      const creatorPluginBalanceAfter = await plugin.balanceOf(
        workState.creator
      );

      console.log("\nPlugin Balances After:");
      console.log("- Owner Balance:", divDec(ownerPluginBalanceAfter), "ETH");
      console.log(
        "- Creator Balance:",
        divDec(creatorPluginBalanceAfter),
        "ETH"
      );
      console.log(
        "- Owner Balance Changed:",
        !ownerPluginBalanceAfter.eq(ownerPluginBalanceBefore)
      );
      console.log(
        "- Creator Balance Changed:",
        !creatorPluginBalanceAfter.eq(creatorPluginBalanceBefore)
      );
    } catch (error) {
      if (error.message.includes("BurnTardTech__WorksGraduated")) {
        console.log(
          "\n✅ Expulsion correctly failed: Cannot expel graduated work"
        );
      } else {
        console.log("\n❌ Expulsion failed for unexpected reason:");
        console.log(error.message);
      }
    }
  });

  it("Owner modifies contract parameters", async function () {
    console.log("\n******************************************************");
    console.log("MODIFYING CONTRACT PARAMETERS");
    console.log("******************************************************");

    // Get initial values
    const initialState = {
      openAdmissions: await tech.openAdmissions(),
      initialTuition: await tech.initialTuition(),
      timeRequirement: await tech.timeRequirement(),
      creditRequirement: await tech.creditRequirement(),
    };

    console.log("\nInitial Parameters:");
    console.log("- Open Admissions:", initialState.openAdmissions);
    console.log(
      "- Initial Tuition:",
      divDec(initialState.initialTuition),
      "ETH"
    );
    console.log(
      "- Time Requirement:",
      initialState.timeRequirement.toString(),
      "seconds"
    );
    console.log(
      "- Credit Requirement:",
      divDec(initialState.creditRequirement),
      "ETH"
    );

    console.log("\nAttempting parameter modifications...");

    // Set open admissions
    try {
      await tech.connect(owner).setOpenAdmissions(true);
      console.log("\n✅ Set openAdmissions to true");
    } catch (error) {
      console.log("\n❌ Failed to set openAdmissions:");
      console.log(error.message);
    }

    // Set initial tuition
    try {
      const fiveEth = ethers.utils.parseEther("5.0");
      console.log("\nSetting initial tuition to:", divDec(fiveEth), "ETH");
      await tech.connect(owner).setInitialTuition(fiveEth);
      const newInitialTuition = await tech.initialTuition();
      console.log("New initial tuition:", divDec(newInitialTuition), "ETH");
      console.log(
        fiveEth.eq(newInitialTuition)
          ? "✅ Initial tuition set successfully"
          : "❌ Initial tuition not set correctly"
      );
    } catch (error) {
      console.log("\n❌ Failed to set initialTuition:");
      console.log(error.message);
    }

    // Set time requirement
    try {
      await tech.connect(owner).setTimeRequirement(0);
      console.log("\n✅ Set timeRequirement to 0");
    } catch (error) {
      console.log("\n❌ Failed to set timeRequirement:");
      console.log(error.message);
    }

    // Set credit requirement
    try {
      const sevenEth = ethers.utils.parseEther("7.0");
      console.log("\nSetting credit requirement to:", divDec(sevenEth), "ETH");
      await tech.connect(owner).setCreditRequirement(sevenEth);
      const newCreditRequirement = await tech.creditRequirement();
      console.log(
        "New credit requirement:",
        divDec(newCreditRequirement),
        "ETH"
      );
      console.log(
        sevenEth.eq(newCreditRequirement)
          ? "✅ Credit requirement set successfully"
          : "❌ Credit requirement not set correctly"
      );
    } catch (error) {
      console.log("\n❌ Failed to set creditRequirement:");
      console.log(error.message);
    }

    // Final state check
    const finalState = {
      openAdmissions: await tech.openAdmissions(),
      initialTuition: await tech.initialTuition(),
      timeRequirement: await tech.timeRequirement(),
      creditRequirement: await tech.creditRequirement(),
    };

    console.log("\nFinal Parameters:");
    console.log("- Open Admissions:", finalState.openAdmissions);
    console.log("- Initial Tuition:", divDec(finalState.initialTuition), "ETH");
    console.log(
      "- Time Requirement:",
      finalState.timeRequirement.toString(),
      "seconds"
    );
    console.log(
      "- Credit Requirement:",
      divDec(finalState.creditRequirement),
      "ETH"
    );
  });

  it("Non-owners attempt to modify contract parameters (should fail)", async function () {
    console.log("\n******************************************************");
    console.log("UNAUTHORIZED PARAMETER MODIFICATION ATTEMPTS");
    console.log("******************************************************");

    const attackers = [user0, user1, user2];

    for (const attacker of attackers) {
      console.log(`\nAttempts by ${attacker.address}:`);

      // Try to set open admissions
      try {
        await tech.connect(attacker).setOpenAdmissions(true);
        console.log(
          "❌ setOpenAdmissions succeeded when it should have failed"
        );
      } catch (error) {
        console.log("✅ setOpenAdmissions failed as expected:");
        console.log(error.message);
      }

      // Try to set initial tuition
      try {
        await tech
          .connect(attacker)
          .setInitialTuition(ethers.utils.parseEther("5.0"));
        console.log(
          "❌ setInitialTuition succeeded when it should have failed"
        );
      } catch (error) {
        console.log("✅ setInitialTuition failed as expected:");
        console.log(error.message);
      }

      // Try to set time requirement
      try {
        await tech.connect(attacker).setTimeRequirement(0);
        console.log(
          "❌ setTimeRequirement succeeded when it should have failed"
        );
      } catch (error) {
        console.log("✅ setTimeRequirement failed as expected:");
        console.log(error.message);
      }

      // Try to set credit requirement
      try {
        await tech
          .connect(attacker)
          .setCreditRequirement(ethers.utils.parseEther("7.0"));
        console.log(
          "❌ setCreditRequirement succeeded when it should have failed"
        );
      } catch (error) {
        console.log("✅ setCreditRequirement failed as expected:");
        console.log(error.message);
      }
    }

    // Verify no parameters were changed
    const finalState = {
      openAdmissions: await tech.openAdmissions(),
      initialTuition: await tech.initialTuition(),
      timeRequirement: await tech.timeRequirement(),
      creditRequirement: await tech.creditRequirement(),
    };

    console.log("\nFinal Parameters (should be unchanged):");
    console.log("- Open Admissions:", finalState.openAdmissions);
    console.log("- Initial Tuition:", divDec(finalState.initialTuition), "ETH");
    console.log(
      "- Time Requirement:",
      finalState.timeRequirement.toString(),
      "seconds"
    );
    console.log(
      "- Credit Requirement:",
      divDec(finalState.creditRequirement),
      "ETH"
    );
  });

  it("Fill class to maximum capacity", async function () {
    console.log("\n******************************************************");
    console.log("FILLING CLASS TO MAXIMUM CAPACITY");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const currentSize = await tech.nextTokenId();
    const initialTuition = await tech.initialTuition();

    console.log("\nClass Size Info:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Current Size (nextTokenId):", currentSize.toString());
    console.log("- Spots Available:", classSize.sub(currentSize).toString());
    console.log("- Initial Tuition Required:", divDec(initialTuition), "ETH");

    // Array of users to enroll (we'll use all available test accounts)
    const potentialStudents = [
      user0,
      user1,
      user2,
      user3,
      user4,
      user5,
      user6,
      user7,
      user8,
      user9,
    ];

    console.log("\nAttempting to enroll students...");
    for (const student of potentialStudents) {
      const isAdmitted = await tech.account_Admitted(student.address);
      if (!isAdmitted) {
        try {
          await tech
            .connect(student)
            .enroll(student.address, "ipfs://test-uri-for-" + student.address, {
              value: initialTuition,
            });
          console.log(`✅ Enrolled: ${student.address}`);

          // Get updated size
          const updatedSize = await tech.nextTokenId();
          console.log(`   Current size (nextTokenId): ${updatedSize}`);

          // Check if we've reached class size limit
          if (updatedSize.eq(classSize)) {
            console.log("\n🎓 Class is now full!");
            break;
          }
        } catch (error) {
          console.log(`❌ Failed to enroll ${student.address}:`);
          console.log(`   ${error.message}`);
        }
      } else {
        console.log(`ℹ️ ${student.address} already enrolled`);
      }
    }

    // Try one more enrollment after class is full
    if ((await tech.nextTokenId()).eq(classSize)) {
      console.log("\nAttempting enrollment with full class:");
      try {
        const extraStudent = potentialStudents.find(
          async (s) => !(await tech.account_Admitted(s.address))
        );
        if (extraStudent) {
          await tech
            .connect(extraStudent)
            .enroll(
              extraStudent.address,
              "ipfs://test-uri-for-" + extraStudent.address,
              { value: initialTuition }
            );
          console.log("❌ Enrollment succeeded when class was full");
        }
      } catch (error) {
        console.log("✅ Enrollment failed as expected when class is full:");
        console.log(error.message);
      }
    }

    // Final state
    const finalSize = await tech.nextTokenId();
    console.log("\nFinal Class State:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Current Size (nextTokenId):", finalSize.toString());
    console.log("- Is Full:", finalSize.eq(classSize) ? "Yes ✅" : "No ❌");
  });

  it("Check NFT circulation and class size", async function () {
    console.log("\n******************************************************");
    console.log("CHECKING NFT CIRCULATION AND CLASS SIZE");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();

    console.log("\nClass Configuration:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Next Token ID:", nextTokenId.toString());

    // Count actual NFTs in circulation
    let circulatingCount = 0;
    for (let i = 0; i < nextTokenId; i++) {
      try {
        const owner = await tech.ownerOf(i);
        circulatingCount++;
        console.log(`Token ID ${i} owned by: ${owner}`);
      } catch (error) {
        console.log(
          `Token ID ${i} not in circulation (might be burned or never minted)`
        );
      }
    }

    console.log("\nCirculation Summary:");
    console.log("- Total NFTs in Circulation:", circulatingCount);
    console.log("- Should be enforcing max of:", classSize.toString());
    console.log(
      "- Is Over Limit:",
      circulatingCount > classSize ? "❌ YES!" : "✅ No"
    );

    // Check if enrollment is still possible
    console.log("\nTesting if enrollment is still possible:");
    try {
      await tech.connect(user9).enroll(user9.address, "ipfs://test-uri", {
        value: await tech.initialTuition(),
      });
      console.log(
        "❌ WARNING: Still able to enroll when class should be full!"
      );
    } catch (error) {
      console.log("✅ Enrollment correctly blocked:");
      console.log(error.message);
    }
  });

  it("Find non-expelled token and attempt expulsion", async function () {
    console.log("\n******************************************************");
    console.log("FINDING NON-EXPELLED TOKEN AND TESTING EXPULSION");
    console.log("******************************************************");

    const nextTokenId = await tech.nextTokenId();

    console.log("\nScanning tokens for non-expelled work...");
    let foundToken = null;

    // Scan through tokens to find non-expelled one
    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      console.log(`\nToken ID ${i}:`);
      console.log("- Is Expelled:", workState.isExpelled);
      console.log("- Is Graduated:", workState.isGraduated);

      if (!workState.isExpelled && !workState.isGraduated) {
        foundToken = i;
        console.log("✅ Found eligible token for expulsion test!");
        break;
      }
    }

    if (foundToken !== null) {
      console.log(`\nTesting expulsion with token ID: ${foundToken}`);

      // Get token info
      const ownerAddress = await tech.ownerOf(foundToken);
      const tokenOwner = await ethers.getSigner(ownerAddress);
      console.log("- Token Owner:", ownerAddress);

      // Try expulsion with token owner
      console.log("\nAttempting expulsion with token owner:");
      try {
        await tech.connect(tokenOwner).expel(foundToken);
        console.log("✅ Expulsion successful");

        const workState = await multicall.getWork(foundToken);
        console.log("\nExpelled Work State:");
        console.log("- Is Expelled:", workState.isExpelled);
        console.log(
          "- Current Tuition:",
          divDec(workState.currentTuition),
          "ETH"
        );

        // Check if we can still get the owner
        try {
          const ownerAfter = await tech.ownerOf(foundToken);
          console.log("- Owner after expulsion:", ownerAfter);
        } catch (error) {
          console.log("- Owner after expulsion: Token burned or non-existent");
        }
      } catch (error) {
        console.log("❌ Expulsion failed:");
        console.log(error.message);
      }
    } else {
      console.log("\n❌ No eligible tokens found for expulsion test");
    }
  });

  it("Try enrollment after expulsion", async function () {
    console.log("\n******************************************************");
    console.log("TESTING ENROLLMENT AFTER EXPULSION");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();
    const initialTuition = await tech.initialTuition();

    console.log("\nCurrent State:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Next Token ID:", nextTokenId.toString());
    console.log("- Initial Tuition Required:", divDec(initialTuition), "ETH");

    // Count actual active (non-expelled) NFTs
    console.log("\nCounting active NFTs...");
    let activeCount = 0;
    let expelledCount = 0;

    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      if (workState.isExpelled) {
        expelledCount++;
        console.log(`Token ID ${i}: Expelled`);
      } else {
        activeCount++;
        console.log(`Token ID ${i}: Active`);
      }
    }

    console.log("\nNFT Summary:");
    console.log("- Active NFTs:", activeCount);
    console.log("- Expelled NFTs:", expelledCount);
    console.log("- Total NFTs:", nextTokenId.toString());

    // Try to enroll a new student
    console.log("\nAttempting new enrollment:");
    try {
      await tech
        .connect(user9)
        .enroll(user9.address, "ipfs://test-uri-after-expulsion", {
          value: initialTuition,
        });

      const newTokenId = await tech.nextTokenId();
      console.log("✅ Enrollment successful!");
      console.log("- New Token ID:", newTokenId.toString());

      // Verify the new token
      const newWorkState = await multicall.getWork(newTokenId.sub(1));
      console.log("\nNew Token State:");
      console.log("- Owner:", newWorkState.currentOwner);
      console.log("- Tuition:", divDec(newWorkState.currentTuition), "ETH");
      console.log("- Is Expelled:", newWorkState.isExpelled);
    } catch (error) {
      console.log("❌ Enrollment failed:");
      console.log(error.message);
    }

    // Final state check
    const finalNextTokenId = await tech.nextTokenId();
    console.log("\nFinal State:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Next Token ID:", finalNextTokenId.toString());
    console.log(
      "- Active NFTs:",
      activeCount + (finalNextTokenId > nextTokenId ? 1 : 0)
    );
  });

  it("Plagiarize token until eligible and graduate", async function () {
    console.log("\n******************************************************");
    console.log("PLAGIARIZE UNTIL ELIGIBLE AND GRADUATE");
    console.log("******************************************************");

    // Find a non-expelled, non-graduated token
    const nextTokenId = await tech.nextTokenId();
    let targetToken = null;

    console.log("\nFinding suitable token to plagiarize...");
    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      if (!workState.isExpelled && !workState.isGraduated) {
        targetToken = i;
        console.log(`✅ Found token ${i}:`);
        console.log("- Current Owner:", workState.currentOwner);
        console.log(
          "- Current Tuition:",
          divDec(workState.currentTuition),
          "ETH"
        );
        break;
      }
    }

    if (targetToken !== null) {
      const creditRequirement = await tech.creditRequirement();
      console.log("\nGraduation Requirements:");
      console.log("- Credit Requirement:", divDec(creditRequirement), "ETH");
      console.log(
        "- Time Requirement:",
        (await tech.timeRequirement()).toString(),
        "seconds"
      );

      let currentState = await multicall.getWork(targetToken);
      console.log("\nStarting plagiarism loop...");

      while (currentState.currentTuition.lt(creditRequirement)) {
        console.log("\nPlagiarism Attempt:");
        console.log(
          "- Current Tuition:",
          divDec(currentState.currentTuition),
          "ETH"
        );
        console.log(
          "- Next Tuition Required:",
          divDec(currentState.nextTuition),
          "ETH"
        );

        try {
          await tech.connect(user9).plagiarize(user9.address, targetToken, {
            value: currentState.nextTuition,
          });
          console.log("✅ Plagiarism successful");

          currentState = await multicall.getWork(targetToken);
          console.log("New Owner:", currentState.currentOwner);
          console.log(
            "New Tuition:",
            divDec(currentState.currentTuition),
            "ETH"
          );
        } catch (error) {
          console.log("❌ Plagiarism failed:");
          console.log(error.message);
          break;
        }
      }

      console.log("\nFinal Work State After Plagiarism:");
      console.log(
        "- Current Tuition:",
        divDec(currentState.currentTuition),
        "ETH"
      );
      console.log("- Credit Requirement:", divDec(creditRequirement), "ETH");
      console.log(
        "- Meets Credit Requirement:",
        currentState.currentTuition.gte(creditRequirement)
      );
      console.log("- Can Graduate:", currentState.canGraduate);

      if (currentState.currentTuition.gte(creditRequirement)) {
        console.log("\n🎓 Token has reached credit requirement!");

        // Track plugin balances before graduation
        const ownerPluginBalanceBefore = await plugin.balanceOf(
          currentState.currentOwner
        );
        const creatorPluginBalanceBefore = await plugin.balanceOf(
          currentState.creator
        );

        console.log("\nAttempting graduation...");
        try {
          const owner = await ethers.getSigner(currentState.currentOwner);
          await tech.connect(owner).graduate(targetToken);
          console.log("✅ Graduation successful!");

          const graduatedState = await multicall.getWork(targetToken);
          console.log("\nPost-Graduation State:");
          console.log("- Is Graduated:", graduatedState.isGraduated);
          console.log(
            "- Final Tuition:",
            divDec(graduatedState.currentTuition),
            "ETH"
          );

          // Check plugin balance changes
          const ownerPluginBalanceAfter = await plugin.balanceOf(
            currentState.currentOwner
          );
          const creatorPluginBalanceAfter = await plugin.balanceOf(
            currentState.creator
          );

          console.log("\nPlugin Balance Changes:");
          console.log("Owner:", currentState.currentOwner);
          console.log("- Before:", divDec(ownerPluginBalanceBefore), "ETH");
          console.log("- After:", divDec(ownerPluginBalanceAfter), "ETH");
          console.log(
            "- Change:",
            divDec(ownerPluginBalanceAfter.sub(ownerPluginBalanceBefore)),
            "ETH"
          );

          console.log("\nCreator:", currentState.creator);
          console.log("- Before:", divDec(creatorPluginBalanceBefore), "ETH");
          console.log("- After:", divDec(creatorPluginBalanceAfter), "ETH");
          console.log(
            "- Change:",
            divDec(creatorPluginBalanceAfter.sub(creatorPluginBalanceBefore)),
            "ETH"
          );
        } catch (error) {
          console.log("❌ Graduation failed:");
          console.log(error.message);
        }
      }
    } else {
      console.log("❌ No suitable tokens found for test");
    }
  });

  it("Check if graduation opened enrollment slot", async function () {
    console.log("\n******************************************************");
    console.log("CHECKING IF GRADUATION OPENED ENROLLMENT SLOT");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();
    const initialTuition = await tech.initialTuition();

    console.log("\nCurrent State:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Next Token ID:", nextTokenId.toString());

    // Count active NFTs
    console.log("\nCounting tokens...");
    let activeCount = 0;
    let expelledCount = 0;
    let graduatedCount = 0;

    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      if (workState.isExpelled) {
        expelledCount++;
        console.log(`Token ${i}: Expelled`);
      } else if (workState.isGraduated) {
        graduatedCount++;
        console.log(`Token ${i}: Graduated`);
      } else {
        activeCount++;
        console.log(`Token ${i}: Active`);
      }
    }

    console.log("\nToken Summary:");
    console.log("- Active:", activeCount);
    console.log("- Expelled:", expelledCount);
    console.log("- Graduated:", graduatedCount);
    console.log("- Total:", nextTokenId.toString());
    console.log("- Spots Available:", classSize.sub(activeCount).toString());

    // Try to enroll if spots are available
    if (activeCount < classSize) {
      console.log("\nAttempting new enrollment...");
      try {
        await tech
          .connect(user9)
          .enroll(user9.address, "ipfs://test-uri-after-graduation", {
            value: initialTuition,
          });

        const newTokenId = await tech.nextTokenId();
        console.log("✅ Enrollment successful!");
        console.log("- New Token ID:", newTokenId.sub(1).toString());

        // Verify the new token
        const newWorkState = await multicall.getWork(newTokenId.sub(1));
        console.log("\nNew Token State:");
        console.log("- Owner:", newWorkState.currentOwner);
        console.log("- Tuition:", divDec(newWorkState.currentTuition), "ETH");
      } catch (error) {
        console.log("❌ Enrollment failed:");
        console.log(error.message);
      }
    } else {
      console.log("\n❌ No spots available for new enrollment");
    }
  });

  it("Test expulsion restrictions", async function () {
    console.log("\n******************************************************");
    console.log("TESTING EXPULSION RESTRICTIONS");
    console.log("******************************************************");

    // Test Case 1: Try to expel a graduated token
    const graduatedToken = 0; // We know token 0 is graduated
    const graduatedState = await multicall.getWork(graduatedToken);
    const graduatedOwner = await ethers.getSigner(graduatedState.currentOwner);

    console.log("\nTest Case 1: Attempting to expel graduated token");
    console.log("Token 0 State:");
    console.log("- Is Graduated:", graduatedState.isGraduated);
    console.log("- Is Expelled:", graduatedState.isExpelled);
    console.log("- Owner:", graduatedState.currentOwner);

    try {
      await tech.connect(graduatedOwner).expel(graduatedToken);
      console.log(
        "❌ Expulsion of graduated token succeeded when it should have failed"
      );
    } catch (error) {
      if (error.message.includes("BurnTardTech__WorksGraduated")) {
        console.log("✅ Expulsion of graduated token failed as expected");
      } else {
        console.log("❌ Failed for unexpected reason:");
        console.log(error.message);
      }
    }

    // Test Case 2: Try to expel an already expelled token
    // First, find a token and expel it
    const tokenToExpel = await findNonGraduatedNonExpelledToken();
    if (tokenToExpel !== null) {
      const workState = await multicall.getWork(tokenToExpel);
      const owner = await ethers.getSigner(workState.currentOwner);

      console.log("\nTest Case 2: Setting up expelled token");
      console.log(`Token ${tokenToExpel} State:`);
      console.log("- Is Graduated:", workState.isGraduated);
      console.log("- Is Expelled:", workState.isExpelled);
      console.log("- Owner:", workState.currentOwner);

      // First expulsion
      try {
        await tech.connect(owner).expel(tokenToExpel);
        console.log("✅ Initial expulsion successful");

        // Try to expel again
        console.log("\nAttempting to expel already expelled token:");
        try {
          await tech.connect(owner).expel(tokenToExpel);
          console.log(
            "❌ Second expulsion succeeded when it should have failed"
          );
        } catch (error) {
          if (error.message.includes("BurnTardTech__WorksExpelled")) {
            console.log(
              "✅ Second expulsion correctly failed: Token already expelled"
            );
          } else {
            console.log("❌ Failed for unexpected reason:");
            console.log(error.message);
          }
        }
      } catch (error) {
        console.log("❌ Initial expulsion failed unexpectedly:");
        console.log(error.message);
      }
    }

    // Test Case 3: Try to expel with non-owner
    const activeToken = await findNonGraduatedNonExpelledToken();
    if (activeToken !== null) {
      const workState = await multicall.getWork(activeToken);
      const nonOwner = user9; // Using user9 as non-owner

      console.log("\nTest Case 3: Attempting expulsion with non-owner");
      console.log(`Token ${activeToken} State:`);
      console.log("- Is Graduated:", workState.isGraduated);
      console.log("- Is Expelled:", workState.isExpelled);
      console.log("- Owner:", workState.currentOwner);
      console.log("- Attempting with:", nonOwner.address);

      try {
        await tech.connect(nonOwner).expel(activeToken);
        console.log(
          "❌ Expulsion by non-owner succeeded when it should have failed"
        );
      } catch (error) {
        if (error.message.includes("BurnTardTech__NotWorksOwner")) {
          console.log("✅ Expulsion by non-owner failed as expected");
        } else {
          console.log("❌ Failed for unexpected reason:");
          console.log(error.message);
        }
      }
    }
  });

  // Helper function to find a non-graduated, non-expelled token
  async function findNonGraduatedNonExpelledToken() {
    const nextTokenId = await tech.nextTokenId();
    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      if (!workState.isGraduated && !workState.isExpelled) {
        return i;
      }
    }
    return null;
  }

  it("Check comprehensive class status", async function () {
    console.log("\n******************************************************");
    console.log("COMPREHENSIVE CLASS STATUS CHECK");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();

    console.log("\nClass Configuration:");
    console.log("- Maximum Class Size:", classSize.toString());
    console.log("- Next Token ID:", nextTokenId.toString());

    // Detailed token status count
    let activeCount = 0;
    let expelledCount = 0;
    let graduatedCount = 0;
    let tokenDetails = [];

    console.log("\nScanning all tokens...");
    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      const status = {
        id: i,
        owner: workState.currentOwner,
        tuition: workState.currentTuition,
        isExpelled: workState.isExpelled,
        isGraduated: workState.isGraduated,
      };

      if (status.isGraduated) graduatedCount++;
      else if (status.isExpelled) expelledCount++;
      else activeCount++;

      tokenDetails.push(status);
    }

    console.log("\nToken Details:");
    for (const token of tokenDetails) {
      console.log(`\nToken ID ${token.id}:`);
      console.log("- Owner:", token.owner);
      console.log("- Tuition:", divDec(token.tuition), "ETH");
      console.log(
        "- Status:",
        token.isGraduated
          ? "Graduated"
          : token.isExpelled
          ? "Expelled"
          : "Active"
      );
    }

    console.log("\nClass Summary:");
    console.log("- Total Tokens:", nextTokenId.toString());
    console.log("- Active Students:", activeCount);
    console.log("- Graduated:", graduatedCount);
    console.log("- Expelled:", expelledCount);

    // Calculate available slots (only active students count against class size)
    const availableSlots = classSize.sub(activeCount);
    console.log("\nEnrollment Status:");
    console.log("- Available Slots:", availableSlots.toString());
    console.log(
      "- Can Accept New Students:",
      availableSlots.gt(0) ? "Yes ✅" : "No ❌"
    );

    // Verify if enrollment is possible
    if (availableSlots.gt(0)) {
      console.log("\nAttempting test enrollment...");
      try {
        const initialTuition = await tech.initialTuition();
        await tech
          .connect(user9)
          .enroll(user9.address, "ipfs://test-uri-for-enrollment-check", {
            value: initialTuition,
          });
        console.log("✅ Test enrollment successful");
      } catch (error) {
        console.log("❌ Test enrollment failed:");
        console.log(error.message);
      }
    }
  });

  it("Verify class is at capacity with 10 tokens", async function () {
    console.log("\n******************************************************");
    console.log("VERIFYING CLASS IS AT CAPACITY (10 TOKENS)");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();
    const initialTuition = await tech.initialTuition();

    console.log("\nCurrent Token Status:");
    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      let status = "Active";
      if (workState.isGraduated) status = "Graduated";
      if (workState.isExpelled) status = "Expelled";
      console.log(`Token ${i}: ${status} (Owner: ${workState.currentOwner})`);
    }

    console.log("\nClass Status:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Total Tokens:", nextTokenId.toString());
    console.log("- Initial Tuition Required:", divDec(initialTuition), "ETH");

    // Try to enroll when we're at 10 tokens
    console.log("\nAttempting enrollment (should fail as we have 10 tokens):");
    try {
      await tech
        .connect(user9)
        .enroll(user9.address, "ipfs://test-uri-at-capacity", {
          value: initialTuition,
        });
      console.log("❌ ERROR: Enrollment succeeded when class should be full!");
    } catch (error) {
      if (error.message.includes("BurnTardTech__FullClass")) {
        console.log("✅ Enrollment correctly failed: Class is full");
      } else {
        console.log("❌ Enrollment failed for unexpected reason:");
        console.log(error.message);
      }
    }
  });

  it("Verify class is already over capacity", async function () {
    console.log("\n******************************************************");
    console.log("VERIFYING CLASS IS ALREADY OVER CAPACITY");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();
    const initialTuition = await tech.initialTuition();

    // Count tokens by status
    let activeCount = 0;
    let graduatedCount = 0;
    let expelledCount = 0;

    console.log("\nToken Status:");
    for (let i = 0; i < nextTokenId; i++) {
      const workState = await multicall.getWork(i);
      if (workState.isGraduated) {
        graduatedCount++;
        console.log(`Token ${i}: Graduated`);
      } else if (workState.isExpelled) {
        expelledCount++;
        console.log(`Token ${i}: Expelled`);
      } else {
        activeCount++;
        console.log(`Token ${i}: Active`);
      }
    }

    console.log("\nClass Status:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Total Tokens Minted:", nextTokenId.toString());
    console.log("- Active Students:", activeCount);
    console.log("- Graduated Students:", graduatedCount);
    console.log("- Expelled Students:", expelledCount);
    console.log("- Initial Tuition Required:", divDec(initialTuition), "ETH");
    console.log(
      "- Over Capacity:",
      nextTokenId.gt(classSize) ? "Yes ❌" : "No ✅"
    );

    // Try to enroll when already over capacity
    console.log(
      "\nAttempting enrollment (should fail as we're over capacity):"
    );
    try {
      await tech
        .connect(user9)
        .enroll(user9.address, "ipfs://test-uri-over-capacity", {
          value: initialTuition,
        });
      console.log("❌ ERROR: Enrollment succeeded when class should be full!");
    } catch (error) {
      if (error.message.includes("BurnTardTech__FullClass")) {
        console.log("✅ Enrollment correctly failed: Class is full");
      } else {
        console.log("❌ Enrollment failed for unexpected reason:");
        console.log(error.message);
      }
    }
  });

  it("Test class size modification restrictions", async function () {
    console.log("\n******************************************************");
    console.log("TESTING CLASS SIZE MODIFICATIONS");
    console.log("******************************************************");

    const currentClassSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();

    console.log("\nInitial State:");
    console.log("- Current Class Size:", currentClassSize.toString());
    console.log("- Total Tokens:", nextTokenId.toString());

    // Test 1: Try to reduce class size below current token count
    console.log("\nTest 1: Attempting to reduce class size to 9 (should fail)");
    try {
      await tech.connect(owner).setClassSize(9);
      console.log(
        "❌ ERROR: Successfully reduced class size below token count!"
      );
    } catch (error) {
      if (error.message.includes("BurnTardTech__InvalidClassSize")) {
        console.log(
          "✅ Correctly failed to reduce class size below token count"
        );
      } else {
        console.log("❌ Failed for unexpected reason:");
        console.log(error.message);
      }
    }

    // Test 2: Try to modify class size with non-owner
    console.log(
      "\nTest 2: Attempting to modify class size with non-owner (should fail)"
    );
    try {
      await tech.connect(user9).setClassSize(18);
      console.log("❌ ERROR: Non-owner successfully modified class size!");
    } catch (error) {
      if (error.message.includes("Ownable")) {
        console.log("✅ Correctly failed: Only owner can modify class size");
      } else {
        console.log("❌ Failed for unexpected reason:");
        console.log(error.message);
      }
    }

    // Test 3: Successfully increase class size to 12
    console.log(
      "\nTest 3: Attempting to increase class size to 18 (should succeed)"
    );
    try {
      await tech.connect(owner).setClassSize(18);
      const newClassSize = await tech.classSize();
      console.log("New class size:", newClassSize.toString());
      console.log(
        newClassSize.eq(18)
          ? "✅ Successfully increased class size to 18"
          : "❌ Failed to set correct class size"
      );

      // Try enrollment with new size
      console.log("\nTesting enrollment with new class size:");
      try {
        const initialTuition = await tech.initialTuition();
        await tech
          .connect(user9)
          .enroll(user9.address, "ipfs://test-uri-new-class-size", {
            value: initialTuition,
          });
        console.log("✅ Successfully enrolled with new class size");
      } catch (error) {
        console.log("❌ Enrollment failed with new class size:");
        console.log(error.message);
      }
    } catch (error) {
      console.log("❌ Failed to increase class size:");
      console.log(error.message);
    }

    // Final state check
    const finalClassSize = await tech.classSize();
    console.log("\nFinal State:");
    console.log("- Initial Class Size:", currentClassSize.toString());
    console.log("- Final Class Size:", finalClassSize.toString());
    console.log("- Total Tokens:", (await tech.nextTokenId()).toString());
  });

  it("Fill class and get comprehensive count", async function () {
    console.log("\n******************************************************");
    console.log("FILLING CLASS AND COUNTING ALL STATUSES");
    console.log("******************************************************");

    const classSize = await tech.classSize();
    const nextTokenId = await tech.nextTokenId();
    const initialTuition = await tech.initialTuition();

    console.log("\nInitial State:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Current Token Count:", nextTokenId.toString());

    // Try to fill remaining slots
    if (nextTokenId.lt(classSize)) {
      const slotsToFill = classSize.sub(nextTokenId);
      console.log(`\nAttempting to fill ${slotsToFill} slots...`);

      for (let i = 0; i < slotsToFill; i++) {
        try {
          await tech
            .connect(user9)
            .enroll(user9.address, `ipfs://test-uri-filling-${i}`, {
              value: initialTuition,
            });
          console.log(`✅ Enrolled student ${i + 1}/${slotsToFill}`);
        } catch (error) {
          console.log(`❌ Failed to enroll student ${i + 1}:`);
          console.log(error.message);
          break;
        }
      }
    }

    // Count all token statuses
    const finalNextTokenId = await tech.nextTokenId();
    let activeCount = 0;
    let graduatedCount = 0;
    let expelledCount = 0;

    console.log("\nCounting all tokens...");
    for (let i = 0; i < finalNextTokenId; i++) {
      const workState = await multicall.getWork(i);
      if (workState.isGraduated) {
        graduatedCount++;
        console.log(`Token ${i}: Graduated`);
      } else if (workState.isExpelled) {
        expelledCount++;
        console.log(`Token ${i}: Expelled`);
      } else {
        activeCount++;
        console.log(`Token ${i}: Active`);
      }
    }

    console.log("\nFinal Class Status:");
    console.log("- Class Size Limit:", classSize.toString());
    console.log("- Total Tokens:", finalNextTokenId.toString());
    console.log("- Active Students:", activeCount);
    console.log("- Graduated Students:", graduatedCount);
    console.log("- Expelled Students:", expelledCount);
    console.log(
      "- Class Full:",
      finalNextTokenId.eq(classSize) ? "Yes ✅" : "No ❌"
    );

    // Try one more enrollment to verify it's full
    console.log("\nVerifying class is full (trying one more enrollment):");
    try {
      await tech
        .connect(user9)
        .enroll(user9.address, "ipfs://test-uri-verify-full", {
          value: initialTuition,
        });
      console.log("❌ ERROR: Enrollment succeeded when class should be full!");
    } catch (error) {
      if (error.message.includes("BurnTardTech__FullClass")) {
        console.log("✅ Correctly failed: Class is full");
      } else {
        console.log("❌ Failed for unexpected reason:");
        console.log(error.message);
      }
    }
  });

  it("Test BurnTardTechPlugin restrictions and functionality", async function () {
    console.log("\n******************************************************");
    console.log("TESTING PLUGIN RESTRICTIONS AND FUNCTIONALITY");
    console.log("******************************************************");

    const amount = one; // 1 ETH
    const randomUser = user9;

    console.log(
      "\nTest Case 1: Non-BurnTardTech calls to restricted functions"
    );
    console.log("Testing depositFor...");
    try {
      await plugin.connect(randomUser).depositFor(randomUser.address, amount);
      console.log("❌ depositFor succeeded when it should have failed");
    } catch (error) {
      if (error.message.includes("BurnTardTech__NotAuthorizedBurnTardTech")) {
        console.log("✅ depositFor correctly restricted to BurnTardTech");
      } else {
        console.log("❌ Failed for unexpected reason:", error.message);
      }
    }

    console.log("\nTesting withdrawTo...");
    try {
      await plugin.connect(randomUser).withdrawTo(randomUser.address, amount);
      console.log("❌ withdrawTo succeeded when it should have failed");
    } catch (error) {
      if (error.message.includes("BurnTardTech__NotAuthorizedBurnTardTech")) {
        console.log("✅ withdrawTo correctly restricted to BurnTardTech");
      } else {
        console.log("❌ Failed for unexpected reason:", error.message);
      }
    }

    console.log("\nTest Case 2: Testing owner functions");

    // Test setActiveBribes
    console.log("\nTesting setActiveBribes...");
    try {
      const currentState = await plugin.activeBribes();
      await plugin.connect(owner).setActiveBribes(!currentState);
      const newState = await plugin.activeBribes();
      console.log("✅ setActiveBribes successful");
      console.log("- Previous state:", currentState);
      console.log("- New state:", newState);
    } catch (error) {
      console.log("❌ setActiveBribes failed:", error.message);
    }

    // Test setActiveIncentives
    console.log("\nTesting setActiveIncentives...");
    try {
      const currentState = await plugin.activeIncentives();
      await plugin.connect(owner).setActiveIncentives(!currentState);
      const newState = await plugin.activeIncentives();
      console.log("✅ setActiveIncentives successful");
      console.log("- Previous state:", currentState);
      console.log("- New state:", newState);
    } catch (error) {
      console.log("❌ setActiveIncentives failed:", error.message);
    }

    // Test setTreasury
    console.log("\nTesting setTreasury...");
    try {
      const currentTreasury = await plugin.treasury();
      await plugin.connect(owner).setTreasury(user1.address);
      const newTreasury = await plugin.treasury();
      console.log("✅ setTreasury successful");
      console.log("- Previous treasury:", currentTreasury);
      console.log("- New treasury:", newTreasury);
    } catch (error) {
      console.log("❌ setTreasury failed:", error.message);
    }

    // Test setIncentives
    console.log("\nTesting setIncentives...");
    try {
      const currentIncentives = await plugin.incentives();
      await plugin.connect(owner).setIncentives(user2.address);
      const newIncentives = await plugin.incentives();
      console.log("✅ setIncentives successful");
      console.log("- Previous incentives:", currentIncentives);
      console.log("- New incentives:", newIncentives);
    } catch (error) {
      console.log("❌ setIncentives failed:", error.message);
    }

    // Test setDeveloper (only current developer can change)
    console.log("\nTesting setDeveloper...");
    try {
      const currentDeveloper = await plugin.developer();
      const devSigner = await ethers.getSigner(currentDeveloper);
      await plugin.connect(devSigner).setDeveloper(user3.address);
      const newDeveloper = await plugin.developer();
      console.log("✅ setDeveloper successful");
      console.log("- Previous developer:", currentDeveloper);
      console.log("- New developer:", newDeveloper);
    } catch (error) {
      console.log("❌ setDeveloper failed:", error.message);
    }

    // Test non-owner attempts
    console.log("\nTest Case 3: Testing non-owner restrictions");
    try {
      await plugin.connect(randomUser).setTreasury(randomUser.address);
      console.log(
        "❌ Non-owner setTreasury succeeded when it should have failed"
      );
    } catch (error) {
      if (error.message.includes("Ownable")) {
        console.log("✅ setTreasury correctly restricted to owner");
      } else {
        console.log("❌ Failed for unexpected reason:", error.message);
      }
    }

    // Test view functions
    console.log("\nTest Case 4: Testing view functions");
    console.log("- Token address:", await plugin.getToken());
    console.log("- Protocol:", await plugin.getProtocol());
    console.log("- Name:", await plugin.getName());
    console.log("- Voter:", await plugin.getVoter());
    console.log("- Gauge:", await plugin.getGauge());
    console.log("- Bribe:", await plugin.getBribe());
    console.log("- Vault Token:", await plugin.getVaultToken());
    console.log("- Reward Vault:", await plugin.getRewardVault());

    const assetTokens = await plugin.getAssetTokens();
    console.log("- Asset Tokens:", assetTokens);

    const bribeTokens = await plugin.getBribeTokens();
    console.log("- Bribe Tokens:", bribeTokens);

    // Test zero address checks
    console.log("\nTest Case 5: Testing zero address validations");
    try {
      await plugin.connect(owner).setTreasury(AddressZero);
      console.log(
        "❌ setTreasury with zero address succeeded when it should have failed"
      );
    } catch (error) {
      if (error.message.includes("Plugin__InvalidZeroAddress")) {
        console.log("✅ Zero address check working for setTreasury");
      } else {
        console.log("❌ Failed for unexpected reason:", error.message);
      }
    }
  });
});
