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
    uint public tradeCount;

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        address owner;
        bool listedForSale;
        bool listedForAuction;
        bool listedForTrade;
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

    struct Trade {
        uint tradeId;
        uint itemId1;
        uint itemId2;
        address participant1;
        address participant2;
    }


    mapping(uint => Item) public items;
    mapping(uint => Auction) public auctions;
    mapping(uint => Trade) public trades;



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

    event TradeCreated(
        uint tradeId,
        uint itemId,
        address owner
    );

    event TradeProposed(
        uint tradeId,
        uint itemId1,
        uint itemId2,
        address participant1,
        address participant2
    );

    event TradeApproved(
        uint tradeId,
        address participant
    );

    event TradeCompleted(
        uint tradeId,
        uint itemId1,
        uint itemId2,
        address participant1,
        address participant2
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
        // add new item to items mapping
        items[itemCount] = Item (
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(address(0)),
            msg.sender, // the initial owner is the seller
            false,
            false,
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

    function listItem(uint _itemId, uint _newPrice) external nonReentrant {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        require(msg.sender == item.owner, "Only the current owner can relist the item");
        require(_newPrice > 0, "Price must be greater than zero");
        require(!item.listedForTrade, "Item must not be listed for trade");
        require(!item.listedForAuction, "Item must not be listed for auction");
        require(!item.listedForSale, "Item must not be already listed for sale");

        // Transfer the NFT back to the contract
        item.nft.transferFrom(msg.sender, address(this), item.tokenId);

        // Modify the existing item rather than creating a new one
        item.price = _newPrice;
        item.seller = payable(msg.sender);  // Set the new seller to the current owner
        item.listedForSale = true;  // Mark the item as not listedForSale, so it can be listed again
        item.owner = msg.sender; // Ensure the listing owner is correctly set

        // Emit the Offered event for the relisted item
        emit Offered(
            _itemId,
            address(item.nft),
            item.tokenId,
            _newPrice,
            msg.sender,
            msg.sender 
        );
    }

    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        require(msg.value >= _totalPrice, "Not enough ether to cover item price and market fee");
        require(item.listedForSale, "Item not listed for sale.");
        require(item.owner != msg.sender, "You are the owner of this item");

        // Pay seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);

        // Update item to listedForSale
        item.listedForSale = false;
        item.listedForAuction = false;
        item.listedForTrade = false;

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

    function createTrade(uint _itemId) external nonReentrant {
        Item storage item = items[_itemId];

        
        require(item.owner == msg.sender, "You must own the item to propose a trade");
        require(!item.listedForTrade, "Item must not be already listed for trade");
        require(!item.listedForAuction, "Item must not be listed for auction");
        require(!item.listedForSale, "Item must not be listed for sale");

        item.listedForTrade = true;

        item.nft.transferFrom(msg.sender, address(this), item.tokenId);

    }
     
    function proposeTrade(uint _itemId1, uint _itemId2) external nonReentrant {
        Item storage item1 = items[_itemId1];
        Item storage item2 = items[_itemId2];

        require(item2.owner == msg.sender, "You must own the item to propose a trade");
        require(item1.owner != item2.owner, "You must not be the owner of the item proposed for trade");
        require(item1.listedForTrade, "Item must be available for trade");
        
        tradeCount++;

        trades[tradeCount] = Trade(
            tradeCount,
            _itemId1,
            _itemId2,
            item1.owner,
            item2.owner
        );

        item2.nft.transferFrom(msg.sender, address(this), item2.tokenId);
 
        emit TradeProposed(tradeCount, _itemId1, _itemId2, item1.owner, item2.owner);
    }

    function approveTrade(uint _tradeId) external nonReentrant {
        Trade storage trade = trades[_tradeId];

        require(trade.tradeId > 0, "Trade does not exist");
        require(msg.sender == trade.participant1, "You are not the owner of this trade");

        emit TradeApproved(_tradeId, msg.sender);

        completeTrade(_tradeId);

    }

    function completeTrade(uint _tradeId) internal {
        Trade storage trade = trades[_tradeId];

        Item storage item1 = items[trade.itemId1];
        Item storage item2 = items[trade.itemId2];

        // Swap ownership
        address tempOwner = item1.owner;
        item1.owner = item2.owner;
        item2.owner = tempOwner;

        // Transfer NFTs
        item1.nft.transferFrom(address(this), item1.owner, item1.tokenId);
        item2.nft.transferFrom(address(this), item2.owner, item2.tokenId);

        // Mark both items as listedForSale to complete the trade
        item1.listedForSale = true;
        item2.listedForSale = true;

        emit TradeCompleted(_tradeId, trade.itemId1, trade.itemId2, trade.participant1, trade.participant2);
        item1.listedForSale = false;
        item1.listedForAuction = false;
        item1.listedForTrade = false;
        item2.listedForSale = false;
        item2.listedForAuction = false;
        item2.listedForTrade = false;
        delete trades[_tradeId];
    }
       // I am here

    function createAuction(uint _itemId, uint _startingPrice, uint _duration) external nonReentrant {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(msg.sender == item.owner, "only the owner can create an auction");
        require(!item.listedForAuction, "item already listed for auction");
        require(!item.listedForSale, "item already listed for sale");
        require(!item.listedForTrade, "item already listed for trade");
        require(_startingPrice > 0, "Starting price must be greater than zero");

        item.nft.transferFrom(msg.sender, address(this), item.tokenId);
        
        item.listedForAuction = true;
        
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
        require(msg.value > auction.startingPrice, "bid must be higher than current highest bid");
        
        // Refund previous highest bidder securely using call
        if (auction.highestBid > 0) {
            (bool success, ) = auction.highestBidder.call{value: auction.highestBid}("");
            require(success, "Refund to previous highest bidder failed");
        }

        emit BidPlaced(_itemId, msg.value, msg.sender);

        // Update the auction with the new bid
        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);
    }


    function endAuction(uint _itemId) external payable nonReentrant {
        Auction storage auction = auctions[_itemId];
        Item storage item = items[_itemId];
        
        require(block.timestamp >= auction.endTime, "auction not yet ended");
        require(!auction.ended, "auction already ended");

        auction.ended = true;
        
        
        if (auction.highestBid > 0) {
            // Check if the auction contract has enough funds to pay the seller
            require(address(this).balance >= auction.highestBid, 
            string(abi.encodePacked("Insufficient contract balance ", 
            uintToString(address(this).balance), ", needed ", 
            uintToString(auction.highestBid))));

            // Pay the seller
            auction.seller.transfer(auction.highestBid);
            
            // Transfer the NFT to the highest bidder
            if (auction.highestBidder != address(0)) {
                item.nft.transferFrom(address(this), auction.highestBidder, item.tokenId);
                item.listedForSale = false;
                item.listedForAuction = false;
                item.listedForTrade = false;
                item.owner = auction.highestBidder;
            } else {
                // If no bidder exists (address(0)), revert the item to the seller
                item.nft.transferFrom(address(this), auction.seller, item.tokenId);
            }

            emit AuctionEnded(_itemId, auction.highestBid, auction.highestBidder);
        } 
        else {
            // No bids, NFT remains with the seller
            item.nft.transferFrom(address(this), auction.seller, item.tokenId);
            item.listedForSale = false;
            item.listedForAuction = false;
            item.listedForTrade = false;
        }
    }


    function getTotalPrice(uint _itemId) view public returns(uint){
        return((items[_itemId].price*(100 + feePercent))/100);
    }

    function uintToString(uint256 value) internal pure returns (string memory) {
    if (value == 0) return "0";
    uint256 temp = value;
    uint256 digits;
    while (temp != 0) {
        digits++;
        temp /= 10;
    }
    bytes memory buffer = new bytes(digits);
    while (value != 0) {
        digits -= 1;
        buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
        value /= 10;
    }
    return string(buffer);
}


}
