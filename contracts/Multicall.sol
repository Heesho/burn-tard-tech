// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IBurnTardTech {    
    function id_Tuition(uint256 tokenId) external view returns (uint256);
    function id_Creator(uint256 tokenId) external view returns (address);
    function id_LastPlagiarized(uint256 tokenId) external view returns (uint256);
    function id_Graduated(uint256 tokenId) external view returns (bool);
    function id_Expelled(uint256 tokenId) external view returns (bool);
    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function classSize() external view returns (uint256);
    function nextTokenId() external view returns (uint256);
    function initialTuition() external view returns (uint256);
    function graduationRequirement() external view returns (uint256);
    function openAdmissions() external view returns (bool);
    function account_Admitted(address account) external view returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

interface IPlugin {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getRewardVault() external view returns (address);
    function getGauge() external view returns (address);
}

interface IGauge {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getRewardForDuration(address reward) external view returns (uint256);
    function earned(address account, address reward) external view returns (uint256);
}

contract Multicall {
    address public immutable burnTardTech;
    address public immutable plugin;
    address public immutable oBERO;

    struct StudentState {
        // Basic student info
        address studentAddress;
        bool isAdmitted;
        uint256 worksOwned;       // number of NFTs owned
        uint256[] ownedWorkIds;   // array of owned NFT IDs
        
        // Staking & Rewards info
        uint256 rewardPerToken;    // reward rate per staked token
        uint256 gaugeBalance;      // student's gauge balance
        uint256 gaugeTotalSupply;  // total tokens in gauge
        uint256 rewardsEarned;     // earned but unclaimed rewards
        uint256 oBeroBalance;      // student's oBERO balance
    }

    struct WorkState {
        uint256 tokenId;
        uint256 currentTuition;
        uint256 nextTuition;      // currentTuition * 11/10
        uint256 lastPlagiarized;
        uint256 timeSinceLastPlagiarism;  // block.timestamp - lastPlagiarized
        address currentOwner;     // current student
        address creator;          // original student
        string uri;
        bool isGraduated;
        bool isExpelled;
        bool canGraduate;         // if tuition >= graduationRequirement
    }

    struct ClassState {
        uint256 currentClassSize;
        uint256 maxClassSize;
        uint256 nextTokenId;      // total NFTs minted
        uint256 initialTuition;   // cost to mint
        uint256 graduationRequirement;
        bool isOpenAdmissions;
        uint256 totalValueLocked; // total ETH staked in plugin
    }

    constructor(address _burnTardTech, address _plugin, address _oBERO) {
        burnTardTech = _burnTardTech;
        plugin = _plugin;
        oBERO = _oBERO;
    }

    function getStudent(address student) external view returns (StudentState memory studentState) {

        studentState.studentAddress = student;
        studentState.isAdmitted = student == address(0) ? false : IBurnTardTech(burnTardTech).account_Admitted(student);
        studentState.worksOwned = student == address(0) ? 0 : IBurnTardTech(burnTardTech).balanceOf(student);
        
        studentState.ownedWorkIds = student == address(0) ? new uint256[](0) : new uint256[](studentState.worksOwned);
        for(uint256 i = 0; i < studentState.worksOwned; i++) {
            studentState.ownedWorkIds[i] = IBurnTardTech(burnTardTech).tokenOfOwnerByIndex(student, i);
        }

        address gauge = IPlugin(plugin).getGauge();
        studentState.gaugeBalance = student == address(0) ? 0 : IGauge(gauge).balanceOf(student);
        studentState.gaugeTotalSupply = IGauge(gauge).totalSupply();
        studentState.rewardPerToken = studentState.gaugeTotalSupply == 0 ? 0 : IGauge(gauge).getRewardForDuration(oBERO) * 1e18 / studentState.gaugeTotalSupply;
        studentState.rewardsEarned = student == address(0) ? 0 : IGauge(gauge).earned(student, oBERO);
        studentState.oBeroBalance = student == address(0) ? 0 : IERC20(oBERO).balanceOf(student);
    }

    function getWork(uint256 tokenId) external view returns (WorkState memory workState) {
        workState.tokenId = tokenId;
        workState.currentTuition = IBurnTardTech(burnTardTech).id_Tuition(tokenId);
        workState.nextTuition = workState.currentTuition * 11 / 10;
        workState.lastPlagiarized = IBurnTardTech(burnTardTech).id_LastPlagiarized(tokenId);
        workState.timeSinceLastPlagiarism = block.timestamp - workState.lastPlagiarized;
        workState.currentOwner = IBurnTardTech(burnTardTech).ownerOf(tokenId);
        workState.creator = IBurnTardTech(burnTardTech).id_Creator(tokenId);
        workState.uri = IBurnTardTech(burnTardTech).tokenURI(tokenId);
        workState.isGraduated = IBurnTardTech(burnTardTech).id_Graduated(tokenId);
        workState.isExpelled = IBurnTardTech(burnTardTech).id_Expelled(tokenId);
        workState.canGraduate = workState.currentTuition >= IBurnTardTech(burnTardTech).graduationRequirement();
    }

    function getClass() external view returns (ClassState memory classState) {
        classState.currentClassSize = IBurnTardTech(burnTardTech).nextTokenId();
        classState.maxClassSize = IBurnTardTech(burnTardTech).classSize();
        classState.nextTokenId = IBurnTardTech(burnTardTech).nextTokenId();
        classState.initialTuition = IBurnTardTech(burnTardTech).initialTuition();
        classState.graduationRequirement = IBurnTardTech(burnTardTech).graduationRequirement();
        classState.isOpenAdmissions = IBurnTardTech(burnTardTech).openAdmissions();
        classState.totalValueLocked = IPlugin(plugin).totalSupply();
    }

}