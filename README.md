# NFT Marketplace

## **Description**  
The **NFT Marketplace** is a platform designed to empower creators and collectors in the blockchain ecosystem. Users can seamlessly create, trade, sell, and auction NFTs (non-fungible tokens) using a secure and intuitive interface.  

### **Key Features**  
- **NFT Creation:** Mint unique digital assets directly on the platform.  
- **Trading and Selling:** Peer-to-peer trading and direct NFT sales with integrated wallet support.  
- **Auctions:** A competitive auction system for rare and valuable NFTs.  
- **Secure Transactions:** Blockchain-based ownership tracking and enforcement of creator royalties.  
- **Galleries:** Showcase NFT collections in visually appealing digital galleries.  

This project aims to make NFTs accessible to everyone by combining blockchain security with user-friendly design.  

---

## Setting Up
1. Clone the Repository
2. Install Dependencies:

    cd nft_marketplace
    npm install

3. Boot up local development blockchain

    npx hardhat node

4. Connect development blockchain accounts to Metamask

5. Deploy Smart Contracts

npx hardhat run src/backend/scripts/deploy.js --network localhost

6. Launch Frontend

    npm run start