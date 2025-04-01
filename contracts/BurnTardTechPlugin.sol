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
    constructor() ERC20("BurnTardTech", "BurnTardTech") {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

contract BurnTardTechPlugin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    string public constant SYMBOL = "BurnTardTech";
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

    address public immutable burnTardTech;
    address public treasury;
    address public developer;
    address public incentives;
    bool public activeBribes = true;
    bool public activeIncentives;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__InvalidZeroInput();
    error Plugin__InvalidZeroAddress();
    error Plugin__NotAuthorizedVoter();
    error Plugin__NotAuthorizedBurnTardTech();
    error Plugin__NotAuthorizedDeveloper();

    /*----------  EVENTS ------------------------------------------------*/

    event Plugin__Deposited(address indexed account, uint256 amount);
    event Plugin__Withdrawn(address indexed account, uint256 amount);
    event Plugin__ClaimedAndDistributed(uint256 bribeAmount, uint256 incentivesAmount, uint256 developerAmount, uint256 treasuryAmount);
    event Plugin__ActiveBribesSet(bool activeBribes);
    event Plugin__ActiveIncentivesSet(bool activeIncentives);
    event Plugin__TreasurySet(address treasury);
    event Plugin__DeveloperSet(address developer);
    event Plugin__IncentivesSet(address incentives);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Plugin__InvalidZeroInput();
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    modifier onlyBurnTardTech() {
        if (msg.sender != burnTardTech) revert Plugin__NotAuthorizedBurnTardTech();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _token, 
        address _voter, 
        address[] memory _assetTokens, 
        address[] memory _bribeTokens,
        address _vaultFactory,
        address _burnTardTech,
        address _treasury,
        address _developer
    ) {
        token = IERC20(_token);
        voter = _voter;
        assetTokens = _assetTokens;
        bribeTokens = _bribeTokens;
        burnTardTech = _burnTardTech;
        treasury = _treasury;
        developer = _developer;
        incentives = _treasury;

        OTOKEN = IVoter(_voter).OTOKEN();
        vaultToken = address(new VaultToken());
        rewardVault = IBerachainRewardVaultFactory(_vaultFactory).createRewardVault(vaultToken);
    }

    function depositFor(address account, uint256 amount) 
        public
        virtual
        nonZeroInput(amount)
        onlyBurnTardTech
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
        onlyBurnTardTech
        nonReentrant
    {
        emit Plugin__Withdrawn(account, amount);

        IGauge(gauge)._withdraw(account, amount);

        IBerachainRewardVault(rewardVault).delegateWithdraw(account, amount);
        VaultToken(vaultToken).burn(address(this), amount);

    }

    function claimAndDistribute() external nonReentrant {
        uint256 balance = address(this).balance;
        if (balance > DURATION) {
            uint256 bribeAmount = balance * 40 / 100;
            uint256 incentivesAmount = balance * 40 / 100;
            uint256 developerAmount = balance * 10 / 100;
            uint256 treasuryAmount = balance - bribeAmount - incentivesAmount - developerAmount;

            IWBERA(address(token)).deposit{value: balance}();
            
            token.safeTransfer(developer, developerAmount);
            token.safeTransfer(treasury, treasuryAmount);

            uint256 totalIncentiveAmount = bribeAmount + incentivesAmount;
            if (activeBribes) {
                if (activeIncentives) {
                    token.safeTransfer(incentives, incentivesAmount);
                    token.safeApprove(bribe, 0);
                    token.safeApprove(bribe, bribeAmount);
                    IBribe(bribe).notifyRewardAmount(address(token), bribeAmount);
                    emit Plugin__ClaimedAndDistributed(bribeAmount, incentivesAmount, developerAmount, treasuryAmount);
                } else {
                    token.safeApprove(bribe, 0);
                    token.safeApprove(bribe, totalIncentiveAmount);
                    IBribe(bribe).notifyRewardAmount(address(token), totalIncentiveAmount);
                    emit Plugin__ClaimedAndDistributed(totalIncentiveAmount, 0, developerAmount, treasuryAmount);
                }
            } else {
                token.safeTransfer(incentives, totalIncentiveAmount);
                emit Plugin__ClaimedAndDistributed(0, totalIncentiveAmount, developerAmount, treasuryAmount);
            }
        }
    }

    receive() external payable {}

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /**
     * @notice Owner can enable/disable auto-bribe (where fees are sent to the bribe contract instead of the treasury).
     * @param _activeBribes The new boolean setting.
     */
    function setActiveBribes(bool _activeBribes) external onlyOwner {
        activeBribes = _activeBribes;
        emit Plugin__ActiveBribesSet(activeBribes);
    }

    /**
     * @notice Owner can enable/disable active incentives (where fees are sent to the incentives contract instead of the treasury).
     * @param _activeIncentives The new boolean setting.
     */
    function setActiveIncentives(bool _activeIncentives) external onlyOwner {
        activeIncentives = _activeIncentives;
        emit Plugin__ActiveIncentivesSet(activeIncentives);
    }

    /**
     * @notice Owner can update the treasury address.
     * @param _treasury The new treasury address.
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert Plugin__InvalidZeroAddress();
        treasury = _treasury;
        emit Plugin__TreasurySet(treasury);
    }

    /**
     * @notice Owner can update the developer address.
     * @param _developer The new developer address.
     */
    function setDeveloper(address _developer) external {
        if (msg.sender != developer) revert Plugin__NotAuthorizedDeveloper();
        if (_developer == address(0)) revert Plugin__InvalidZeroAddress();
        developer = _developer;
        emit Plugin__DeveloperSet(developer);
    }

    function setIncentives(address _incentives) external onlyOwner {
        if (_incentives == address(0)) revert Plugin__InvalidZeroAddress();
        incentives = _incentives;
        emit Plugin__IncentivesSet(incentives);
    }

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;
    }

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