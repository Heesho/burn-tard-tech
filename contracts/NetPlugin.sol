// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

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

interface IFactory {
    function tokenId_Power(uint256 tokenId) external view returns (uint256);
}

interface IUnits {
    function mint(address account, uint256 amount) external;
}

interface IBerachainRewardsVaultFactory {
    function createRewardsVault(address _vaultToken) external returns (address);
}

interface IRewardVault {
    function delegateStake(address account, uint256 amount) external;
    function delegateWithdraw(address account, uint256 amount) external;
}

contract VaultToken is ERC20, Ownable {
    constructor() ERC20("Bull Ish Vault Token", "BIVT") {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

contract QueuePlugin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant BASE_UPC = 0.000005 ether;
    uint256 public constant QUEUE_SIZE = 100;
    uint256 public constant DURATION = 7 days;
    uint256 public constant MESSAGE_LENGTH = 69;
    
    string public constant SYMBOL = "BULL ISH";
    string public constant PROTOCOL = "Bullas";

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20Metadata private immutable underlying;
    address private immutable OTOKEN;
    address private immutable voter;
    address private gauge;
    address private bribe;
    address[] private tokensInUnderlying;
    address[] private bribeTokens;

    address public immutable units;
    address public immutable factory;
    address public immutable key;

    address public immutable vaultToken;  // staking token address for Berachain Rewards Vault Delegate Stake
    address public immutable rewardVault;   // reward vault address for Berachain Rewards Vault Delegate Stake

    uint256 public entryFee = 0.4269 ether;
    address public treasury;
    bool public randomMint = true;

    struct Click {
        uint256 tokenId;
        uint256 power;
        address account;
        string message;
    }

    mapping(uint256 => Click) public queue;
    uint256 public head = 0;
    uint256 public tail = 0;
    uint256 public count = 0;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__InvalidZeroInput();
    error Plugin__NotAuthorizedVoter();
    error Plugin__NotAuthorized();
    error Plugin__InvalidPayment();
    error Plugin__InvalidTokenId();
    error Plugin__InvalidMessage();
    error Plugin__DeadlinePassed();
    error Plugin__EpochIdMismatch();
    error Plugin__ExceedsMaxPayment();

    /*----------  EVENTS ------------------------------------------------*/

    event Plugin__ClaimedAnDistributed();
    event Plugin__ClickAdded(uint256 tokenId, address author, uint256 power, string message);
    event Plugin__ClickRemoved(uint256 tokenId, address author, uint256 power, string message);
    event Plugin__TreasurySet(address treasury);
    event Plugin__EntryFeeSet(uint256 fee);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Plugin__InvalidZeroInput();
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying,                    // WBERA
        address _voter, 
        address[] memory _tokensInUnderlying,   // [WBERA]
        address[] memory _bribeTokens,          // [WBERA]
        address _treasury,
        address _factory,
        address _units,
        address _key,
        address _vaultFactory
    ) {
        underlying = IERC20Metadata(_underlying);
        voter = _voter;
        tokensInUnderlying = _tokensInUnderlying;
        bribeTokens = _bribeTokens;
        treasury = _treasury;
        factory = _factory;
        units = _units;
        key = _key;
        OTOKEN = IVoter(_voter).OTOKEN();
        
        vaultToken = address(new VaultToken());
        rewardVault = IBerachainRewardsVaultFactory(_vaultFactory).createRewardsVault(address(vaultToken));
    }

    function claimAndDistribute() 
        external 
        nonReentrant
    {
        uint256 balance = address(this).balance;
        if (balance > DURATION) {
            address token = getUnderlyingAddress();
            IWBERA(token).deposit{value: balance}();
            uint256 treasuryFee = balance / 5;
            IERC20(token).safeTransfer(treasury, treasuryFee);
            IERC20(token).safeApprove(bribe, 0);
            IERC20(token).safeApprove(bribe, balance - treasuryFee);
            IBribe(bribe).notifyRewardAmount(token, balance - treasuryFee);
        }
    }

    function click(uint256 tokenId, string calldata message)         
        external
        payable
        nonReentrant 
        returns (uint256 mintAmount)
    {
        if (bytes(message).length == 0) revert Plugin__InvalidMessage();
        if (bytes(message).length > MESSAGE_LENGTH) revert Plugin__InvalidMessage();

        if (msg.value < entryFee) revert Plugin__InvalidPayment();

        uint256 currentIndex = tail % QUEUE_SIZE;
        address account = IERC721(key).ownerOf(tokenId);
        if (account == address(0)) revert Plugin__InvalidTokenId();

        if (count == QUEUE_SIZE) {
            IGauge(gauge)._withdraw(queue[head].account, queue[head].power);

            // Berachain Rewards Vault Delegate Stake
            IRewardVault(rewardVault).delegateWithdraw(account, queue[head].power);
            VaultToken(vaultToken).burn(address(this), queue[head].power);

            emit Plugin__ClickRemoved(queue[head].tokenId, queue[head].account, queue[head].power, queue[head].message);
            head = (head + 1) % QUEUE_SIZE;
        }

        uint256 power = getPower(tokenId);
        mintAmount = randomMint ? power * getRandomMultiplier() : power;
        queue[currentIndex] = Click(tokenId, power, account, message);
        tail = (tail + 1) % QUEUE_SIZE;
        count = count < QUEUE_SIZE ? count + 1 : count;
        emit Plugin__ClickAdded(tokenId, account, queue[currentIndex].power, message);

        IGauge(gauge)._deposit(account, queue[currentIndex].power);

        // Berachain Rewards Vault Delegate Stake
        VaultToken(vaultToken).mint(address(this), queue[currentIndex].power);
        IERC20(vaultToken).safeApprove(rewardVault, 0);
        IERC20(vaultToken).safeApprove(rewardVault, queue[currentIndex].power);
        IRewardVault(rewardVault).delegateStake(account, queue[currentIndex].power);

        IUnits(units).mint(account, mintAmount);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit Plugin__TreasurySet(_treasury);
    }

    function setEntryFee(uint256 _entryFee) external onlyOwner {
        entryFee = _entryFee;
        emit Plugin__EntryFeeSet(_entryFee);
    }

    function setRandomMint(bool _randomMint) external onlyOwner {
        randomMint = _randomMint;
    }

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;
    }

    function setBribe(address _bribe) external onlyVoter {
        bribe = _bribe;
    }

    function getRandomMultiplier() internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        ))) % 100; 
        if (random < 80) {
            return 1;
        } else if (random < 90) {
            return 2;
        } else if (random < 96) {
            return 3;
        } else if (random < 99) {
            return 5;
        } else {
            return 10;
        }
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getPrice() external view returns (uint256) {
        return entryFee;
    }

    function balanceOf(address account) public view returns (uint256) {
        return IGauge(gauge).balanceOf(account);
    }

    function totalSupply() public view returns (uint256) {
        return IGauge(gauge).totalSupply();
    }

    function getUnderlyingName() public view virtual returns (string memory) {
        return SYMBOL;
    }

    function getUnderlyingSymbol() public view virtual returns (string memory) {
        return SYMBOL;
    }

    function getUnderlyingAddress() public view virtual returns (address) {
        return address(underlying);
    }

    function getUnderlyingDecimals() public view virtual returns (uint8) {
        return underlying.decimals();
    }

    function getProtocol() public view virtual returns (string memory) {
        return PROTOCOL;
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

    function getTokensInUnderlying() public view virtual returns (address[] memory) {
        return tokensInUnderlying;
    }

    function getBribeTokens() public view returns (address[] memory) {
        return bribeTokens;
    }

    function getPower(uint256 tokenId) public view returns (uint256) {
        return BASE_UPC + (BASE_UPC * IFactory(factory).tokenId_Power(tokenId));
    }

    function getQueueSize() public view returns (uint256) {
        return count;
    }

    function getClick(uint256 index) public view returns (Click memory) {
        return queue[(head + index) % QUEUE_SIZE];
    }

    function getQueueFragment(uint256 start, uint256 end) public view returns (Click[] memory) {
        Click[] memory result = new Click[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = queue[(head + i) % QUEUE_SIZE];
        }
        return result;
    }

    function getQueue() public view returns (Click[] memory) {
        Click[] memory result = new Click[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = queue[(head + i) % QUEUE_SIZE];
        }
        return result;
    }

}