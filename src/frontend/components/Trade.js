import { useState, useEffect } from 'react'
import { Row, Col, Card, Button, Form } from 'react-bootstrap'

const Trade = ({ marketplace, nft, account }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [ownItems, setOwnItems] = useState([])
  const [trades, setTrades] = useState([]) // Store ongoing trades
  const [tradeInitiate, setTradeInitiate] = useState({}) // Track trade initiation data

  const loadItems = async () => {
    const itemCount = await marketplace.itemCount()
    let loadedItems = []

    for (let i = 1; i <= itemCount; i++) {
      const item = await marketplace.items(i)

      if (item.listedForTrade) {
        try {
          const uri = await nft.tokenURI(item.tokenId)
          const response = await fetch(uri)
          const metadata = await response.json()

          loadedItems.push({
            itemId: item.itemId.toNumber(), // Convert BigNumber to number
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            owner: item.owner
          })
        } catch (error) {
          console.error(`Error fetching metadata for tokenId ${item.tokenId}:`, error)
        }
      }
    }

    setLoading(false)
    setItems(loadedItems)
  }

  const loadOwnNFTs = async () => {
    const itemCount = await marketplace.itemCount()
    let loadedItems = []

    for (let i = 1; i <= itemCount; i++) {
      const item = await marketplace.items(i)

      if (item.owner.toLowerCase() == account) {
        try {
          const uri = await nft.tokenURI(item.tokenId)
          const response = await fetch(uri)
          const metadata = await response.json()

          loadedItems.push({
            itemId: item.itemId.toNumber(), // Convert BigNumber to number
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            owner: item.owner
          })
        } catch (error) {
          console.error(`Error fetching metadata for tokenId ${item.tokenId}:`, error)
        }
      }
    }

    setLoading(false)
    setOwnItems(loadedItems)
  }


  const loadTrades = async () => {
    const tradeCount = await marketplace.tradeCount() // Ensure this matches your contract
    let loadedTrades = []
  
    for (let i = 1; i <= tradeCount.toNumber(); i++) { // Convert BigNumber to number
      const trade = await marketplace.trades(i)
  
      if (!trade.completed) {
        // Fetch metadata for the items involved in the trade
        const item1 = await marketplace.items(trade.itemId1)
        const item2 = await marketplace.items(trade.itemId2)
  
        const uri1 = await nft.tokenURI(item1.tokenId)
        const uri2 = await nft.tokenURI(item2.tokenId)
  
        const metadata1 = await (await fetch(uri1)).json()
        const metadata2 = await (await fetch(uri2)).json()
  
        loadedTrades.push({
          tradeId: trade.tradeId.toNumber(), // Convert BigNumber to number
          item1: {
            id: trade.itemId1.toNumber(),
            name: metadata1.name,
            description: metadata1.description,
            image: metadata1.image,
            owner: item1.owner,
          },
          item2: {
            id: trade.itemId2.toNumber(),
            name: metadata2.name,
            description: metadata2.description,
            image: metadata2.image,
            owner: item2.owner,
          },
          trader1: trade.trader1,
          trader2: trade.trader2,
          approvedByTrader1: trade.approvedByTrader1,
          approvedByTrader2: trade.approvedByTrader2,
        })
      }
    }
    console.log(loadedTrades)
    setTrades(loadedTrades)
  }
  

  const initiateTrade = async (itemId1, itemId2) => {
    try {
      await (await marketplace.proposeTrade(itemId1, itemId2)).wait()
      alert(`Trade initiated between items ${itemId1} and ${itemId2}.`)
      loadTrades()
    } catch (error) {
      console.error("Error initiating trade:", error)
      alert("Failed to initiate trade. Please try again.")
    }
  }

  const approveTrade = async (tradeId) => {
    try {
      await (await marketplace.approveTrade(tradeId)).wait()
      alert(`Trade ${tradeId} approved.`)
      loadTrades()
    } catch (error) {
      console.error("Error approving trade:", error)
      alert("Failed to approve trade. Please try again.")
    }
  }

  const handleTradeSelection = (itemId1, itemId2) => {
    setTradeInitiate({ itemId1, itemId2 })
  }

  useEffect(() => {
    loadItems()
    loadOwnNFTs()
    loadTrades()
  }, [])

  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <h2>Loading...</h2>
    </main>
  )

  return (
    <div className="flex justify-center">
      <div className="px-5 container">
        <h2>Available Items</h2>
        <Row xs={1} md={2} lg={4} className="g-4 py-5">
          {items.map((item, idx) => (
            <Col key={idx} className="overflow-hidden">
              <Card className='m-4 custom_card'>
                <Card.Img variant="top" src={item.image} />
                <Card.Body>
                  <Card.Title>{item.name}</Card.Title>
                  <Card.Text>{item.description}</Card.Text>
                  <p>Owner: {item.owner}</p>
                </Card.Body>
                <Card.Footer>
                  <Form.Control
                    as="select"
                    onChange={(e) => handleTradeSelection(item.itemId, parseInt(e.target.value))}
                  >
                    <option value="">Select Item to Trade</option>
                    {ownItems.filter((i) => i.itemId !== item.itemId).map((otherItem) => (
                      <option key={otherItem.itemId} value={otherItem.itemId}>
                        {otherItem.name} (ID: {otherItem.itemId})
                      </option>
                    ))}
                  </Form.Control>
                  <div className="d-grid mt-2">
                    <Button
                      onClick={() => initiateTrade(tradeInitiate.itemId1, tradeInitiate.itemId2)}
                      variant="primary"
                      size="md"
                      disabled={!tradeInitiate.itemId1 || !tradeInitiate.itemId2}
                    >
                      Initiate Trade
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>

        <h2>Ongoing Trades</h2>
          {trades.length > 0 ? (
            <Row xs={1} className="g-4 py-5">
              {trades.map((trade, idx) => (
                <Col key={idx} className="overflow-hidden">
                  <Card>
                    <Card.Body>
                      <Card.Title>Trade ID: {trade.tradeId}</Card.Title>
                      <Row className="align-items-center">
                        {/* Item 1 */}
                        <Col md={6} className="text-center">
                          <Card.Img
                            variant="top"
                            src={trade.item1.image}
                            style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                          />
                          <Card.Text>
                            <strong>{trade.item1.name}</strong><br />
                            {trade.item1.description}<br />
                            <small>Owner 1: {trade.item1.owner}</small>
                          </Card.Text>
                        </Col>
                        {/* Item 2 */}
                        <Col md={6} className="text-center">
                          <Card.Img
                            variant="top"
                            src={trade.item2.image}
                            style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                          />
                          <Card.Text>
                            <strong>{trade.item2.name}</strong><br />
                            {trade.item2.description}<br />
                            <small>Owner 2: {trade.item2.owner}</small>
                          </Card.Text>
                        </Col>
                      </Row>
                    </Card.Body>
                    <Card.Footer>
                      <div className="d-grid">
                        <Button
                          onClick={() => approveTrade(trade.tradeId)}
                          variant="success"
                          size="lg"
                          disabled={trade.approvedByTrader1 && trade.approvedByTrader2}
                        >
                          Approve Trade
                        </Button>
                      </div>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <p>No ongoing trades</p>
          )}
      </div>
    </div>
  )
}

export default Trade
