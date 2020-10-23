import React from 'react'
import ReactDOM from 'react-dom'
// import Web3 from 'web3'
import 'bootstrap/dist/css/bootstrap.min.css'
import Button from 'react-bootstrap/Button'
import { Container, Navbar, Form, Card } from 'react-bootstrap'
const request = require('request')

class App extends React.Component {
   constructor(props){
      super(props)
      this.state = {
          searchTerm: '',
          siteName: ''
      }

      this.setupListeners()

    //   if (ethereum) {
    //      console.log("Using web3 detected from external source like Metamask")
    //      this.web3 = new Web3(ethereum)
    //   } else {
    //      console.log("No web3 detected.")
    //   }

    //   const MyContract = web3.eth.contract()
    //   this.state.ContractInstance = MyContract.at("0x1ACd4B6005b4B27d78dc40b5DDFc98FE49b7CF16")

      window.a = this.state
   }

    componentDidMount() {
    }

    setupListeners() {
        this.connectEthereum = this.connectEthereum.bind(this)
        this.refreshSearchRank = this.refreshSearchRank.bind(this)
        this.handleChange = this.handleChange.bind(this)
    }

    connectEthereum() {
        console.log("Connect clicked")
        // ethereum.enable()
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
                        <Form.Group controlId="formCurrentRank">
                            <Form.Label>Current rank</Form.Label>
                            <br/>
                            <Button onClick={this.refreshSearchRank} variant="success">Refresh</Button>
                            <Form.Control ref={this.searchRankRef} placeholder="Site ranking" />
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
                            <Form.Control placeholder="Enter eth address" />
                        </Form.Group>
                        <Form.Group controlId="formEthAmtPerRank">
                            <Form.Label>Amount eth per rank increase</Form.Label>
                            <Form.Control placeholder="Enter amount in eth" />
                        </Form.Group>
                        <Form.Group controlId="formMaxEthAmt">
                            <Form.Label>Max amount eth to spend</Form.Label>
                            <Form.Control placeholder="Enter max amount in eth" />
                        </Form.Group>                        
                        <Form.Group>
                            <Button variant="success">Create contract</Button>
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