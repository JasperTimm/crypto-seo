import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import Web3 from 'web3'
import 'bootstrap/dist/css/bootstrap.min.css'
import Button from 'react-bootstrap/Button'
import { Container, Nav, Navbar, Form, Card, Modal } from 'react-bootstrap'
const CryptoSEO = require('../../build/contracts/CryptoSEO')
const LinkToken = require('../../build/contracts/LinkTokenInterface')
const LinkAddress = {
  "networks" : {
    "4": "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
  }
}
const LINK_TOKEN_MULTIPLIER = 10**18
const ORACLE_PAYMENT = 1 * LINK_TOKEN_MULTIPLIER
const networkNames = {
  "4": "Rinkeby"
}

function ModalDialog(props) {
  return (
    <>
      <Modal show={props.modal.show} onHide={props.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{props.modal.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{props.modal.message}</Modal.Body>
        <Modal.Footer>
          {/* <Button variant="secondary" onClick={props.handleClose}>
            Close
          </Button> */}
          <Button variant="primary" onClick={props.handleClose}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {

    }
  }

  render(){
    return (
      <Container fluid>
      </Container>
    )
  }
}

class App extends Component {
  constructor(props){
     super(props)
     this.state = {
       accounts: [],
       currentAccount: null
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

    if (this.state.currentAccount && this.state.LinkTokenContract) {
      this.state.LinkTokenContract.methods.balanceOf(this.state.currentAccount).call(
        {from: this.state.currentAccount})
        .then(function(receipt) {
          console.log(receipt)
        })
    }
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

  selectPage = (eventKey) => {
    switch(eventKey) {
      case "create":
        this.setState({
          page: <Create appState={this.state} web3={this.web3}/>
        })
        return
      case "view":
        this.setState({
          page: <View appState={this.state} web3={this.web3}/>
        })
        return
      default:
        this.setState({
          page: <Home />
        })
        return
    }
  }

  render(){
    return (
    <Container fluid>
        <Navbar bg="light" variant="light">
            <Navbar.Brand>Crypto SEO</Navbar.Brand>
            <Nav fill variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="create" onSelect={this.selectPage}>Create</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="view" onSelect={this.selectPage}>View</Nav.Link>
              </Nav.Item>
            </Nav>
        </Navbar>
        {this.state.page}
    </Container>
    )
  }
}

class View extends Component {
  constructor(props) {
    super(props)
    this.state = {
      appState: props.appState,
      seoCommitment: {foo: "bar"}
    }


  }

  componentDidMount() {
    this.state.appState.CryptoSEOContract.methods.seoCommitmentList(0).call(
      {from: this.state.appState.currentAccount})
      .then((resp) => {
        let commitment = {}
        Object.keys(resp)
          .filter((key) => !parseInt(key) && key != "isValue" && key != "0")
          .forEach((key) => commitment[key] = resp[key])

        console.log(commitment)

        this.setState({
          seoCommitment: commitment
        })
      })  
  }

  displaySEOCommitment = () => {
    return (
      Object.keys(this.state.seoCommitment).map((field) => {
        return (
        <Form.Group>
          <Form.Label>{field}</Form.Label>
          <Form.Control value={this.state.seoCommitment[field]} readOnly />
        </Form.Group>
        )
      })
      )
  }

  render(){
    return (
      <Container fluid>
          <Card>
              <Card.Header>SEO Commitment</Card.Header>
              <Card.Body>
                  <Form>
                    {this.displaySEOCommitment()}                       
                  </Form>
              </Card.Body>
          </Card>
      </Container>
    )
  }
}

class Create extends Component {
   constructor(props){
      super(props)
      this.state = {
        appState: props.appState,
        searchTerm: '',
        siteName: '',
        durationUnits: 'Minutes',
        payLinkEnabled: true,
        createEnabled: false,
        modal: {show: false}
      }

      this.web3 = props.web3
      this.handleModalClose = () => this.setState({modal: {show: false}})
   }

    componentDidMount() {  
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

    refreshSearchRank = () => {
        console.log("Refresh clicked")
        console.log(this.state.searchTerm)
        // request('http://www.google.com', function (err, res, body) {
        //     console.error('error:', error)
        //     console.log('statusCode:', response && response.statusCode)
        //     console.log('body:', body)
        // })
    }

    handleChange = (evt) => {
      const value = evt.target.value
      this.setState({...this.state, [evt.target.name]: value})
    }

    showModal = (title, message) => this.setState({
      modal: {
        show: true,
        title: title,
        message: message
      }
    })

    payLINK =  async () => {
      if (! this.state.appState.currentAccount) {
        this.showModal("Invalid account", "No account is connected via Web3 to the site")
        return
      }

      let linkBal = await this.state.appState.LinkTokenContract.methods.balanceOf(this.state.appState.currentAccount).call(
        {from: this.state.appState.currentAccount})

      if (linkBal < ORACLE_PAYMENT) {
        this.showModal("Insufficient LINK", "This account has insufficient LINK to create this contract")
        return
      }

      let onSuccess = (receipt) => {
        console.log("LINK approved: " + receipt)
        this.setState({
          payLinkEnabled: false,
          createEnabled: true
        }) 
      }

      let onWaiting = (txHash) => {
        console.log("Awaiting confirmation: " + txHash)
        this.setState({
          payLinkEnabled: false
        })
      }

      let onError = (error) => {
        console.error(error)
        this.setState({
          payLinkEnabled: true
        })
      }

      console.log("About to call approve on LINK token...")
      this.state.appState.LinkTokenContract.methods.approve(this.state.appState.CryptoSEOContract._address, String(ORACLE_PAYMENT)).send( 
        {from: this.state.appState.currentAccount})
        .once('transactionHash', onWaiting)
        .on('error', onError)
        .then(onSuccess)
    }

    createContract = () => {
      let timeNow = Math.floor(Date.now() / 1000)
      let expiryTime = 0
      if (this.state.durationUnits == "Minutes") {
        expiryTime = timeNow + this.state.durationAmt * 60
      } else if (this.state.durationUnits == "Hours") {
        expiryTime = timeNow + this.state.durationAmt * 60 * 60
      } else if (this.state.durationUnits == "Days") {
        expiryTime = timeNow + this.state.durationAmt * 60 * 60 * 24
      } else {
        console.error("Unknown unit type")
        return
      }
      
      let callObj = {
        site: this.state.siteName,
        searchTerm: this.state.searchTerm,
        domainMatch: this.state.domainMatch == "on",
        initialSearchRank: parseInt(this.state.initialSearchRank),
        amtPerRankEth: this.web3.utils.toWei(this.state.amtPerRankEth, "ether"),
        maxAmtEth: this.web3.utils.toWei(this.state.maxAmtEth, "ether"),
        expiryTime: expiryTime,
        payee: this.state.payee
      }

      console.log("About to call createSEOCommitment with...")
      console.log(callObj)

      this.state.appState.CryptoSEOContract.methods.createSEOCommitment(callObj.site, callObj.searchTerm, callObj.domainMatch,
        callObj.initialSearchRank, callObj.amtPerRankEth, callObj.maxAmtEth, callObj.expiryTime, callObj.payee).send( 
        {value: callObj.maxAmtEth, from: this.state.appState.currentAccount},
        (err, result) => {
          if (err) {
            console.error(err)
          } else {
            console.log(result)
          }
        })
    }

    render(){
        return (
        <Container fluid>
            <ModalDialog modal={this.state.modal} handleClose={this.handleModalClose} />

            <Card>
                <Card.Header>Web3 Connection</Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group controlId="formNetwork">
                          <Form.Label>Network</Form.Label>
                          <Form.Control value={this.state.appState.networkName} readOnly  defaultValue="Not connected" />
                        </Form.Group>
                        <Form.Group controlId="formAccount">
                          <Form.Label>Account</Form.Label>
                          <br/>
                          { this.state.appState.currentAccount
                                ?  <Form.Control value={this.state.appState.currentAccount} readOnly />
                                : <Button onClick={this.connectAccount} variant="outline-info">Connect</Button>
                          }                          
                        </Form.Group>                        
                    </Form>
                </Card.Body>
            </Card>

            {!this.state.appState.CryptoSEOContract
              ? <></>
              : 
              <>
              <Card>
                <Card.Header>Search details</Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group controlId="formSearchTerm">
                            <Form.Label>Search term</Form.Label>
                            <Form.Control name="searchTerm" onChange={this.handleChange} placeholder="Enter search term" />
                        </Form.Group>
                        <Form.Group controlId="formSiteName">
                            <Form.Label>Site name</Form.Label>
                            <Form.Control name="siteName" onChange={this.handleChange} placeholder="Enter site name" />
                        </Form.Group>
                        <Form.Group controlId="formDomainMatch">
                            <Form.Check type="checkbox" label="Domain Match" name="domainMatch" onChange={this.handleChange} />
                        </Form.Group>                        
                        <Form.Group controlId="formCurrentRank">
                            <Form.Label>Current rank</Form.Label>
                            <br/>
                            <Button onClick={this.refreshSearchRank} variant="success">Refresh</Button>
                            <Form.Control name="initialSearchRank" onChange={this.handleChange} placeholder="Site ranking" />
                        </Form.Group>                        
                    </Form>
                </Card.Body>
            </Card>

            <Card>
                <Card.Header>Payment details</Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group controlId="formRecipAddr">
                            <Form.Label>Recipient eth address</Form.Label>
                            <Form.Control name="payee" onChange={this.handleChange} placeholder="Enter eth address" />
                        </Form.Group>
                        <Form.Group controlId="formEthAmtPerRank">
                            <Form.Label>Amount eth per rank increase</Form.Label>
                            <Form.Control name="amtPerRankEth"  onChange={this.handleChange} placeholder="Enter amount in eth" />
                        </Form.Group>
                        <Form.Group controlId="formMaxEthAmt">
                            <Form.Label>Max amount eth to spend</Form.Label>
                            <Form.Control name="maxAmtEth"  onChange={this.handleChange} placeholder="Enter max amount in eth" />
                        </Form.Group>
                        <Form.Group controlId="formDuration">
                            <Form.Label>Contract duration</Form.Label>
                            <Form.Control name="durationAmt"  onChange={this.handleChange} placeholder="Enter duration" />
                            <Form.Control name="durationUnits"  onChange={this.handleChange} as="select">
                              <option>Minutes</option>
                              <option>Hours</option>
                              <option>Days</option>
                            </Form.Control>
                        </Form.Group>                                                
                        <Form.Group>
                            <Button onClick={async () => await this.payLINK()} variant="success" disabled={!this.state.payLinkEnabled}>Pay LINK</Button>
                            <br/>
                            <br/>
                            <Button onClick={this.createContract} variant="success" disabled={!this.state.createEnabled}>Create contract</Button>
                        </Form.Group>                        
                    </Form>
                </Card.Body>
            </Card>
            </>
        }          
        </Container>
        )
    }
}

ReactDOM.render(
    <App />,
    document.querySelector('#root')
 )