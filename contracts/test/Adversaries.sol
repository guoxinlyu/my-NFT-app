// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IPass {
    function stake() external payable;
    function unstake(uint256) external;
    function buy(uint256) external payable returns (uint256);
    function withdraw() external;
    function transferFrom(address, address, uint256) external;
}

/// @dev Only compiled for local tests. Not part of the deployable product.
contract Adversary is IERC721Receiver {
    IPass public immutable target;
    bool public rejectETH;
    bool public rejectNFT;
    bool public reenter;
    bool public reentrySucceeded;
    bytes4 public reentryError;
    address public forwardTo;
    constructor(address pass) { target = IPass(pass); }
    function configure(bool ethReject, bool nftReject, bool attack, address forward) external {
        rejectETH = ethReject; rejectNFT = nftReject; reenter = attack; forwardTo = forward;
    }
    function deposit() external payable { target.stake{value: msg.value}(); }
    function refund(uint256 amount) external { target.unstake(amount); }
    function purchase(uint256 showId) external payable { target.buy{value: msg.value}(showId); }
    function collect() external { target.withdraw(); }
    receive() external payable {
        require(!rejectETH, "Reject ETH");
        if (reenter) {
            bytes memory result;
            (reentrySucceeded, result) = address(target).call(abi.encodeCall(IPass.unstake, (msg.value)));
            reentryError = bytes4(result);
        }
    }
    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        require(!rejectNFT, "Reject NFT");
        if (reenter) {
            bytes memory result;
            (reentrySucceeded, result) = address(target).call(abi.encodeCall(IPass.buy, (0)));
            reentryError = bytes4(result);
        }
        if (forwardTo != address(0)) target.transferFrom(address(this), forwardTo, tokenId);
        return IERC721Receiver.onERC721Received.selector;
    }
}
