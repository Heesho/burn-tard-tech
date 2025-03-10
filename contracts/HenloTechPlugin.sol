// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGauge {
    function _deposit(address account, uint256 amount) external;
    function _withdraw(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
    function DURATION() external view returns (uint);
}

interface IVoter {
    function OTOKEN() external view returns (address);
}

interface IWBERA {
    function deposit() external payable;
}

interface IBerachainRewardsVaultFactory {
    function createRewardsVault(address _vaultToken) external returns (address);
}

interface IBerachainRewardsVault {
    function delegateStake(address account, uint256 amount) external;
    function delegateWithdraw(address account, uint256 amount) external;
}

contract VaultToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

contract NetPlugin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    string public constant SYMBOL = "StickerNet";
    string public constant PROTOCOL = "Gumball";
    string public constant VAULT_NAME = "StickerNetVault";

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20 private immutable token;
    address private immutable sticker;
    address private immutable OTOKEN;
    address private immutable voter;
    address private gauge;
    address private bribe;

    address private vaultToken;
    address private rewardVault;

    address[] private assetTokens;
    address[] private bribeTokens;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__InvalidZeroInput();
    error Plugin__NotAuthorizedVoter();
    error Plugin__NotAuthorizedSticker();

    /*----------  EVENTS ------------------------------------------------*/

    event Plugin__Deposited(address indexed account, uint256 amount);
    event Plugin__Withdrawn(address indexed account, uint256 amount);
    event Plugin__ClaimedAnDistributed();

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Plugin__InvalidZeroInput();
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    modifier onlySticker() {
        if (msg.sender != sticker) revert Plugin__NotAuthorizedSticker();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _token, 
        address _voter, 
        address[] memory _assetTokens, 
        address[] memory _bribeTokens,
        address _vaultFactory,
        address _sticker
    ) {
        token = IERC20(_token);
        voter = _voter;
        assetTokens = _assetTokens;
        bribeTokens = _bribeTokens;
        sticker = _sticker;

        OTOKEN = IVoter(_voter).OTOKEN();
        vaultToken = address(new VaultToken(VAULT_NAME, VAULT_NAME));
        rewardVault = IBerachainRewardsVaultFactory(_vaultFactory).createRewardsVault(vaultToken);
    }

    function depositFor(address account, uint256 amount) 
        public
        virtual
        nonZeroInput(amount)
        onlySticker
        nonReentrant
    {
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        emit Plugin__Deposited(account, amount);

        IGauge(gauge)._deposit(account, amount);

        VaultToken(vaultToken).mint(address(this), amount);
        IERC20(vaultToken).safeApprove(rewardVault, 0);
        IERC20(vaultToken).safeApprove(rewardVault, amount);
        IBerachainRewardsVault(rewardVault).delegateStake(account, amount);
    }

    function withdrawTo(address account, uint256 amount)
        public
        virtual
        nonZeroInput(amount)
        onlySticker
        nonReentrant
    {
        _totalSupply = _totalSupply - amount;
        _balances[msg.sender] = _balances[msg.sender] - amount;
        emit Plugin__Withdrawn(msg.sender, amount);

        IGauge(gauge)._withdraw(msg.sender, amount);

        IBerachainRewardsVault(rewardVault).delegateWithdraw(msg.sender, amount);
        VaultToken(vaultToken).burn(address(this), amount);

    }

    function claimAndDistribute() 
        public
        nonReentrant
    {
        uint256 duration = IBribe(bribe).DURATION();
        uint256 balance = address(this).balance;
        if (balance > duration) {
            IWBERA(address(token)).deposit{value: balance}();
            token.safeApprove(bribe, 0);
            token.safeApprove(bribe, balance);
            IBribe(bribe).notifyRewardAmount(address(token), balance);
        }
    }

    receive() external payable {}

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;
    }

    function setBribe(address _bribe) external onlyVoter {
        bribe = _bribe;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function getToken() public view virtual returns (address) {
        return address(token);
    }

    function getProtocol() public view virtual returns (string memory) {
        return PROTOCOL;
    }

    function getName() public view virtual returns (string memory) {
        return SYMBOL;
    }

    function getVoter() public view returns (address) {
        return voter;
    }

    function getGauge() public view returns (address) {
        return gauge;
    }

    function getBribe() public view returns (address) {
        return bribe;
    }

    function getAssetTokens() public view virtual returns (address[] memory) {
        return assetTokens;
    }

    function getBribeTokens() public view returns (address[] memory) {
        return bribeTokens;
    }

    function getVaultToken() public view returns (address) {
        return vaultToken;
    }

    function getRewardVault() public view returns (address) {
        return rewardVault;
    }

    function getSticker() public view returns (address) {
        return sticker;
    }
}