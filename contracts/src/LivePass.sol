// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title LivePass — configurable concert tickets, for the Sepolia course project.
/// @notice Deposits are refundable collateral, never payment or organizer revenue.
contract LivePass is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using Strings for address;

    enum ResalePolicy { Closed, Open, Detect }
    struct Show {
        string name;
        string poster;
        uint256 price;
        bool saleOpen;
        bool rulesFrozen;
        ResalePolicy resalePolicy;
        uint256 minStake;
        uint256 nextTicketNo;
    }

    uint256 public constant STAKE_COOLDOWN = 10 minutes;
    uint256 public constant MIN_STAKE_FLOOR = 0.001 ether;
    uint256 public showCount;
    uint256 public ticketRevenue;
    uint256 public totalStaked;
    uint256 private _nextTokenId = 1;
    mapping(uint256 => Show) public shows;
    mapping(uint256 => address) public issuer;
    // Purchase history: these are intentionally NOT rewritten on NFT transfers.
    mapping(address => mapping(uint256 => bool)) public hasBought;
    mapping(address => mapping(uint256 => uint256)) public ticketOf;
    mapping(uint256 => uint256) public tokenShow;
    mapping(uint256 => uint256) public ticketNumber;
    mapping(uint256 => address) public mintHolder;
    mapping(uint256 => uint256) public mintedAt;
    mapping(uint256 => bool) public used;
    mapping(address => uint256) public stakeOf;
    mapping(address => uint256) public stakeSince;

    event ShowCreated(uint256 indexed showId, string name, string poster, uint256 price, uint8 resalePolicy, uint256 minStake);
    event PriceUpdated(uint256 indexed showId, uint256 newPrice);
    event ResalePolicyUpdated(uint256 indexed showId, uint8 resalePolicy);
    event StakeRequirementUpdated(uint256 indexed showId, uint256 minStake);
    event SaleToggled(uint256 indexed showId, bool open);
    event Staked(address indexed fan, uint256 amount, uint256 total);
    event Unstaked(address indexed fan, uint256 amount);
    event TicketBought(uint256 indexed showId, address indexed buyer, uint256 indexed tokenId, uint256 price);
    event TicketIssued(uint256 indexed showId, uint256 indexed tokenId, address indexed issuer, address buyer);
    event TicketVerified(uint256 indexed showId, uint256 indexed tokenId, address indexed venue);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address initialOwner) ERC721("LivePass", "LIVEPASS") Ownable(initialOwner) {}

    function createShow(string calldata showName, string calldata poster, uint256 price, uint8 policy, uint256 minStake)
        external onlyOwner returns (uint256 showId)
    {
        _validateName(showName);
        require(bytes(poster).length <= 2048, "Poster too long");
        require(price > 0, "Price must be positive");
        _validatePolicy(policy);
        _validateStake(minStake);
        showId = showCount++;
        shows[showId] = Show(showName, poster, price, false, false, ResalePolicy(policy), minStake, 1);
        issuer[showId] = msg.sender;
        emit ShowCreated(showId, showName, poster, price, policy, minStake);
    }

    function setPrice(uint256 showId, uint256 newPrice) external onlyOwner {
        Show storage show = _editable(showId);
        require(newPrice > 0, "Price must be positive");
        show.price = newPrice;
        emit PriceUpdated(showId, newPrice);
    }

    function setResalePolicy(uint256 showId, uint8 policy) external onlyOwner {
        Show storage show = _editable(showId);
        _validatePolicy(policy);
        show.resalePolicy = ResalePolicy(policy);
        emit ResalePolicyUpdated(showId, policy);
    }

    function setStakeRequirement(uint256 showId, uint256 minStake) external onlyOwner {
        Show storage show = _editable(showId);
        _validateStake(minStake);
        show.minStake = minStake;
        emit StakeRequirementUpdated(showId, minStake);
    }

    function openSale(uint256 showId) external onlyOwner {
        Show storage show = _show(showId);
        show.saleOpen = true;
        show.rulesFrozen = true;
        emit SaleToggled(showId, true);
    }

    function closeSale(uint256 showId) external onlyOwner {
        _show(showId).saleOpen = false;
        emit SaleToggled(showId, false);
    }

    function stake() external payable nonReentrant {
        require(msg.value > 0, "Stake must be positive");
        stakeOf[msg.sender] += msg.value;
        totalStaked += msg.value;
        stakeSince[msg.sender] = block.timestamp;
        emit Staked(msg.sender, msg.value, stakeOf[msg.sender]);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(stakeOf[msg.sender] >= amount, "Insufficient stake");
        stakeOf[msg.sender] -= amount;
        totalStaked -= amount;
        if (stakeOf[msg.sender] == 0) stakeSince[msg.sender] = 0;
        emit Unstaked(msg.sender, amount);
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    function buy(uint256 showId) external payable nonReentrant returns (uint256 tokenId) {
        Show storage show = _show(showId);
        require(show.saleOpen, "Sale is not open");
        require(!hasBought[msg.sender][showId], "One ticket per wallet");
        require(msg.value == show.price, "Send the exact ticket price");
        if (show.minStake > 0) {
            require(stakeOf[msg.sender] >= show.minStake, "Insufficient stake");
            require(block.timestamp >= stakeSince[msg.sender] + STAKE_COOLDOWN, "Stake cooling down");
        }
        tokenId = _nextTokenId++;
        uint256 number = show.nextTicketNo++;
        hasBought[msg.sender][showId] = true;
        ticketOf[msg.sender][showId] = number;
        tokenShow[tokenId] = showId;
        ticketNumber[tokenId] = number;
        mintHolder[tokenId] = msg.sender;
        mintedAt[tokenId] = block.timestamp;
        ticketRevenue += msg.value;
        // Emit issuance before the receiver callback can make an onward transfer.
        emit TicketBought(showId, msg.sender, tokenId, msg.value);
        emit TicketIssued(showId, tokenId, issuer[showId], msg.sender);
        _safeMint(msg.sender, tokenId);
    }

    function verify(uint256 showId, uint256 tokenId) external onlyOwner nonReentrant {
        address holder = _requireOwned(tokenId);
        require(tokenShow[tokenId] == showId, "Ticket does not belong to this show");
        require(!used[tokenId], "Ticket already used");
        require(shows[showId].resalePolicy != ResalePolicy.Detect || holder == mintHolder[tokenId], "Resale not permitted");
        used[tokenId] = true;
        emit TicketVerified(showId, tokenId, msg.sender);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = ticketRevenue;
        require(amount > 0, "No ticket revenue");
        ticketRevenue = 0;
        emit Withdrawn(msg.sender, amount);
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    function provenance(uint256 tokenId) external view returns (
        address issuerAddress, address firstBuyer, address currentHolder, uint256 mintTime, bool isUsed
    ) {
        currentHolder = _requireOwned(tokenId);
        return (issuer[tokenShow[tokenId]], mintHolder[tokenId], currentHolder, mintedAt[tokenId], used[tokenId]);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        address holder = _requireOwned(tokenId);
        string memory status = _status(tokenId, holder);
        string memory json = string.concat(
            '{"name":"', shows[tokenShow[tokenId]].name, ' - Ticket #', ticketNumber[tokenId].toString(),
            '","description":"LivePass concert ticket. On-chain ownership and verification are authoritative.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(_svg(tokenId, holder, status))),
            '","attributes":[{"trait_type":"Status","value":"', status, '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _status(uint256 tokenId, address holder) private view returns (string memory) {
        if (used[tokenId]) return "VERIFIED - ADMIT";
        if (holder == mintHolder[tokenId]) return "UNUSED - VALID";
        if (shows[tokenShow[tokenId]].resalePolicy == ResalePolicy.Open) return "TRANSFERRED - ADMISSIBLE";
        return "RESOLD - NOT ADMISSIBLE";
    }

    function _svg(uint256 tokenId, address holder, string memory status) private view returns (string memory) {
        string memory head = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="440" viewBox="0 0 900 440">',
            '<rect width="900" height="440" rx="24" fill="#100b20"/>',
            '<g fill="#e6e3f5" font-family="sans-serif"><text x="28" y="42" font-size="24">LIVEPASS</text>',
            '<text x="28" y="90" font-size="18">', shows[tokenShow[tokenId]].name,
            '</text><text x="28" y="128">Show #', tokenShow[tokenId].toString(),
            ' / Ticket #', ticketNumber[tokenId].toString(), ' / Token #', tokenId.toString(), '</text>'
        );
        return string.concat(head,
            '<text x="28" y="170">Issuer: ', issuer[tokenShow[tokenId]].toHexString(), '</text>',
            '<text x="28" y="208">First buyer: ', mintHolder[tokenId].toHexString(), '</text>',
            '<text x="28" y="246">Current holder: ', holder.toHexString(), '</text>',
            '<text x="28" y="284">Minted at: ', mintedAt[tokenId].toString(), '</text>',
            '<text x="28" y="332" fill="#c9a7ff">', status, '</text>',
            '<text x="28" y="390">Screenshot is not proof of admission.</text></g></svg>'
        );
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        // Revert rolls back the complete ERC721 update. Minting is always allowed.
        if (from != address(0) && to != address(0)) {
            require(shows[tokenShow[tokenId]].resalePolicy != ResalePolicy.Closed, "Resale not permitted");
        }
    }

    function _show(uint256 showId) private view returns (Show storage show) {
        require(showId < showCount, "Show does not exist");
        return shows[showId];
    }

    function _editable(uint256 showId) private view returns (Show storage show) {
        show = _show(showId);
        require(!show.rulesFrozen, "Rules are frozen after sale opens");
    }

    function _validatePolicy(uint8 policy) private pure {
        require(policy <= uint8(ResalePolicy.Detect), "Invalid resale policy");
    }

    function _validateStake(uint256 amount) private pure {
        require(amount == 0 || amount >= MIN_STAKE_FLOOR, "Stake requirement below minimum");
    }

    /// @dev Validate UTF-8 and count Unicode scalar values, rather than UTF-8 bytes.
    /// Forbid JSON/XML delimiters because names are rendered into both formats.
    function _validateName(string calldata value) private pure {
        bytes memory data = bytes(value);
        require(data.length > 0 && data.length <= 256, "Invalid show name");
        require(data[0] != 0x20 && data[data.length - 1] != 0x20, "Invalid show name");
        uint256 count;
        for (uint256 i; i < data.length;) {
            uint8 c = uint8(data[i]);
            require(c >= 0x20 && c != 0x7f && c != 0x22 && c != 0x5c && c != 0x3c && c != 0x3e && c != 0x26, "Invalid show name");
            uint256 size;
            if (c < 0x80) size = 1;
            else if (c >= 0xc2 && c <= 0xdf) size = 2;
            else if (c >= 0xe0 && c <= 0xef) size = 3;
            else if (c >= 0xf0 && c <= 0xf4) size = 4;
            else revert("Invalid show name");
            require(i + size <= data.length, "Invalid show name");
            for (uint256 j = 1; j < size; ++j) {
                uint8 next = uint8(data[i + j]);
                require(next >= 0x80 && next <= 0xbf, "Invalid show name");
            }
            if (size >= 3) {
                uint8 second = uint8(data[i + 1]);
                require(!(c == 0xe0 && second < 0xa0) && !(c == 0xed && second >= 0xa0)
                    && !(c == 0xf0 && second < 0x90) && !(c == 0xf4 && second >= 0x90), "Invalid show name");
            }
            i += size;
            ++count;
        }
        require(count <= 64, "Invalid show name");
    }
}
