import React, { Component } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Card, Container } from 'react-bootstrap'

export default class About extends Component {
    constructor(props) {
      super(props)
      this.state = {
      }
    }
  
    render(){
      return (
        <Container>
        <Card>
          <Card.Body>
          <h1>About</h1>
          <p>
            Crypto SEO is a decentralised application (or <a href="https://www.wikiwand.com/en/Decentralized_application">dApp</a>) 
            which enables two parties to
            create a <a href="https://www.wikiwand.com/en/Performance-related_pay">pay-for-performance</a> commitment
            in the <a href="https://www.wikiwand.com/en/Search_engine_optimization">SEO</a> (search engine optimisation) space. 
            In other words, if a company that works on increasing the search rankings of their client's 
            sites, they can use this to guarantee to clients they'll only need to pay if they do their job.
          </p>
          <h2>An example</h2>
          <p>
            Jim, the CEO of CryptoBetting.com would like to improve his site's search ranking in Google for 
            the search term "crypto betting". They are currently #15 and would like to move to the front page 
            (i.e. in the top 10). Jim is approached by Wendy from SEOPro who assures him they can help with this. 
            Jim wants assurance that he'll get the results he's after. Wendy lets him know that in order to guarantee 
            Jim will only need to pay if they perform as expected, they can use CryptoSEO - it will allow them to set 
            up a commitment so that Wendy is paid in Ether for each increase in search ranking (above the initial #15) 
            after a specified amount of time, up to a set maximum payout. Jim creates the SEO commitment by entering 
            the details of the search, the payment details, a timeout (or execution date) of 30 days in the future 
            and transferring the max payout amount which is held in the commitment. As the commitment details are 
            all public and transparent, Wendy can see them as well and can get to work safely in the knowledge that 
            she'll be paid for her efforts. After 30 days, with Wendy and her team's help, the search result for 
            CryptoBetting.com went up to #5, an increase of 10 places! CryptoSEO pays Wendy for her work and then 
            refunds Jim any leftovers. Everyone's happy!
          </p>
          <h2>How it works</h2>
          <p>
            CryptoSEO is a <a href="https://www.wikiwand.com/en/Smart_contract">smart contract</a> which runs on 
            the <a href="https://www.wikiwand.com/en/Ethereum">Ethereum</a> blockchain. Without going into too much detail 
            as to what smart contracts and Ethereum are, it essentially means it's an application which is hosted on 
            nodes all around the world and can be used by anyone. Besides the smart contract itself though, there are 
            a number of other pieces which are needed.
            <br/><br/>
            It consists of the following:
            <ul>
              <li>
                This simple website you're using now, which is a React frontend for interacting with the smart contract. 
                It enables users to create new SEO commitments and view existing ones in a friendly way.
              </li>
              <li>
                The smart contract itself, which stores the list of SEO commitments inside it and executes them at the 
                specified time. It handles the funds, in the cryptocurrency Ether, and pays them out when needed.
              </li>
              <li>
                A simple web app which can be called to do the Google Search and return the search ranking of a site 
                for a specific search term.
              </li>
              <li>
                A <a href="https://chain.link/">Chainlink</a> oracle (and associated node) which can be called by the smart 
                contract to wait till the 
                commitment execution date and then call the web app above to get the final search ranking of the site. 
                An oracle, which is itself a smart contract, is needed as smart contracts cannot access the internet 
                themselves.
              </li>
            </ul>
          </p>
          <p>
              In addition to the above, users of the site will also need some form of web3 extension running in their 
              browser, which stores their assets/funds and allows them to sign transactions which interact with the 
              smart contract. The most common of these is <a href="https://metamask.io/">MetaMask</a>.
              <br/><br/>
              The project is open source and all code is available to see 
              on <a href="https://github.com/JasperTimm/crypto-seo">Github</a>. 
              I also wrote a couple of <a href="https://jaspa.codes/projects/crypto-seo.html">posts</a> on 
              it talking about the development progress.
          </p>
          <h2>Can I use it?</h2>
          <p>
            It's currently only deployed to the test networks. But for those that are curious, I highly encourage 
            you to play around with it. Being on the test network there's no real money involved so you can play 
            around with it as much as you want without risk. Head to the Guide tab if you'd like a more thorough 
            explanation on how to use it.
            <br/><br/>
            If you think you might have a genuine use for it being deployed on main net, feel free to get 
            in <a href="https://twitter.com/IBeMrT">touch</a>.
          </p>
          </Card.Body>
        </Card>
        </Container>      
      )
    }
  }