import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'

const Auction = ({ marketplace, nft }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [bids, setBids] = useState({}) // Store bid amounts

  const loadAuctionItems = async () => {
    const itemCount = await marketplace.itemCount()
    let auctionItems = []
  
    for (let i = 1; i <= itemCount; i++) {
      const item = await marketplace.items(i)
      const auction = await marketplace.auctions(i)
  
      if (!auction.ended && auction.endTime > Math.floor(Date.now() / 1000)) {
        try {
          const uri = await nft.tokenURI(item.tokenId)
          const response = await fetch(uri)
          const metadata = await response.json()
  
          auctionItems.push({
            itemId: item.itemId,
            highestBid: auction.highestBid,
            highestBidder: auction.highestBidder,
            endTime: auction.endTime,
            seller: item.seller,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image
          })
        } catch (error) {
          console.error(`Error fetching metadata for tokenId ${item.tokenId}:`, error)
        }
      }
    }
  
    setLoading(false)
    setItems(auctionItems)
  }

  const placeBid = async (item) => {
    const bidAmount = bids[item.itemId]
    if (!bidAmount || ethers.utils.parseEther(bidAmount).lte(0)) {
      alert("Please enter a valid bid amount.")
      return
    }
    console.log("Auction Item:", item);
    console.log("Bid Amount:", bidAmount);

    try {
      await (await marketplace.bid(item.itemId, { value: ethers.utils.parseEther(bidAmount) })).wait()
      alert(`Bid placed for ${bidAmount} ETH on item ${item.name}.`)
      loadAuctionItems()
    } catch (error) {
      console.error("Error placing bid:", error)
      alert("Failed to place bid. Please try again.")
    }
  }

  const handleBidChange = (itemId, value) => {
    setBids({
      ...bids,
      [itemId]: value
    })
  }

  useEffect(() => {
    loadAuctionItems()
  }, [])

  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <h2>Loading...</h2>
    </main>
  )

  return (
    <div className="flex justify-center">
      {items.length > 0 ?
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {items.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card className='custom_card'>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body color="secondary">
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Text>
                      {item.description}
                    </Card.Text>
                    <p>Highest Bid: {ethers.utils.formatEther(item.highestBid)} ETH</p>
                    <p>Highest Bidder: {item.highestBidder || "None"}</p>
                    <p>Auction Ends: {new Date(item.endTime * 1000).toLocaleString()}</p>
                  </Card.Body>
                  <Card.Footer>
                    <Form.Control
                      type="text"
                      placeholder="Enter bid amount in ETH"
                      value={bids[item.itemId] || ''}
                      onChange={(e) => handleBidChange(item.itemId, e.target.value)}
                    />
                    <div className='d-grid mt-2'>
                      <Button onClick={() => placeBid(item)} variant="primary" size="lg">
                        Place Bid
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
            <h2>No active auctions</h2>
          </main>
        )}
    </div>
  )
}

export default Auction
