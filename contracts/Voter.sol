// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPlugin {
    function setGauge(address _gauge) external;
    function setBribe(address _bribe) external;
}

contract Gauge {

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    function _deposit(address account, uint256 amount) external {
        balanceOf[account] += amount;
        totalSupply += amount;
    }

    function _withdraw(address account, uint256 amount) external {
        balanceOf[account] -= amount;
        totalSupply -= amount;
    }

}

contract Bribe {
    using SafeERC20 for IERC20;

    function notifyRewardAmount(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

}

contract Voter {

    address public constant OTOKEN = address(0);
    
    constructor() {
    }

    function setPlugin(address plugin_) external {
        address gauge = address(new Gauge());
        IPlugin(plugin_).setGauge(gauge);

        address bribe = address(new Bribe());
        IPlugin(plugin_).setBribe(bribe);
    }

}