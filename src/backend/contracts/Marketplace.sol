// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard {

    // Variables
    address payable public immutable feeAccount; // the account that receives fees
    uint public immutable feePercent; // the fee percentage on sales 
    uint public itemCount; 

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        address owner;
        bool sold;
    }

    struct Auction {
        uint itemId;
        uint startingPrice;
        uint highestBid;
        address payable highestBidder;
        uint endTime;
        bool ended;
        address payable seller;
    }

    // itemId -> Item
    mapping(uint => Item) public items;

    // itemId -> Auction
    mapping(uint => Auction) public auctions;

    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed owner
    );

    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    event AuctionCreated(
        uint itemId,
        uint startingPrice,
        uint endTime,
        address indexed seller
    );

    event BidPlaced(
        uint itemId,
        uint bidAmount,
        address indexed bidder
    );

    event AuctionEnded(
        uint itemId,
        uint highestBid,
        address indexed highestBidder
    );

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    // Make item to offer on the marketplace
    function makeItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        // increment itemCount
        itemCount ++;
        // transfer nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        // add new item to items mapping
        items[itemCount] = Item (
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            msg.sender, // the initial owner is the seller
            false
        );
        // emit Offered event
        emit Offered(
            itemCount,
            address(_nft),
            _tokenId,
            _price,
            msg.sender,
            msg.sender // seller is also the owner initially
        );
    }

    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(msg.value >= _totalPrice, "not enough ether to cover item price and market fee");
        require(!item.sold, "item already sold");

        // Pay seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);

        // Update item to sold
        item.sold = true;

        // Update the owner to the buyer
        item.owner = msg.sender;

        // Transfer NFT to buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        
        // Emit Bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    function getTotalPrice(uint _itemId) view public returns(uint){
        return((items[_itemId].price*(100 + feePercent))/100);
    }

    function relistItem(uint _itemId, uint _newPrice) external nonReentrant {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(item.sold, "item has not been sold yet");
        require(msg.sender == item.owner, "only the current owner can relist the item");
        require(_newPrice > 0, "Price must be greater than zero");

        // Transfer the NFT back to the contract
        item.nft.transferFrom(msg.sender, address(this), item.tokenId);

        // Modify the existing item rather than creating a new one
        item.price = _newPrice;
        item.seller = payable(msg.sender);  // Set the new seller to the current owner
        item.sold = false;  // Mark the item as not sold, so it can be listed again
        item.owner = msg.sender; // Ensure the relisting owner is correctly set

        // Emit the Offered event for the relisted item
        emit Offered(
            _itemId, // Use the existing itemId to avoid creating a new one
            address(item.nft),
            item.tokenId,
            _newPrice,
            msg.sender,
            msg.sender // new owner is the one relisting
        );
    }

    function createAuction(uint _itemId, uint _startingPrice, uint _duration) external nonReentrant {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(msg.sender == item.owner, "only the owner can create an auction");
        require(item.sold, "item already sold");
        require(_startingPrice > 0, "Starting price must be greater than zero");

        item.nft.transferFrom(msg.sender, address(this), item.tokenId);
        
        uint endTime = block.timestamp + _duration;
        auctions[_itemId] = Auction(
            _itemId,
            _startingPrice,
            0,
            payable(address(0)),
            endTime,
            false,
            payable(msg.sender)
        );

        

        emit AuctionCreated(_itemId, _startingPrice, endTime, msg.sender);
    }

    function bid(uint _itemId) external payable nonReentrant {
        Auction storage auction = auctions[_itemId];
        require(block.timestamp < auction.endTime, "auction ended");
        require(msg.value > auction.highestBid, "bid must be higher than current highest bid");

        // Refund previous highest bidder
        if (auction.highestBid > 0) {
            auction.highestBidder.transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        emit BidPlaced(_itemId, msg.value, msg.sender);
    }

    function endAuction(uint _itemId) external nonReentrant {
        Auction storage auction = auctions[_itemId];
        require(block.timestamp >= auction.endTime, "auction not yet ended");
        require(!auction.ended, "auction already ended");

        auction.ended = true;

        if (auction.highestBid > 0) {
            // Pay the seller
            auction.seller.transfer(auction.highestBid);

            // Transfer the NFT to the highest bidder
            Item storage item = items[_itemId];
            item.nft.transferFrom(address(this), auction.highestBidder, item.tokenId);
            item.sold = true;
            item.owner = auction.highestBidder;

            emit AuctionEnded(_itemId, auction.highestBid, auction.highestBidder);
        } else {
            // No bids, NFT remains with the seller
            Item storage item = items[_itemId];
            item.nft.transferFrom(address(this), auction.seller, item.tokenId);
        }
    }
}
