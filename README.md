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
0. Clone the Repository

1. Add .env file with your Pinata KEYS:

    ```bash
    REACT_APP_PINATA_API_KEY=''
    REACT_APP_PINATA_SECRET_API_KEY=''
    REACT_APP_PINATA_SECRET_ACCESS_TOKEN=''
    
2. Install Dependencies:

    ```bash
    cd nft_marketplace
    npm install

3. Boot up local development blockchain
    ```bash
    npx hardhat node

4. Connect development blockchain accounts to Metamask

5. Deploy Smart Contracts

    ```bash
    npx hardhat run src/backend/scripts/deploy.js --network localhost

6. Launch Frontend

    ```bash
    npm run start