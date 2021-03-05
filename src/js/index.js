import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import Web3 from 'web3'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Container, Nav, Navbar, Jumbotron, Button, Form, Card } from 'react-bootstrap'
import Create from './create'
import View from './view'
import NetworkIcon from '../../assets/network_icon.png'
import UserIcon from '../../assets/user_icon.png'
const CryptoSEO = require('../../build/contracts/CryptoSEO')
const LinkToken = require('../../build/contracts/LinkTokenInterface')
const LinkAddress = {
  "networks" : {
    "1": "0x514910771af9ca656af840dff83e8264ecf986ca",
    "4": "0x01BE23585060835E02B77ef475b0Cc51aA1e0709",
    "5": "0x326c977e6efc84e512bb9c30f76e30c160ed06fb",
    "42": "0xa36085F69e2889c224210F603D836748e7dC0088"
  }
}
const networkNames = {
  "1": "Mainnet",
  "3": "Ropsten",
  "4": "Rinkeby",
  "5": "Goerli",
  "42": "Kovan"
}

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
    }
    this.selectPage = props.selectPage
  }

  render(){
    return (
      <Jumbotron>
        <h1>Welcome to Crypto SEO</h1>
        <p>
          This is a simple <a href="https://www.wikiwand.com/en/Decentralized_application">dApp</a> which
          enables users to create a commitment which enforces pay-for-performance search result rank increases.
        </p>
        <br />
        <br />
        <p>
          <Button variant="primary" onClick={() => {this.selectPage({name: "about"})}}>Learn more</Button>
        </p>
      </Jumbotron>      
    )
  }
}

class About extends Component {
  constructor(props) {
    super(props)
    this.state = {
    }
  }

  render(){
    return (
      <Jumbotron>
        <h1>About</h1>
        <p>
          Here's how it works...
        </p>
      </Jumbotron>      
    )
  }
}

class App extends Component {
  constructor(props){
     super(props)
     this.state = {
      page: {name: "home"},
      eth: {
        accounts: [],
        currentAccount: null,
        networkName: "Not connected"
      }
     }

     if (ethereum) {
      console.log("Using web3 detected from external source like Metamask")
      this.web3 = new Web3(ethereum)
      ethereum.on('accountsChanged', this.handleAccountsChanged)
      ethereum.on('chainChanged', this.handleChainChanged)
      ethereum.on('connect', this.handleConnect)
      ethereum.on('disconnect', this.handleDisconnect)
      // ethereum.autoRefreshOnNetworkChange = false
    } else {
      console.error("No web3 detected.")
      return
    }
  }

  componentDidMount = () => {  
  }

  handleConnect = (connectInfo) => {
    console.log("Connected to: " + connectInfo.chainId)
    this.handleChainChanged(connectInfo.chainId)
    ethereum
      .request({ method: 'eth_accounts' })
      .then(this.handleAccountsChanged)
      .catch((err) => {
        console.error(err)
      })
  }

  handleDisconnect = (error) => {
    console.error(error)
  }

  handleAccountsChanged = (accounts) => {
    console.log("Accounts changed")
    console.log(accounts)

    this.setState({
      eth: {
        ...this.state.eth,
        accounts: accounts,
        currentAccount: accounts.length == 0 ? null : accounts[0]
      }
    })
  }

  handleChainChanged = (chainId) => {
    console.log("Chain changed to: " + chainId)
    
    const networkId = String(parseInt(chainId))
    console.log("Network ID is: " + networkId)

    if (CryptoSEO.networks[networkId] == undefined) {
      this.setState({
        eth: {
          ...this.state.eth,
          networkName: networkNames[networkId],
          CryptoSEOContract: null,
          LinkTokenContract: null
        }
      })          
    } else {
      this.setState({
        eth: {
          ...this.state.eth,
          networkName: networkNames[networkId],
          CryptoSEOContract: new this.web3.eth.Contract(CryptoSEO.abi, CryptoSEO.networks[networkId].address),
          LinkTokenContract: new this.web3.eth.Contract(LinkToken.abi, LinkAddress.networks[networkId])
        }
      })
    }
  }

  selectPage = (page) => {
    this.setState({
      page: page
    })
  }

  simpleSelectPage = (pageName) => {
    this.setState({
      page: {name: pageName}
    })
  }

  displayPage = () => {
    switch(this.state.page.name) {
      case "about":
        return(
          <About />
        )
      case "create":
        return (
          this.state.eth.CryptoSEOContract 
          ? <Create getEth={this.getEth} web3={this.web3} selectPage={this.selectPage}/> 
          : this.errorCard()
        )
      case "view":
        return (
          this.state.eth.CryptoSEOContract 
          ? <View getEth={this.getEth} web3={this.web3} opt={this.state.page.opt}/>
          : this.errorCard()
        )
      default:
        return (
          <Home selectPage={this.selectPage}/>
        )
    }
  }

  errorCard = () => {
    return (
      <Card>
        <Card.Header>Network Error</Card.Header>
        <Card.Body>
            The Crypto SEO contract is not deployed to this network. Please change to the Rinkeby testnet.
        </Card.Body>
      </Card>      
    )
  }

  navIcon(src) {
    return (
      <img
        src={src}
        width="30"
        height="30"
        style={{marginRight: "10px", marginLeft: "10px"}}
      />
    )
  }

  connectAccount = () => {
    console.log("Connect clicked")
    ethereum
      .request({ method: 'eth_requestAccounts' })
      .then(this.handleAccountsChanged)
      .catch((err) => {
        if (err.code === 4001) {
          console.log('Please connect to Metamask.')
        } else {
          console.error(err)
        }
      })
  }

  getEth = () => {
    return this.state.eth
  }


  render(){
    return (
    <Container fluid>
        <Navbar bg="light" variant="light" expand="lg">
          <Navbar.Brand>Crypto SEO</Navbar.Brand>
            <Nav fill variant="tabs" activeKey={this.state.page.name}>
              <Nav.Item>
                <Nav.Link eventKey="home" onSelect={this.simpleSelectPage}>Home</Nav.Link>
              </Nav.Item>              
              <Nav.Item>
                <Nav.Link eventKey="about" onSelect={this.simpleSelectPage}>About</Nav.Link>
              </Nav.Item>              
              <Nav.Item>
                <Nav.Link eventKey="create" onSelect={this.simpleSelectPage}>Create</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="view" onSelect={this.simpleSelectPage}>View</Nav.Link>
              </Nav.Item>
            </Nav>
            <Nav className="ml-auto">
              <Form inline>
                {this.navIcon(NetworkIcon)}
                <Form.Control value={this.state.eth.networkName} readOnly></Form.Control>
                {this.navIcon(UserIcon)}
                { this.state.eth.currentAccount
                  ?  <Form.Control value={this.state.eth.currentAccount} readOnly />
                  : <Button onClick={this.connectAccount} variant="outline-info">Connect</Button>
                } 
              </Form>
            </Nav>
        </Navbar>
        {this.displayPage()}
    </Container>
    )
  }
}

ReactDOM.render(
    <App />,
    document.querySelector('#root')
 )