
import React, { Component } from 'react'
import { Container, Form, Card, Button, Table, Col } from 'react-bootstrap'

const statusCodes = ["Created", "Processing", "Completed"]

export default class View extends Component {
    constructor(props) {
      super(props)
      this.state = {
        seoCommitmentId: props.opt ? props.opt.seoCommitmentId : null,
        seoCommitment: null,
        hasExpired: false,
        curPayout: 0
      }

      this.web3 = props.web3
      this.getEth = props.getEth
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
    
        this.setState({
            hasExpired: await this.hasExpired(resp),
            curPayout: await this.curPayout(),
            seoCommitment: commitment
        })
    }

    hasExpired = async (comt) => {
        let timeNow = Math.floor(Date.now() / 1000)
        let REQ_EXP = await this.getEth().CryptoSEOContract.methods.REQUEST_EXPIRY().call()
        return comt.status == statusCodes.indexOf('Processing') && timeNow > comt.timeToExecute + REQ_EXP
    }

    curPayout = async () => {
        let amt = await this.getEth().CryptoSEOContract.methods.payoutAmt(this.getEth().currentAccount).call()
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
                    {Object.keys(this.state.seoCommitment).filter((k) => k != "isValue").map((field) => {
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
            return (<>{val} &nbsp;&nbsp; <i>({statusCodes[val]})</i></>)
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
        // if (!this.state.hasExpired) return (<></>)
        return (
            <Card>
                <Card.Header>Expired commitment</Card.Header>
                <Card.Body>
                    It appears this commitment is taking longer than expected to execute. In order to rerun this commitment please click the button below.
                    <br/><br/>
                    <Button variant="primary" onClick={this.rerunCommitment}>Rerun</Button>
                </Card.Body>
            </Card>
        )            
    }

    rerunCommitment = () => {
        console.log("Rerunning...")
    }

    displayWithdraw = () => {
        // if (this.state.curPayout == 0) return (<></>)
        return (
            <Card>
                <Card.Header>Withdraw payout</Card.Header>
                <Card.Body>
                    You have <b>{this.web3.utils.fromWei(this.state.curPayout)} ETH</b> to withdraw from this contract.
                    <br/><br/>
                    <Button variant="primary" onClick={this.rerunCommitment}>Withdraw</Button>
                </Card.Body>
            </Card>
        ) 
    }

    withdrawPayout = () => {
        console.log("Withdrawing payout...")
    }

    render(){
      return (
        <Container fluid="xl">
            {this.displaySearch()}
            {this.displayCommitment()}
        </Container>
      )
    }
  }