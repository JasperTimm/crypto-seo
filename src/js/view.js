
import React, { Component } from 'react'
import { Container, Form, Card, Button, Table, Col } from 'react-bootstrap'

const statusCodes = ["Created", "Processing", "Completed"]

export default class View extends Component {
    constructor(props) {
      super(props)
      this.state = {
        seoCommitmentId: props.opt ? props.opt.seoCommitmentId : null,
        seoCommitment: null
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

    lookupSeoCommitment = () => {
        this.setState({seoCommitment: null})
        let id = parseInt(this.state.seoCommitmentId)
        if (!isNaN(id)) {
            this.getEth().CryptoSEOContract.methods.seoCommitmentList(id).call(
                {from: this.getEth().currentAccount})
                .then((resp) => {
                let commitment = {}
                Object.keys(resp)
                    .filter((key) => isNaN(parseInt(key)))
                    .forEach((key) => commitment[key] = resp[key])
            
                this.setState({
                    seoCommitment: commitment
                })
                })
        }
    }

    displaySEOCommitment = () => {
        if (!this.state.seoCommitment.isValue) {
            return (
                <Form>No SEO Commitment found for that ID</Form>
            )
        } else {
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
  
    render(){
      return (
        <Container fluid="xl">
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
            {!this.state.seoCommitment 
                ?   <></> 
                :   <Card>
                        <Card.Header>SEO Commitment</Card.Header>
                        <Card.Body>
                            {this.displaySEOCommitment()}                       
                        </Card.Body>
                    </Card>
            }
        </Container>
      )
    }
  }