import React, { Component } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import Button from 'react-bootstrap/Button'
import { Container, Form, Card, Modal, Spinner } from 'react-bootstrap'
const LINK_TOKEN_MULTIPLIER = 10**18
const ORACLE_PAYMENT = 1 * LINK_TOKEN_MULTIPLIER

function ModalDialog(props) {
    return (
      <>
        <Modal show={props.modal.show} onHide={props.handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>{props.modal.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{props.modal.message}</Modal.Body>
          <Modal.Footer>
            {props.modal.secondaryBtn ?
            <Button variant="secondary" onClick={props.handleClose}>
              {props.modal.secondaryBtn.text}
            </Button>
            : <></>}
            {props.modal.primaryBtn ?
            <Button variant="primary" onClick={props.modal.primaryBtn.fn ? props.modal.primaryBtn.fn : props.handleClose}>
              {props.modal.primaryBtn.text}
            </Button>
            : <></>}
            {props.modal.spinner ?
            <Spinner animation="border" />
            : <></>}
          </Modal.Footer>
        </Modal>
      </>
    );
}

export default class Create extends Component {
    constructor(props){
       super(props)
       this.state = {
         appState: props.appState,
         searchTerm: '',
         siteName: '',
         durationUnits: 'Minutes',
         submitEnabled: true,
         LINKApproved: false,
         modal: {show: false}
       }
 
       this.web3 = props.web3
       this.handleModalClose = () => this.setState({modal: {show: false}})
       this.selectPage = props.selectPage
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
 
     showSimpleModal = (title, message) => this.setState({
       modal: {
         show: true,
         title: title,
         message: message,
         primaryBtn: {
           text: "OK"
         }
       }
     })
 
     showModal = (modal) => this.setState({
      modal: modal
    })

     submitCommitment =  async () => {
       if (! this.state.appState.currentAccount) {
         this.showSimpleModal("Invalid account", "No account is connected via Web3 to the site")
         return
       }
 
       if (this.state.LINKApproved) {
         this.confirmCreation()
         return
       }

       let linkBal = await this.state.appState.LinkTokenContract.methods.balanceOf(this.state.appState.currentAccount).call(
         {from: this.state.appState.currentAccount})
 
       if (linkBal < ORACLE_PAYMENT) {
         this.showSimpleModal("Insufficient LINK", "This account has insufficient LINK to create this contract")
         return
       }
 
       this.showModal({
        show: true,
        title: "Approve LINK payment", 
        message: <>
                  In order to create this SEO Commitment we need to approve a transfer of <b>1 LINK</b> to this contract from 
                  your account.
                  <br /><br />
                  This will cover the cost of using the Chainlink Oracle to lookup the search rankings 
                  at the conclusion of this commitment.
                  </>,
        primaryBtn: {text: "Approve LINK", fn: this.makeLINKPayment},
        secondaryBtn: {text: "Cancel"}
      })
    }

    makeLINKPayment = () => {
 
       let onWaiting = (txHash) => {
         console.log("Awaiting confirmation: " + txHash)
         this.setState({
          submitEnabled: false
         })
         this.showModal({
           show: true,
           title: "Awaiting confirmation", 
           message: "Waiting for confirmation of LINK approval...",
           spinner: true
         })
       }
 
       let onSuccess = (receipt) => {
        console.log("LINK approved: " + receipt)
        this.setState({
         submitEnabled: true,
         LINKApproved: true
        })
        this.confirmCreation()
       }          
      

       let onError = (error) => {
         console.error(error)
         this.setState({
           submitEnabled: true
         })
         this.showSimpleModal("Error", "There was an error with the LINK payment. Please try again.")
       }
 
       console.log("About to call approve on LINK token...")
       this.state.appState.LinkTokenContract.methods.approve(this.state.appState.CryptoSEOContract._address, String(ORACLE_PAYMENT)).send( 
         {from: this.state.appState.currentAccount})
         .once('transactionHash', onWaiting)
         .on('error', onError)
         .then(onSuccess)
     }
 
     confirmCreation = () =>{
      this.showModal({
        show: true,
        title: "Confirmed", 
        message: "LINK approval confirmed. We can now proceed to create the SEO Commitment",
        primaryBtn: {text: "Create", fn: this.createCommitment},
        secondaryBtn: {text: "Cancel"}
      })
     }

     createCommitment = () => {
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
 
       let onWaiting = (txHash) => {
        console.log("Awaiting confirmation: " + txHash)
        this.setState({
         submitEnabled: false
        })
        this.showModal({
          show: true,
          title: "Awaiting confirmation", 
          message: "Waiting for confirmation of commitment creation...",
          spinner: true
        })
      }

      let onSuccess = (receipt) => {
        console.log("SEO Commitment created!")
        let createdId = receipt.events.SEOCommitmentCreated.returnValues[0]
        console.log("Created SEO Commitment ID is: " + createdId)
        this.setState({
          createdCommitmentId: createdId
        })

       this.showModal({
        show: true,
        title: "Confirmed", 
        message: <>
        Success! Your SEO Commitment has been created! 
        <br />
        <br />
        SEO Commitment ID: <b>{createdId}</b>
        <br />
        <br />
        You can now see the details of your created commitment in the View tab
        </>,
        primaryBtn: {text: "View", fn: this.viewCommitment}
      })          
     }

      let onError = (error) => {
        console.error(error)
        this.setState({
          submitEnabled: true
        })
        this.showSimpleModal("Error", "There was an error creating your SEO Commitment. Please try again.")
      }
       
       this.state.appState.CryptoSEOContract.methods.createSEOCommitment(callObj.site, callObj.searchTerm, callObj.domainMatch,
         callObj.initialSearchRank, callObj.amtPerRankEth, callObj.maxAmtEth, callObj.expiryTime, callObj.payee).send( 
         {value: callObj.maxAmtEth, from: this.state.appState.currentAccount})
         .once('transactionHash', onWaiting)
         .on('error', onError)
         .then(onSuccess)
     }
 
     viewCommitment = () => {
      this.selectPage({
        name: "view",
        opt: {
          seoCommitmentId: this.state.createdCommitmentId
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
                           <Form.Control value={this.state.appState.networkName} readOnly />
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
                             <Button onClick={async () => await this.submitCommitment()} variant="success" disabled={!this.state.submitEnabled}>Submit</Button>
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