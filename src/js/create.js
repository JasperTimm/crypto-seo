import React, { Component } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import Button from 'react-bootstrap/Button'
import { Container, Form, Card, Col, InputGroup } from 'react-bootstrap'
import ModalDialog from './modal'

const LINK_TOKEN_MULTIPLIER = 10**18
//TODO: Be nice to have these amounts in a config file
const SLEEP_PAYMENT = 0.1 * LINK_TOKEN_MULTIPLIER
const SEARCH_PAYMENT = 0.1 * LINK_TOKEN_MULTIPLIER
const LINK_PAYMENT = SLEEP_PAYMENT + SEARCH_PAYMENT

export default class Create extends Component {
    constructor(props){
       super(props)
       this.state = {
         searchTerm: '',
         siteName: '',
         initialSearchRank: '',
         domainMatch: false,
         durationUnits: 'Minutes',
         submitEnabled: true,
         LINKApproved: false,
         modal: {show: false},
         formValidated: false
       }
 
       this.handleChange = this.handleChange.bind(this)
       this.web3 = props.web3
       this.getEth = props.getEth
       this.handleModalClose = () => this.setState({modal: {show: false}})
       this.selectPage = props.selectPage
    }
 
     componentDidMount() {  
     }
 
     refreshSearchRank = async () => {
       if (this.state.siteName.length == 0 || this.state.searchTerm.length == 0) {
         this.showSimpleModal('Cannot refresh', 'Please enter a search term and site name')
         return
       }
        let completeUrl = `${process.env.SEARCH_URL}?term=${this.state.searchTerm}&domainMatch=${this.state.domainMatch}&site=${this.state.siteName}`
        console.log(`Complete URL is: ${completeUrl}`)

        let data = await fetch(completeUrl).then(response => response.json())
        console.log(data)
        this.setState({initialSearchRank: data.result})
     }
 
     handleChange = (evt) => {
       const value = evt.target.type == 'checkbox' ? evt.target.checked : evt.target.value
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
       if (! this.getEth().currentAccount) {
         this.showSimpleModal("Invalid account", "No account is connected via Web3 to the site")
         return
       }
 
       if (this.state.LINKApproved) {
         this.confirmCreation()
         return
       }

       let linkBal = await this.getEth().LinkTokenContract.methods.balanceOf(this.getEth().currentAccount).call(
         {from: this.getEth().currentAccount})
 
       if (linkBal < LINK_PAYMENT) {
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
       this.getEth().LinkTokenContract.methods.approve(this.getEth().CryptoSEOContract._address, String(LINK_PAYMENT)).send( 
         {from: this.getEth().currentAccount})
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
       let timeToExecute = 0
       if (this.state.durationUnits == "Minutes") {
        timeToExecute = timeNow + this.state.durationAmt * 60
       } else if (this.state.durationUnits == "Hours") {
        timeToExecute = timeNow + this.state.durationAmt * 60 * 60
       } else if (this.state.durationUnits == "Days") {
        timeToExecute = timeNow + this.state.durationAmt * 60 * 60 * 24
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
         timeToExecute: timeToExecute,
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
       
       this.getEth().CryptoSEOContract.methods.createSEOCommitment(callObj.site, callObj.searchTerm, callObj.domainMatch,
         callObj.initialSearchRank, callObj.amtPerRankEth, callObj.maxAmtEth, callObj.timeToExecute, callObj.payee).send( 
         {value: callObj.maxAmtEth, from: this.getEth().currentAccount})
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

    checkForm = (event) => {
      event.preventDefault()
      event.stopPropagation()

      this.setState({
        formValidated: true
      })

      if (!event.currentTarget.checkValidity()) return

      this.submitCommitment()
    }

     render(){
        return (
          <Container fluid="xl">
            <ModalDialog modal={this.state.modal} handleClose={this.handleModalClose} />
            <Card>
                 <Card.Header>SEO Commitment details</Card.Header>
                 <Card.Body>
                     <Form noValidate validated={this.state.formValidated} onSubmit={this.checkForm}>
                       <Form.Row>
                          <Form.Group as={Col} md="4">
                              <Form.Label>Search term</Form.Label>
                              <Form.Control required name="searchTerm" onChange={this.handleChange} placeholder="Enter search term" />
                          </Form.Group>
                          <Form.Group as={Col} md="8">
                              <Form.Label>Site name</Form.Label>
                              <InputGroup>
                                <Form.Control required name="siteName" onChange={this.handleChange} placeholder="Enter site name" />
                                <InputGroup.Append>
                                  <InputGroup.Text>Match domain only</InputGroup.Text>
                                  <InputGroup.Checkbox name="domainMatch" onChange={this.handleChange} />
                                </InputGroup.Append>
                              </InputGroup>
                          </Form.Group>
                        </Form.Row>
                        <Form.Row>                        
                         <Form.Group as={Col} md="4">
                             <Form.Label>Current search rank</Form.Label>
                             <InputGroup>
                             <Button onClick={this.refreshSearchRank} variant="outline-primary">Refresh</Button>
                             <Form.Control required readOnly={!this.state.manualRank} value={this.state.initialSearchRank} name="initialSearchRank" onChange={this.handleChange} placeholder="Site ranking" />
                             </InputGroup>
                             <Form.Check type="switch" name="manualRank" id="manualRank" onChange={this.handleChange} label="Enter manually"/>
                         </Form.Group>
                        </Form.Row>                        
                    <Form.Row>
                      <Form.Group as={Col} md="5">
                          <Form.Label>Recipient eth address</Form.Label>
                          <Form.Control required name="payee" onChange={this.handleChange} placeholder="Enter eth address" />
                      </Form.Group>
                    </Form.Row>
                    <Form.Row>
                      <Form.Group as={Col} md="4">
                          <Form.Label>ETH paid per search rank increase</Form.Label>
                          <InputGroup>
                            <Form.Control required name="amtPerRankEth"  onChange={this.handleChange} placeholder="Enter amount in eth" />
                            <InputGroup.Append>
                              <InputGroup.Text>ETH</InputGroup.Text>
                            </InputGroup.Append>
                          </InputGroup>
                      </Form.Group>
                      <Form.Group as={Col} md="4">
                          <Form.Label>Max amount ETH to payout</Form.Label>
                          <InputGroup>
                            <Form.Control required name="maxAmtEth"  onChange={this.handleChange} placeholder="Enter max amount in eth" />
                            <InputGroup.Append>
                              <InputGroup.Text>ETH</InputGroup.Text>
                            </InputGroup.Append>
                          </InputGroup>                          
                      </Form.Group>
                      <Form.Group as={Col} md="4">
                          <Form.Label>Contract duration</Form.Label>
                          <InputGroup>
                            <Form.Control required name="durationAmt"  onChange={this.handleChange} placeholder="Enter duration" />
                            <InputGroup.Append>
                              <Form.Control name="durationUnits"  onChange={this.handleChange} as="select">
                                <option>Minutes</option>
                                <option>Hours</option>
                                <option>Days</option>
                              </Form.Control>
                            </InputGroup.Append>
                          </InputGroup>
                      </Form.Group>
                      </Form.Row>
                      <br/>                                                
                      <Form.Group>
                          <Button type="submit" variant="success" disabled={!this.state.submitEnabled}>Submit</Button>
                      </Form.Group>                        
                  </Form>
            </Card.Body>
            </Card>
          </Container>
         )
     }
 }