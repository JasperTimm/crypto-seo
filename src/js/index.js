import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import Web3 from 'web3'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Container, Nav, Navbar, Jumbotron, Button } from 'react-bootstrap'
import Create from './create'
import View from './view'
const CryptoSEO = require('../../build/contracts/CryptoSEO')
const LinkToken = require('../../build/contracts/LinkTokenInterface')
const LinkAddress = {
  "networks" : {
    "4": "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
  }
}
const networkNames = {
  "4": "Rinkeby"
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
       accounts: [],
       currentAccount: null,
       page: {name: "home"}
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
      accounts: accounts,
      currentAccount: accounts.length == 0 ? null : accounts[0]
    })
  }

  handleChainChanged = (chainId) => {
    console.log("Chain changed to: " + chainId)
    
    const networkId = String(parseInt(chainId))
    console.log("Network ID is: " + networkId)
    if (CryptoSEO.networks[networkId] == undefined) {
        console.error("CryptoSEO contract not deployed to this network")
        this.setState({
          CryptoSEOContract: null,
          LinkTokenContract: null,
          networkName: "CryptoSEO is not deployed here, please change to Rinkeby"
        })          
        return
    }

    this.setState({
      CryptoSEOContract: new this.web3.eth.Contract(CryptoSEO.abi, CryptoSEO.networks[networkId].address),
      LinkTokenContract: new this.web3.eth.Contract(LinkToken.abi, LinkAddress.networks[networkId]),
      networkName: networkNames[networkId]
    })
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
          <About appState={this.state} web3={this.web3}/>
        )
      case "create":
        return (
          <Create appState={this.state} web3={this.web3} selectPage={this.selectPage}/>
        )
      case "view":
        return (
          <View appState={this.state} web3={this.web3} opt={this.state.page.opt}/>
        )
      default:
        return (
          <Home selectPage={this.selectPage}/>
        )
    }
  }

  render(){
    return (
    <Container fluid>
        <Navbar bg="light" variant="light">
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