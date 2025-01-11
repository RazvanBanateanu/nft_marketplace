import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'

export default function MyNFTs({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [listedItems, setListedItems] = useState([])
  const [prices, setPrices] = useState({}) 
  const [auctionData, setAuctionData] = useState({}) // To store auction inputs

  const loadListedItems = async () => {
    // Load all sold items that the user listed
    const itemCount = await marketplace.itemCount()
    let listedItems = []
    for (let indx = 1; indx <= itemCount; indx++) {
      const i = await marketplace.items(indx)
      if (i.owner.toLowerCase() === account) {
        // get uri url from nft contract
        const uri = await nft.tokenURI(i.tokenId)
        // use uri to fetch the nft metadata stored on ipfs 
        const response = await fetch(uri)
        const metadata = await response.json()
        // get total price of item (item price + fee)
        const totalPrice = await marketplace.getTotalPrice(i.itemId)
        // define listed item object
        let item = {
          totalPrice,
          price: i.price,
          itemId: i.itemId,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image
        }
        listedItems.push(item)
      }
    }
    setLoading(false)
    setListedItems(listedItems)
  }

  const handlePriceChange = (itemId, value) => {
    setPrices({
      ...prices,
      [itemId]: value
    })
  }

  const handleAuctionChange = (itemId, field, value) => {
    setAuctionData({
      ...auctionData,
      [itemId]: {
        ...auctionData[itemId],
        [field]: value
      }
    })
  }

  const handleSellItem = async (itemId) => {
    const priceInEth = prices[itemId];
  
    // Validate price input
    if (!priceInEth || ethers.utils.parseEther(priceInEth).lte(0)) {
      alert("Please enter a valid price greater than 0.");
      return;
    }
  
    try {
      // Convert price to Wei for the transaction
      const priceInWei = ethers.utils.parseEther(priceInEth);
  
      // Call the relistItem function from the contract
      const tx = await marketplace.listItem(itemId, priceInWei, {
        from: account,
      });
  
      // Wait for the transaction to be mined
      await tx.wait();
  
      alert(`Item with ID ${itemId} relisted for ${priceInEth} ETH.`);
    } catch (error) {
      console.error("Error relisting item:", error);
      alert("Error relisting item.");
    }
  };

  const handleStartAuction = async (itemId) => {
    const { startingPrice, duration } = auctionData[itemId] || {};

    // Validate inputs
    if (!startingPrice || ethers.utils.parseEther(startingPrice).lte(0)) {
      alert("Please enter a valid starting price greater than 0.");
      return;
    }
    if (!duration || isNaN(duration) || duration <= 0) {
      alert("Please enter a valid auction duration in seconds.");
      return;
    }

    try {
      // Convert price to Wei and duration to integer
      const startingPriceInWei = ethers.utils.parseEther(startingPrice);
      const durationInSeconds = parseInt(duration, 10);

      // Call the createAuction function from the contract
      const tx = await marketplace.createAuction(itemId, startingPriceInWei, durationInSeconds, {
        from: account,
      });

      // Wait for the transaction to be mined
      await tx.wait();

      alert(`Auction started for item ${itemId} with starting price ${startingPrice} ETH and duration ${duration} seconds.`);
    } catch (error) {
      console.error("Error starting auction:", error);
      alert("Error starting auction.");
    }
  };

  const handleEndAuction = async (itemId) => {
    try {
      const tx = await marketplace.endAuction(itemId, {
        from: account,
      });
  
      // Wait for the transaction to be mined
      await tx.wait();
  
      alert(`Auction ended for item ${itemId}.`);
      loadListedItems(); // Refresh the listed items
    } catch (error) {
      console.error("Error ending auction:", error);
      alert("Error ending auction.");
    }
  };

  const handleListForTrade = async (itemId) => {
    try {
      const tx = await marketplace.createTrade(itemId, {
        from: account,
      });
  
      // Wait for the transaction to be mined
      await tx.wait();
  
      alert(`Item id: ${itemId} listed for trade.`);
      loadListedItems(); // Refresh the listed items
    } catch (error) {
      console.error("Error listing for trade:", error);
      alert("Error listing for trade.");
    }
  };



  useEffect(() => {
    loadListedItems()
  }, [])
  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <h2>Loading...</h2>
    </main>
  )

  return (
    <div className="flex justify-center">
      {listedItems.length > 0 ?
        <div className="px-5 py-3 container">
            <h2>Owned</h2>
          <Row xs={1} md={2} lg={4} className="g-4 py-3">
            {listedItems.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card className='m-4 custom_card'>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body>
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Text>{item.description}</Card.Text>
                  </Card.Body>
                    <Card.Footer>
                      <div>
                        <Form.Control
                          type="text"
                          placeholder="Enter price in ETH"
                          value={prices[item.itemId] || ''}
                          onChange={(e) => handlePriceChange(item.itemId, e.target.value)}
                        />
                        <Button
                          variant="primary"
                          className="mt-2"
                          onClick={() => handleSellItem(item.itemId)}
                        >
                          List Item
                        </Button>
                      </div>
                      <div className="mt-1">
                        <Form.Control
                          type="text"
                          placeholder="Starting Price (ETH)"
                          value={auctionData[item.itemId]?.startingPrice || ''}
                          onChange={(e) => handleAuctionChange(item.itemId, 'startingPrice', e.target.value)}
                        />
                        <Form.Control
                          type="number"
                          placeholder="Duration (seconds)"
                          value={auctionData[item.itemId]?.duration || ''}
                          className="mt-2"
                          onChange={(e) => handleAuctionChange(item.itemId, 'duration', e.target.value)}
                        />
                      </div>
                      <div className="mt-1 d-flex justify-content-between">
                        <Button
                          variant="success"
                          className="mt-2"
                          onClick={() => handleStartAuction(item.itemId)}
                        >
                          Start Auction
                        </Button>

                        <Button
                          variant="danger"
                          className="mt-2"
                          onClick={() => handleEndAuction(item.itemId)}
                          disabled={item.endTime > Math.floor(Date.now() / 1000)} // Disable if auction hasn't ended
                        >
                          End Auction
                        </Button>
                        {item.endTime > Math.floor(Date.now() / 1000) && (
                          <small className="text-muted">Auction is still active</small>
                        )}
                      </div>
                      <div className="mt-1">
                        <Button
                          variant="success"
                          className="mt-2"
                          onClick={() => handleListForTrade(item.itemId)}
                        >
                          List For Trade
                        </Button>
                      </div>
                    </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
        : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No listed assets</h2>
          </main>
        )}
    </div>
  );
}
