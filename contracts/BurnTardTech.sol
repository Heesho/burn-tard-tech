// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IPlugin {
    function depositFor(address account, uint256 amount) external;
    function withdrawTo(address account, uint256 amount) external;
}

contract BurnTardTech is ERC721, ERC721Enumerable, ERC721URIStorage, ReentrancyGuard, Ownable {
    using Math for uint256;

    /*----------  CONSTANTS  --------------------------------------------*/

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public plugin;

    uint256 public nextTokenId;
    uint256 public initialTuition = 1 ether;
    uint256 public classSize = 10;
    uint256 public creditRequirement = 10 ether;
    uint256 public timeRequirement = 1 days;
    bool public openAdmissions;

    mapping(address => bool) public account_Admitted;
    mapping(uint256 => uint256) public id_Tuition;
    mapping(uint256 => uint256) public id_LastPlagiarized;
    mapping(uint256 => address) public id_Creator;
    mapping(uint256 => bool) public id_Graduated;
    mapping(uint256 => bool) public id_Expelled;

    /*----------  ERRORS ------------------------------------------------*/

    error BurnTardTech__TransferDisabled();
    error BurnTardTech__NotAdmitted();
    error BurnTardTech__NotWorksOwner();
    error BurnTardTech__InvalidWorks();
    error BurnTardTech__FullClass();
    error BurnTardTech__InvalidClassSize();
    error BurnTardTech__WorksGraduated();
    error BurnTardTech__WorksExpelled();
    error BurnTardTech__InsufficientCredits();
    error BurnTardTech__AlreadyInitialized();
    error BurnTardTech__InvalidTuitionAmount();
    error BurnTardTech__TransferFailed();
    error BurnTardTech__InvalidAccount();
    error BurnTardTech__InsufficientTime();

    /*----------  EVENTS ------------------------------------------------*/

    event BurnTardTech__Enrolled(address indexed creator, uint256 indexed tokenId, string uri);
    event BurnTardTech__Plagiarized(address indexed newOwner, uint256 indexed tokenId, uint256 newTuition);
    event BurnTardTech__Expelled(uint256 indexed tokenId);
    event BurnTardTech__Graduated(uint256 indexed tokenId, uint256 permanentTuition);
    event BurnTardTech__ClassSizeSet(uint256 classSize);
    event BurnTardTech__InitialTuitionSet(uint256 initialTuition);
    event BurnTardTech__AccountAdmissionsSet(address indexed account, bool admitted);
    event BurnTardTech__OpenAdmissionsSet(bool openAdmissions);
    event BurnTardTech__CreditRequirementSet(uint256 creditRequirement);
    event BurnTardTech__TimeRequirementSet(uint256 timeRequirement);
    event BurnTardTech__Initialized(address plugin);

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor() ERC721("BurnTardTech", "BurnTardTech") {}

    function enroll(address account, string memory uri) public payable nonReentrant {
        if (!openAdmissions && !account_Admitted[account]) revert BurnTardTech__NotAdmitted();
        if (nextTokenId >= classSize) revert BurnTardTech__FullClass();
        if (msg.value != initialTuition) revert BurnTardTech__InvalidTuitionAmount();

        account_Admitted[account] = false;
        uint256 tokenId = nextTokenId++;
        id_Tuition[tokenId] = initialTuition;
        id_Creator[tokenId] = account;
        id_LastPlagiarized[tokenId] = block.timestamp;
        _safeMint(account, tokenId);
        _setTokenURI(tokenId, uri);

        emit BurnTardTech__Enrolled(account, tokenId, uri);

        (bool success, ) = plugin.call{value: initialTuition}("");
        if (!success) revert BurnTardTech__TransferFailed();

        IPlugin(plugin).depositFor(account, initialTuition);
    }

    function plagiarize(address account,uint256 tokenId) public payable nonReentrant {
        if (account == address(0)) revert BurnTardTech__InvalidAccount();
        if (ownerOf(tokenId) == address(0)) revert BurnTardTech__InvalidWorks();
        if (id_Graduated[tokenId]) revert BurnTardTech__WorksGraduated();
        if (id_Expelled[tokenId]) revert BurnTardTech__WorksExpelled();

        uint256 previousTuition = id_Tuition[tokenId];
        address previousOwner = ownerOf(tokenId);
        uint256 newTuition = previousTuition * 11 / 10;
        uint256 surplus = newTuition - previousTuition;

        if (msg.value != newTuition) revert BurnTardTech__InvalidTuitionAmount();

        id_Tuition[tokenId] = newTuition;
        id_LastPlagiarized[tokenId] = block.timestamp;
        _transfer(previousOwner, account, tokenId);

        emit BurnTardTech__Plagiarized(account, tokenId, newTuition);

        (bool success1,) = previousOwner.call{value: previousTuition + (surplus * 4 / 10)}("");
        if (!success1) revert BurnTardTech__TransferFailed();

        (bool success2,) = plugin.call{value: surplus * 4 / 10}("");
        if (!success2) revert BurnTardTech__TransferFailed();

        (bool success3,) = id_Creator[tokenId].call{value: surplus * 2 / 10}("");
        if (!success3) revert BurnTardTech__TransferFailed();

        IPlugin(plugin).withdrawTo(previousOwner, previousTuition);
        IPlugin(plugin).depositFor(account, newTuition);
    }

    function expel(uint256 tokenId) public nonReentrant {
        if (msg.sender != ownerOf(tokenId) && msg.sender != owner()) revert BurnTardTech__NotWorksOwner();
        if (id_Graduated[tokenId]) revert BurnTardTech__WorksGraduated();
        if (id_Expelled[tokenId]) revert BurnTardTech__WorksExpelled();

        address owner = ownerOf(tokenId);
        uint256 tuition = id_Tuition[tokenId];

        id_Expelled[tokenId] = true;
        classSize++;

        emit BurnTardTech__Expelled(tokenId);

        IPlugin(plugin).withdrawTo(owner, tuition);
    }

    function graduate(uint256 tokenId) public nonReentrant {
        if (ownerOf(tokenId) == address(0)) revert BurnTardTech__InvalidWorks();
        if (id_Expelled[tokenId]) revert BurnTardTech__WorksExpelled();
        if (id_Graduated[tokenId]) revert BurnTardTech__WorksGraduated();
        if (id_Tuition[tokenId] < creditRequirement) revert BurnTardTech__InsufficientCredits();
        if (block.timestamp < id_LastPlagiarized[tokenId] + timeRequirement) revert BurnTardTech__InsufficientTime();

        address owner = ownerOf(tokenId);
        address creator = id_Creator[tokenId];
        uint256 tuition = id_Tuition[tokenId];
        uint256 permanentTuition = (tuition * 1e18).sqrt();

        id_Graduated[tokenId] = true;
        classSize++;

        emit BurnTardTech__Graduated(tokenId, permanentTuition);

        IPlugin(plugin).withdrawTo(owner, tuition);
        IPlugin(plugin).depositFor(owner, permanentTuition);
        IPlugin(plugin).depositFor(creator, permanentTuition);
    }

    /*---------- RESTRICTED FUNCTIONS ----------------------------------*/

    function setInitialTuition(uint256 _initialTuition) public onlyOwner {
        initialTuition = _initialTuition;
        emit BurnTardTech__InitialTuitionSet(_initialTuition);
    }

    function setClassSize(uint256 _classSize) public onlyOwner {
        if (_classSize <= classSize) revert BurnTardTech__InvalidClassSize();
        classSize = _classSize;
        emit BurnTardTech__ClassSizeSet(_classSize);
    }

    function setCreditRequirement(uint256 _creditRequirement) public onlyOwner {
        creditRequirement = _creditRequirement;
        emit BurnTardTech__CreditRequirementSet(_creditRequirement);
    }

    function setTimeRequirement(uint256 _timeRequirement) public onlyOwner {
        timeRequirement = _timeRequirement;
        emit BurnTardTech__TimeRequirementSet(_timeRequirement);
    }

    function setAccountAdmissions(address[] calldata _accounts, bool _admitted) public onlyOwner {
        for (uint256 i = 0; i < _accounts.length; i++) {
            account_Admitted[_accounts[i]] = _admitted;
            emit BurnTardTech__AccountAdmissionsSet(_accounts[i], _admitted);
        }
    }

    function setOpenAdmissions(bool _openAdmissions) public onlyOwner {
        openAdmissions = _openAdmissions;
        emit BurnTardTech__OpenAdmissionsSet(_openAdmissions);
    }

    function initialize(address _plugin) public onlyOwner {
        if (plugin != address(0)) revert BurnTardTech__AlreadyInitialized();
        plugin = _plugin;
        emit BurnTardTech__Initialized(plugin);
    }

    /*----------  OVERRIDES  --------------------------------------------*/

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        revert BurnTardTech__TransferDisabled();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        revert BurnTardTech__TransferDisabled();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721, IERC721) {
        revert BurnTardTech__TransferDisabled();
    }

    function _beforeTokenTransfer(
        address from, 
        address to, 
        uint256 firsTokenId, 
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firsTokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /*----------  VIEW FUNCTIONS ----------------------------------------*/

    function getNextTuition(uint256 tokenId) public view returns (uint256) {
        return id_Tuition[tokenId] * 11 / 10;
    }
    
}