import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import Web3 from 'web3'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Container, Nav, Navbar, Jumbotron, Button, Form, Card } from 'react-bootstrap'
import Create from './create'
import View from './view'
import About from './about'
import Guide from './guide'
import NetworkIcon from '../../assets/network_icon.png'
import UserIcon from '../../assets/user_icon.png'
import consts from './consts'

const CryptoSEO = require('../../build/contracts/CryptoSEO')
const LinkToken = require('../../build/contracts/LinkTokenInterface')

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
        <h1>Crypto SEO</h1>
        <p>
          A simple dApp which
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

  handleChainChanged = async (chainId) => {
    console.log("Chain changed to: " + chainId)
    
    const networkId = String(parseInt(chainId))
    console.log("Network ID is: " + networkId)

    if (CryptoSEO.networks[networkId] == undefined) {
      this.setState({
        eth: {
          ...this.state.eth,
          networkName: consts.networkNames[networkId],
          CryptoSEOContract: null,
          LinkTokenContract: null
        }
      })          
    } else {
      let cryptoSEO = new this.web3.eth.Contract(CryptoSEO.abi, CryptoSEO.networks[networkId].address)
      let cryptoSEOConsts = await this.getConsts(cryptoSEO)
      this.setState({
        eth: {
          ...this.state.eth,
          networkName: consts.networkNames[networkId],
          CryptoSEOContract: cryptoSEO,
          LinkTokenContract: new this.web3.eth.Contract(LinkToken.abi, cryptoSEOConsts.linkAddress),
          consts: cryptoSEOConsts,
        }
      })
    }
  }

  getConsts = async (cryptoSEO) => {
    return {
      SLEEP_PAYMENT: new this.web3.utils.BN(await cryptoSEO.methods.SLEEP_PAYMENT().call()),
      SEARCH_PAYMENT: new this.web3.utils.BN(await cryptoSEO.methods.SEARCH_PAYMENT().call()),
      REQUEST_EXPIRY: parseInt(await cryptoSEO.methods.REQUEST_EXPIRY().call()),
      oracle: await cryptoSEO.methods.oracle().call(),
      sleepJobId: await cryptoSEO.methods.sleepJobId().call(),
      searchJobId: await cryptoSEO.methods.searchJobId().call(),
      searchUrl: await cryptoSEO.methods.searchUrl().call(),
      linkAddress: await cryptoSEO.methods.linkAddress().call(),    
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
      case "guide":
        return(
          <Guide />
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
            The Crypto SEO contract is not deployed to this network. 
            <br/><br/>
            Please change to one of the following networks: {this.getCryptoSEONetworkList().join(", ")}
        </Card.Body>
      </Card>      
    )
  }

  getCryptoSEONetworkList = () => {
    return Object.keys(CryptoSEO.networks).map(id => consts.networkNames[id])
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
                <Nav.Link eventKey="guide" onSelect={this.simpleSelectPage}>Guide</Nav.Link>
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