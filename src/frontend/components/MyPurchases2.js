import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'

export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [listedItems, setListedItems] = useState([])
  const [prices, setPrices] = useState({}) 
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
      const tx = await marketplace.relistItem(itemId, priceInWei, {
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
                <Card>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body>
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Text>{item.description}</Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <div>
                      <p>Price: {ethers.utils.formatEther(item.price)} ETH</p>
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