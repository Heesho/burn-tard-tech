
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IPlugin {
    function depositFor(address account, uint256 amount) external;
    function withdrawTo(address account, uint256 amount) external;
}

contract HenloTech is ERC721, ERC721Enumerable, ERC721URIStorage, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant INITIAL_TUITION = 0.01 ether;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable token;
    address public plugin;

    uint256 public nextTokenId;
    uint256 public classSize = 10;
    uint256 public graduationRequirement = 10 ether;

    mapping(uint256 => uint256) public id_Tuition;
    mapping(uint256 => uint256) public id_LastPlagiarized;
    mapping(uint256 => address) public id_Creator;
    mapping(uint256 => bool) public id_Graduated;
    mapping(uint256 => bool) public id_Expelled;

    /*----------  ERRORS ------------------------------------------------*/

    error HenloTech__TransferDisabled();
    error HenloTech__NotWorksOwner();
    error HenloTech__InvalidWorks();
    error HenloTech__FullClass();
    error HenloTech__InvalidClassSize();
    error HenloTech__WorksGraduated();
    error HenloTech__WorksExpelled();
    error HenloTech__InsufficientCredits();
    error HenloTech__AlreadyInitialized();
    /*----------  EVENTS ------------------------------------------------*/

    event HenloTech__Enrolled(address indexed creator, uint256 indexed tokenId, string uri);
    event HenloTech__Plagiarized(address indexed newOwner, uint256 indexed tokenId, uint256 newTuition);
    event HenloTech__Expelled(address indexed owner, uint256 indexed tokenId);
    event HenloTech__Graduated(address indexed owner, address indexed creator, uint256 indexed tokenId);
    event HenloTech__ClassSizeSet(uint256 classSize);
    event HenloTech__Initialized(address plugin);

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _token, address _plugin) 
        ERC721("HenloTech", "HenloTech")
    {
        token = _token;
        plugin = _plugin;
    }

    function enroll(address account, string memory uri) public nonReentrant {
        if (nextTokenId > classSize) revert HenloTech__FullClass();

        uint256 tokenId = nextTokenId++;
        id_Tuition[tokenId] = INITIAL_TUITION;
        id_Creator[tokenId] = account;
        id_LastPlagiarized[tokenId] = block.timestamp;
        _safeMint(account, tokenId);
        _setTokenURI(tokenId, uri);

        emit HenloTech__Enrolled(account, tokenId, uri);

        IERC20(token).safeTransferFrom(msg.sender, plugin, INITIAL_TUITION);
        IPlugin(plugin).depositFor(account, INITIAL_TUITION);
    }

    function plagiarize(address account,uint256 tokenId) public nonReentrant {
        if (ownerOf(tokenId) == address(0)) revert HenloTech__InvalidWorks();
        if (id_Graduated[tokenId]) revert HenloTech__WorksGraduated();
        if (id_Expelled[tokenId]) revert HenloTech__WorksExpelled();

        uint256 previousTuition = id_Tuition[tokenId];
        address previousOwner = ownerOf(tokenId);
        uint256 newTuition = previousTuition * 11 / 10;
        uint256 surplus = newTuition - previousTuition;

        id_Tuition[tokenId] = newTuition;
        id_LastPlagiarized[tokenId] = block.timestamp;
        _transfer(previousOwner, account, tokenId);

        emit HenloTech__Plagiarized(previousOwner, account, tokenId, newTuition);

        IERC20(token).transferFrom(msg.sender, previousOwner, previousTuition + (surplus * 5 / 10));
        IERC20(token).safeTransferFrom(msg.sender, plugin, surplus * 4 / 10);
        IERC20(token).safeTransferFrom(msg.sender, id_Creator[tokenId], surplus * 1 / 10);

        IPlugin(plugin).withdrawTo(previousOwner, previousTuition);
        IPlugin(plugin).depositFor(account, newTuition);
    }

    function expell(uint256 tokenId) public nonReentrant {
        if (msg.sender != ownerOf(tokenId)) revert HenloTech__NotWorksOwner();
        if (id_Graduated[tokenId]) revert HenloTech__WorksGraduated();
        if (id_Expelled[tokenId]) revert HenloTech__WorksExpelled();

        address owner = ownerOf(tokenId);
        uint256 tuition = id_Tuition[tokenId];

        id_Expelled[tokenId] = true;
        classSize++;

        emit HenloTech__Expelled(tokenId);

        IPlugin(plugin).withdrawTo(owner, tuition);
    }

    function graduate(uint256 tokenId) public nonReentrant {
        if (ownerOf(tokenId) == address(0)) revert HenloTech__InvalidWorks();
        if (id_Expelled[tokenId]) revert HenloTech__WorksExpelled();
        if (id_Graduated[tokenId]) revert HenloTech__WorksGraduated();
        if (id_Tuition[tokenId] < graduationRequirement) revert HenloTech__InsufficientCredits();

        address owner = ownerOf(tokenId);
        address creator = id_Creator[tokenId];
        uint256 tuition = id_Tuition[tokenId];
        uint256 permanentTuition = (tuition * 1e18).sqrt();

        id_Graduated[tokenId] = true;
        classSize++;

        emit HenloTech__Graduated(tokenId, permanentTuition);

        IPlugin(plugin).withdrawTo(owner, tuition);
        IPlugin(plugin).depositFor(owner, permanentTuition);
        IPlugin(plugin).depositFor(creator, permanentTuition);
    }

    /*---------- RESTRICTED FUNCTIONS ----------------------------------*/

    function ownerExpell(uint256 tokenId) public nonReentrant onlyOwner {
        if (id_Graduated[tokenId]) revert HenloTech__WorksGraduated();
        if (id_Expelled[tokenId]) revert HenloTech__WorksExpelled();

        address owner = ownerOf(tokenId);
        uint256 tuition = id_Tuition[tokenId];

        id_Expelled[tokenId] = true;
        classSize++;

        emit HenloTech__Expelled(tokenId);

        IPlugin(plugin).withdrawTo(owner, tuition);
    }

    function setClassSize(uint256 _classSize) public onlyOwner {
        if (_classSize <= classSize) revert HenloTech__InvalidClassSize();
        classSize = _classSize;
        emit HenloTech__ClassSizeSet(_classSize);
    }

    function setGraduationRequirement(uint256 _graduationRequirement) public onlyOwner {
        graduationRequirement = _graduationRequirement;
        emit HenloTech__GraduationRequirementSet(_graduationRequirement);
    }

    function initialize(address _plugin) public onlyOwner {
        if (plugin != address(0)) revert HenloTech__AlreadyInitialized();
        plugin = _plugin;
        emit HenloTech__Initialized(plugin);
    }

    /*----------  OVERRIDES  --------------------------------------------*/

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        revert HenloTech__TransferDisabled();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        revert HenloTech__TransferDisabled();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721, IERC721) {
        revert HenloTech__TransferDisabled();
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

}