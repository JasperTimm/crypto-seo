import React from 'react'
import ReactDOM from 'react-dom'
import Web3 from 'web3'
import 'bootstrap/dist/css/bootstrap.min.css'
import Button from 'react-bootstrap/Button'
import { Container, Navbar, Form, Card } from 'react-bootstrap'
const request = require('request')
const CryptoSEO = require('../../build/contracts/CryptoSEO')
const LinkToken = require('../../build/contracts/LinkTokenInterface')
const LinkAddress = {
  "networks" : {
    "4": "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
  }
}
const LINK_TOKEN_MULTIPLIER = 10**18
const ORACLE_PAYMENT = String(1 * LINK_TOKEN_MULTIPLIER)

class App extends React.Component {
   constructor(props){
      super(props)
      this.state = {
        searchTerm: '',
        siteName: '',
        durationUnits: 'Minutes'
      }

      this.setupListeners()

      if (ethereum) {
        console.log("Using web3 detected from external source like Metamask")
        this.web3 = new Web3(ethereum)
        ethereum.on('accountsChanged', this.handleAccountsChanged)
        ethereum.on('chainChanged', this.handleChainChanged)
        ethereum.autoRefreshOnNetworkChange = false
      } else {
        console.error("No web3 detected.")
        return
      }
   }

    componentDidMount() {      
    }

    setupListeners() {
      this.connectEthereum = this.connectEthereum.bind(this)
      this.refreshSearchRank = this.refreshSearchRank.bind(this)
      this.handleChange = this.handleChange.bind(this)
      this.payLINK = this.payLINK.bind(this)
      this.createContract = this.createContract.bind(this)
      this.handleChainChanged = this.handleChainChanged.bind(this)
      this.handleAccountsChanged = this.handleAccountsChanged.bind(this)
    }

    connectEthereum() {
      console.log("Connect clicked")
      ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(this.handleAccountsChanged)
        .then(this.handleChainChanged)
        .catch((err) => {
          if (err.code === 4001) {
            console.log('Please connect to Metamask.')
          } else {
            console.error(err)
          }
        })
    }

    handleAccountsChanged(accounts) {
      console.log("Accounts changed")
      this.state.currentAccount = accounts[0]
    }

    handleChainChanged() {
      console.log("Chain changed to: " + ethereum.chainId)
      
      const networkId = String(parseInt(ethereum.chainId))
      console.log("Network ID is: " + networkId)
      if (CryptoSEO.networks[networkId] == undefined) {
          console.error("CryptoSEO contract not deployed to this network")
          return
      }
      this.state.CryptoSEOContract = new this.web3.eth.Contract(CryptoSEO.abi, CryptoSEO.networks[networkId].address)
      this.state.LinkTokenContract = new this.web3.eth.Contract(LinkToken.abi, LinkAddress.networks[networkId])
    }

    refreshSearchRank() {
        console.log("Refresh clicked")
        console.log(this.state.searchTerm)
        // request('http://www.google.com', function (err, res, body) {
        //     console.error('error:', error)
        //     console.log('statusCode:', response && response.statusCode)
        //     console.log('body:', body)
        // })
    }

    handleChange(evt) {
      const value = evt.target.value
      this.setState({...this.state, [evt.target.name]: value})
    }

    payLINK() {
      console.log("About to call approve on LINK token...")
      this.state.LinkTokenContract.methods.approve(this.state.CryptoSEOContract._address, ORACLE_PAYMENT).send( 
        {from: this.state.currentAccount},
        (err, result) => {
          if (err) {
            console.error(err)
          } else {
            console.log(result)
          }
        })
    }

    createContract() {
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

      this.state.CryptoSEOContract.methods.createSEOCommitment(callObj.site, callObj.searchTerm, callObj.domainMatch,
        callObj.initialSearchRank, callObj.amtPerRankEth, callObj.maxAmtEth, callObj.expiryTime, callObj.payee).send( 
        {value: callObj.maxAmtEth, from: this.state.currentAccount},
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
            <Navbar bg="light" variant="light">
                <Navbar.Brand>Crypto SEO</Navbar.Brand>
                <Form inline>
                    <Button onClick={this.connectEthereum} variant="outline-info">Connect</Button>
                </Form>
            </Navbar>
            
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
                            <Button onClick={this.payLINK} variant="success">Pay LINK</Button>
                            <Button onClick={this.createContract} variant="success">Create contract</Button>
                        </Form.Group>                        
                    </Form>
                </Card.Body>
            </Card>            
        </Container>
        )
    }
}

ReactDOM.render(
    <App />,
    document.querySelector('#root')
 )