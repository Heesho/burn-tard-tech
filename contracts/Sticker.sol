
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IPlugin {
    function depositFor(address account, uint256 amount) external;
    function withdrawTo(address account, uint256 amount) external;
}

contract Sticker is ERC721, ERC721Enumerable, ERC721URIStorage, ReentrancyGuard, Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant INITIAL_PRICE = 0.01 ether;
    uint256 public constant MAX_SUPPLY = 10000;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public treasury;
    address public plugin;
    uint256 public nextTokenId;

    mapping(uint256 => uint256) public id_Price;
    mapping(uint256 => address) public id_Creator;

    /*----------  ERRORS ------------------------------------------------*/

    error Sticker__InsufficientValue();
    error Sticker__InvalidTokenId();
    error Sticker__MaxSupplyReached();
    error Sticker__TransferDisabled();

    /*----------  EVENTS ------------------------------------------------*/

    event Sticker__Create(uint256 indexed tokenId, address indexed creator, string uri);
    event Sticker__Buy(uint256 indexed tokenId, address indexed previousOwner, address indexed newOwner, uint256 price);
    event Sticker__Sell(uint256 indexed tokenId, address indexed owner, uint256 price);

    /*----------  MODIFIERS  --------------------------------------------*/

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor() 
        ERC721("StickerNet", "STKR")
    {
        treasury = msg.sender;
    }

    function create(address to, string memory uri) public payable nonReentrant {
        if (msg.value != INITIAL_PRICE) revert Sticker__InsufficientValue();
        uint256 tokenId = nextTokenId++;
        id_Price[tokenId] = INITIAL_PRICE;
        id_Creator[tokenId] = to;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        if (nextTokenId > MAX_SUPPLY) revert Sticker__MaxSupplyReached();

        emit Sticker__Create(tokenId, to, uri);

        payable(treasury).transfer(INITIAL_PRICE * 10 / 100);
        payable(plugin).transfer(INITIAL_PRICE * 10 / 100);

        IPlugin(plugin).depositFor(to, INITIAL_PRICE);
    }

    function buy(uint256 tokenId) public payable nonReentrant {
        if (ownerOf(tokenId) == address(0)) revert Sticker__InvalidTokenId();
        if (msg.value != id_Price[tokenId] * 2) revert Sticker__InsufficientValue();

        uint256 previousPrice = id_Price[tokenId];
        address previousOwner = ownerOf(tokenId);

        id_Price[tokenId] = msg.value;
        _transfer(previousOwner, msg.sender, tokenId);

        emit Sticker__Buy(tokenId, previousOwner, msg.sender, msg.value);

        payable(previousOwner).transfer((previousPrice * 80 / 100) + (id_Price[tokenId] * 15 / 100));
        payable(id_Creator[tokenId]).transfer(id_Price[tokenId] * 2 / 100);
        payable(plugin).transfer(id_Price[tokenId] * 2 / 100);
        payable(treasury).transfer(id_Price[tokenId] * 1 / 100);

        IPlugin(plugin).withdrawTo(previousOwner, previousPrice);
        IPlugin(plugin).depositFor(msg.sender, id_Price[tokenId]);
        
    }

    function sell(uint256 tokenId) public nonReentrant {
        if (msg.sender != ownerOf(tokenId)) revert Sticker__InvalidTokenId();

        uint256 previousPrice = id_Price[tokenId];
        address previousOwner = ownerOf(tokenId);

        id_Price[tokenId] = previousPrice * 80 / 100;
        _burn(tokenId);

        emit Sticker__Sell(tokenId, previousOwner, previousPrice * 80 / 100);

        payable(previousOwner).transfer(previousPrice * 80 / 100);

        IPlugin(plugin).withdrawTo(previousOwner, previousPrice);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    /*---------- RESTRICTED FUNCTIONS ----------------------------------*/

    function setPlugin(address _plugin) public onlyOwner {
        plugin = _plugin;
    }

    function setTreasury(address _treasury) public onlyOwner {
        treasury = _treasury;
    }

    /*----------  OVERRIDES  --------------------------------------------*/

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        revert Sticker__TransferDisabled();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        revert Sticker__TransferDisabled();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721, IERC721) {
        revert Sticker__TransferDisabled();
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