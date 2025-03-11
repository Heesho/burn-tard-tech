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

interface IBerachainRewardVaultFactory {
    function createRewardVault(address _vaultToken) external returns (address);
}

interface IBerachainRewardVault {
    function delegateStake(address account, uint256 amount) external;
    function delegateWithdraw(address account, uint256 amount) external;
}

contract VaultToken is ERC20, Ownable {
    constructor() ERC20("HenloTech", "HenloTech") {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

contract HenloTechPlugin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    string public constant SYMBOL = "HenloTech";
    string public constant PROTOCOL = "GumBall6900";
    uint256 public constant DURATION = 7 days;

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20 private immutable token;
    address private immutable OTOKEN;
    address private immutable voter;
    address private gauge;
    address private bribe;
    address[] private assetTokens;
    address[] private bribeTokens;

    address private vaultToken;
    address private rewardVault;

    address public immutable henloTech;
    address public treasury;
    address public developer;
    bool public autoBribe = true;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__InvalidZeroInput();
    error Plugin__InvalidZeroAddress();
    error Plugin__NotAuthorizedVoter();
    error Plugin__NotAuthorizedHenloTech();
    error Plugin__NotAuthorizedDeveloper();

    /*----------  EVENTS ------------------------------------------------*/

    event Plugin__Deposited(address indexed account, uint256 amount);
    event Plugin__Withdrawn(address indexed account, uint256 amount);
    event Plugin__ClaimedAndDistributed(uint256 amount);
    event Plugin__AutoBribeSet(bool autoBribe);
    event Plugin__TreasurySet(address treasury);
    event Plugin__DeveloperSet(address developer);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Plugin__InvalidZeroInput();
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    modifier onlyHenloTech() {
        if (msg.sender != henloTech) revert Plugin__NotAuthorizedHenloTech();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _token, 
        address _voter, 
        address[] memory _assetTokens, 
        address[] memory _bribeTokens,
        address _vaultFactory,
        address _henloTech,
        address _treasury,
        address _developer
    ) {
        token = IERC20(_token);
        voter = _voter;
        assetTokens = _assetTokens;
        bribeTokens = _bribeTokens;
        henloTech = _henloTech;
        treasury = _treasury;
        developer = _developer;

        OTOKEN = IVoter(_voter).OTOKEN();
        vaultToken = address(new VaultToken());
        rewardVault = IBerachainRewardVaultFactory(_vaultFactory).createRewardVault(vaultToken);
    }

    function depositFor(address account, uint256 amount) 
        public
        virtual
        nonZeroInput(amount)
        onlyHenloTech
        nonReentrant
    {
        emit Plugin__Deposited(account, amount);

        IGauge(gauge)._deposit(account, amount);

        VaultToken(vaultToken).mint(address(this), amount);
        IERC20(vaultToken).safeApprove(rewardVault, 0);
        IERC20(vaultToken).safeApprove(rewardVault, amount);
        IBerachainRewardVault(rewardVault).delegateStake(account, amount);
    }

    function withdrawTo(address account, uint256 amount)
        public
        virtual
        nonZeroInput(amount)
        onlyHenloTech
        nonReentrant
    {
        emit Plugin__Withdrawn(account, amount);

        IGauge(gauge)._withdraw(account, amount);

        IBerachainRewardVault(rewardVault).delegateWithdraw(account, amount);
        VaultToken(vaultToken).burn(address(this), amount);

    }

    function claimAndDistribute() 
        external
        nonReentrant
    {
        uint256 balance = token.balanceOf(address(this));
        if (balance > DURATION) {
            uint256 fee = balance / 5;
            token.safeTransfer(treasury, fee * 3 / 5);
            token.safeTransfer(developer, fee * 2 / 5);
            if (autoBribe) {
                token.safeApprove(bribe, 0);
                token.safeApprove(bribe, balance - fee);
                IBribe(bribe).notifyRewardAmount(address(token), balance - fee);
            } else {
                token.safeTransfer(treasury, balance - fee);
            }
            emit Plugin__ClaimedAndDistributed(balance);
        }
    }

    receive() external payable {}

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setAutoBribe(bool _autoBribe) external onlyOwner {
        autoBribe = _autoBribe;
        emit Plugin__AutoBribeSet(autoBribe);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert Plugin__InvalidZeroAddress();
        treasury = _treasury;
        emit Plugin__TreasurySet(treasury);
    }

    function setDeveloper(address _developer) external {      
        if (msg.sender != developer) revert Plugin__NotAuthorizedDeveloper();
        if (_developer == address(0)) revert Plugin__InvalidZeroAddress();
        developer = _developer;
        emit Plugin__DeveloperSet(developer);
    }

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;

    function setBribe(address _bribe) external onlyVoter {
        bribe = _bribe;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function balanceOf(address account) public view returns (uint256) {
        return IGauge(gauge).balanceOf(account);
    }

    function totalSupply() public view returns (uint256) {
        return IGauge(gauge).totalSupply();
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
}