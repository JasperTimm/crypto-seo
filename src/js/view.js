import React, { Component } from 'react'
import { Container, Form, Card, Button, Table, Col } from 'react-bootstrap'
import ModalDialog from './modal'
import consts from './consts'

export default class View extends Component {
    constructor(props) {
      super(props)
      this.state = {
        seoCommitmentId: props.opt ? props.opt.seoCommitmentId : null,
        seoCommitment: null,
        hasExpired: false,
        curPayout: '0',
        modal: {show: false},
        LINKApproved: false
      }

      this.web3 = props.web3
      this.getEth = props.getEth
      this.handleModalClose = () => this.setState({modal: {show: false}})
    }
  
    componentDidMount() {
        if (this.state.seoCommitmentId) {
            this.lookupSeoCommitment()
        }
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

    lookupSeoCommitment = async () => {
        this.setState({seoCommitment: null})
        let id = parseInt(this.state.seoCommitmentId)
        if (isNaN(id)) return

        let resp = await this.getEth().CryptoSEOContract.methods.seoCommitmentList(id).call(
            {from: this.getEth().currentAccount})

        let commitment = {}
        Object.keys(resp)
            .filter((key) => isNaN(parseInt(key)))
            .forEach((key) => commitment[key] = resp[key])
    
        let expired = await this.hasExpired(resp)
        let payout = await this.curPayout()

        this.setState({
            hasExpired: expired,
            curPayout: payout,
            seoCommitment: commitment
        })
    }

    hasExpired = async (comt) => {
        let timeNow = Math.floor(Date.now() / 1000)
        let REQ_EXP = parseInt(await this.getEth().CryptoSEOContract.methods.REQUEST_EXPIRY().call())

        return comt.isValue && comt.status != consts.statusCodes.indexOf('Completed') && timeNow > parseInt(comt.timeToExecute) + REQ_EXP
    }

    curPayout = async () => {
        let amt = String(await this.getEth().CryptoSEOContract.methods.payoutAmt(this.getEth().currentAccount).call())
        return amt
    }

    displaySEOCommitment = () => {
        if (!this.state.seoCommitment.isValue) return (<Form>No SEO Commitment found for that ID</Form>)
        return (
            <Table bordered hover size="sm">
                <tbody>
                    <tr key="seoCommitmentId">
                        <td><b>seoCommitmentId</b></td>
                        <td>{this.state.seoCommitmentId}</td>
                    </tr>
                    {Object.keys(this.state.seoCommitment).filter((k) => k != "isValue" && k != "requestId").map((field) => {
                        let val = this.state.seoCommitment[field]
                        return (
                            <tr key={field}>
                                <td><b>{field}</b></td>
                                <td>{this.displayVal(field, val)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </Table>
        )
    }

    displayVal = (field, val) => {
        if (typeof val == "boolean") {
            return val ? "true" : "false"
        } else if (["amtPerRankEth", "maxPayableEth"].includes(field)) {
            return (<>{val} &nbsp;&nbsp; <i>({this.web3.utils.fromWei(val)} ETH)</i></>)
        } else if (field == "timeToExecute") {
            let d = new Date(val * 1000)
            return (<>{val} &nbsp;&nbsp; <i>({String(d)})</i></>)
        } else if (field == "status") {
            return (<>{val} &nbsp;&nbsp; <i>({consts.statusCodes[val]})</i></>)
        } else {
            return val
        }
    }
  
    displaySearch = () => {
        return (
            <Card>
                <Card.Header>Search</Card.Header>
                <Card.Body>
                    {this.state.seoCommitment 
                    ?   <Button variant="outline-primary" onClick={() => {this.setState({seoCommitment: null})}}>← Back</Button>
                    :   <Form>
                            <Form.Group as={Col} md="3">
                                <Form.Control name="seoCommitmentId" onChange={this.handleChange} placeholder="SEO Commitment ID" />
                                <br/>
                                <Button onClick={this.lookupSeoCommitment} variant="success">Search</Button>
                            </Form.Group>                        
                        </Form>
                    }
                </Card.Body>
            </Card>
        )
    }

    displayCommitment = () => {
        if (!this.state.seoCommitment) return (<></>)
        return (
            <>
                <Card>
                    <Card.Header>SEO Commitment</Card.Header>
                    <Card.Body>
                        {this.displaySEOCommitment()}
                    </Card.Body>
                </Card>
                {this.displayRerun()}
                {this.displayWithdraw()}
            </>
        )
    }

    displayRerun = () => {
        if (!this.state.hasExpired) return (<></>)
        return (
            <Card>
                <Card.Header>Expired commitment</Card.Header>
                <Card.Body>
                    It appears this commitment is taking longer than expected to execute. In order to rerun this commitment please click the button below.
                    <br/><br/>
                    <Button variant="primary" onClick={this.checkRerun}>Rerun</Button>
                </Card.Body>
            </Card>
        )            
    }

    checkRerun =  async () => {
        if (! this.getEth().currentAccount) {
          this.showSimpleModal("Invalid account", "No account is connected via Web3 to the site")
          return
        }
  
        if (this.state.LINKApproved) {
          this.confirmRerun()
          return
        }
 
        let linkBal = new this.web3.utils.BN(await this.getEth().LinkTokenContract.methods.balanceOf(this.getEth().currentAccount).call(
          {from: this.getEth().currentAccount}))
  
        if (linkBal.lt(this.getEth().consts.SEARCH_PAYMENT)) {
          this.showSimpleModal("Insufficient LINK", "This account has insufficient LINK to rerun this contract")
          return
        }
  
        this.showModal({
         show: true,
         title: "Approve LINK payment", 
         message: <>
                   In order to rerun this SEO Commitment we need to approve a transfer of <b>1 LINK</b> to this contract from 
                   your account.
                   <br /><br />
                   This will cover the cost of using the Chainlink Oracle to lookup the search rankings 
                   at the conclusion of this commitment.
                   </>,
         primaryBtn: {text: "Approve LINK", fn: this.makeLINKPayment},
         secondaryBtn: {text: "Cancel"}
       })
     }
 
    txWaiting = (txHash) => {
        console.log("Awaiting confirmation: " + txHash)

        this.showModal({
            show: true,
            title: "Awaiting confirmation", 
            message: "Waiting for confirmation of transaction...",
            spinner: true
        })        
    }

    txError = (error) => {
        console.error(error)
        this.showSimpleModal("Error", "There was an error with the transaction. Please try again.")        
    }

    makeLINKPayment = () => {
        let onSuccess = (receipt) => {
            console.log("LINK approved: " + receipt)
            this.setState({
                LINKApproved: true
            })
            this.confirmRerun()
        }          

        console.log("About to call approve on LINK token...")
        this.getEth().LinkTokenContract.methods.approve(this.getEth().CryptoSEOContract._address, String(this.getEth().consts.SEARCH_PAYMENT)).send( 
            {from: this.getEth().currentAccount})
            .once('transactionHash', this.txWaiting)
            .on('error', this.txError)
            .then(onSuccess)
    }

    confirmRerun = () =>{
        this.showModal({
            show: true,
            title: "Confirmed", 
            message: "LINK approval confirmed. We can now proceed to rerun the SEO Commitment",
            primaryBtn: {text: "Rerun", fn: this.rerunCommitment},
            secondaryBtn: {text: "Cancel"}
        })
    }

    rerunCommitment = () => {
        let onSuccess = (receipt) => {
            console.log("SEO Commitment rerun!")
            this.setState({hasExpired: false})
            this.showSimpleModal("Success", "Your commitment has been rerun. Please give it a few minutes to be processed.")
        }

        this.getEth().CryptoSEOContract.methods.rerunExpiredCommitment(this.state.seoCommitmentId).send({from: this.getEth().currentAccount})
            .once('transactionHash', this.txWaiting)
            .on('error', this.txError)
            .then(onSuccess)        
    }

    displayWithdraw = () => {
        if (this.state.curPayout == '0') return (<></>)
        return (
            <Card>
                <Card.Header>Withdraw payout</Card.Header>
                <Card.Body>
                    You have <b>{this.web3.utils.fromWei(this.state.curPayout)} ETH</b> to withdraw from this contract.
                    <br/><br/>
                    <Button variant="primary" onClick={this.withdrawPayout}>Withdraw</Button>
                </Card.Body>
            </Card>
        ) 
    }

    withdrawPayout = () => {
        let onSuccess = (receipt) => {
            console.log("Payment withdrawn!")
            this.setState({curPayout: '0'})
            this.showSimpleModal("Success", "Your ETH payment has been withdrawn.")
        }

        this.getEth().CryptoSEOContract.methods.withdrawPayout().send({from: this.getEth().currentAccount})
            .once('transactionHash', this.txWaiting)
            .on('error', this.txError)
            .then(onSuccess)          
    }

    render(){
      return (
        <Container fluid="xl">
            <ModalDialog modal={this.state.modal} handleClose={this.handleModalClose} />
            {this.displaySearch()}
            {this.displayCommitment()}
        </Container>
      )
    }
  }