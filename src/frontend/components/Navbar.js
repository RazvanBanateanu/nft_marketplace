import {
    Link
} from "react-router-dom";
import { Navbar, Nav, Button, Container } from 'react-bootstrap'
import logo from './logo.jpeg'

const Navigation = ({ web3Handler, account }) => {
    return (
        <Navbar expand="lg" bg="warning" variant="black">
            <Container>
                <Navbar.Brand>
                    <img src={logo} width="60" height="50" className="" alt="" />
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link as={Link} to="/auction">Auction</Nav.Link>
                        <Nav.Link as={Link} to="/trade">Trade</Nav.Link>
                        <Nav.Link as={Link} to="/my-listed-items">My Listed NFTs</Nav.Link>
                        <Nav.Link as={Link} to="/my-nfts">My NFTs</Nav.Link>
                        <Nav.Link as={Link} to="/create">Create NFT</Nav.Link>
                    </Nav>
                    <Nav>
                        {account ? (
                            <Nav.Link
                                href={`https://etherscan.io/address/${account}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="button nav-button btn-sm mx-4">
                                <Button variant="outline-light">
                                    {account.slice(0, 5) + '...' + account.slice(38, 42)}
                                </Button>

                            </Nav.Link>
                        ) : (
                            <Button onClick={web3Handler} variant="outline-light">Connect Wallet</Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )

}

export default Navigation;