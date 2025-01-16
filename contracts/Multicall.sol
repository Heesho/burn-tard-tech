// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ISticker {    
    function id_Price(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function id_Creator(uint256 tokenId) external view returns (address);
}

interface IPlugin {
    function getGauge() external view returns (address);
}

interface IGauge {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getRewardForDuration(address reward) external view returns (uint256);
    function earned(address account, address reward) external view returns (uint256);
}

contract Multicall {

    address public immutable sticker;
    address public immutable plugin;
    address public immutable oBERO;

    struct GaugeState {
        uint256 rewardPerToken;
        uint256 totalSupply;
        uint256 balance;
        uint256 earned;
        uint256 oBeroBalance;
    }

    struct StickerState {
        uint256 tokenId;
        uint256 prevPrice;
        uint256 buyPrice;
        uint256 sellPrice;
        address owner;
        address creator;
    }

    constructor(address _sticker, address _plugin, address _oBERO) {
        sticker = _sticker;
        plugin = _plugin;
        oBERO = _oBERO;
    }

    function getGauge(address account) external view returns (GaugeState memory gaugeState) {
        address gauge = IPlugin(plugin).getGauge();
        if (gauge != address(0)) {
            gaugeState.rewardPerToken = IGauge(gauge).totalSupply() == 0 ? 0 : (IGauge(gauge).getRewardForDuration(oBERO) * 1e18 / IGauge(gauge).totalSupply());
            gaugeState.totalSupply = IGauge(gauge).totalSupply();
            gaugeState.balance = IGauge(gauge).balanceOf(account);
            gaugeState.earned = IGauge(gauge).earned(account, oBERO);
            gaugeState.oBeroBalance = IERC20(oBERO).balanceOf(account);
        }
    }

    function getSticker(uint256 tokenId) external view returns (StickerState memory stickerState) {
        stickerState.tokenId = tokenId;
        stickerState.prevPrice = ISticker(sticker).id_Price(tokenId);
        stickerState.buyPrice = stickerState.prevPrice * 2;
        stickerState.sellPrice = stickerState.prevPrice * 80 / 100;
        stickerState.owner = ISticker(sticker).ownerOf(tokenId);
        stickerState.creator = ISticker(sticker).id_Creator(tokenId);
    }

}