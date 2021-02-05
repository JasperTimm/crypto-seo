
import React, { Component } from 'react'
import { Container, Form, Card, Button } from 'react-bootstrap'

export default class View extends Component {
    constructor(props) {
      super(props)
      this.state = {
        appState: props.appState,
        seoCommitment: null
      }
  
  
    }
  
    componentDidMount() {
    }

    handleChange = (evt) => {
        const value = evt.target.value
        this.setState({...this.state, [evt.target.name]: value})
    }

    lookupSeoCommitment = () => {
        this.setState({seoCommitment: null})
        let id = parseInt(this.state.seoCommitmentId)
        if (!isNaN(id)) {
            this.state.appState.CryptoSEOContract.methods.seoCommitmentList(id).call(
                {from: this.state.appState.currentAccount})
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
                <Form.Group>
                    <Form.Label>No SEO Commitment found for that ID</Form.Label>
                </Form.Group>
            )
        } else {
            return (
                Object.keys(this.state.seoCommitment).map((field) => {
                return (
                <Form.Group key={field} >
                    <Form.Label>{field}</Form.Label>
                    <Form.Control value={this.state.seoCommitment[field]} readOnly />
                </Form.Group>
                )
                })
            )
        }
    }
  
    render(){
      return (
        <Container fluid>
            <Card>
                <Card.Body>
                    <Form>
                        <Form.Group>
                             <Form.Control name="seoCommitmentId" onChange={this.handleChange} placeholder="SEO Commitment ID" />
                             <br/>
                             <Button onClick={this.lookupSeoCommitment} variant="success">Lookup</Button>
                         </Form.Group>                        
                    </Form>
                </Card.Body>
            </Card>
            {!this.state.seoCommitment 
                ?   <></> 
                :   <Card>
                        <Card.Header>SEO Commitment</Card.Header>
                        <Card.Body>
                            <Form>
                            {this.displaySEOCommitment()}                       
                            </Form>
                        </Card.Body>
                    </Card>
            }
        </Container>
      )
    }
  }