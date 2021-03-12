import React, { Component } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Card, Container } from 'react-bootstrap'

export default class Guide extends Component {
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
          <h1>Guide</h1>
          <p>
            This is intended to be a guide to those users that are unfamiliar with 
            smart contracts and using web3. It should also explain how to use
            Crypto SEO if it isn't clear.
          </p>
          <h2>Install a web3 extension</h2>
          <p>
              The first thing you'll need is a web3 extension which will store all your
              (test!) coins/tokens. You can then connect the extension to this site and
              transfer them in order to create SEO commitments.
          </p>
          <p>
              Go ahead and download <a href="https://metamask.io/download.html">MetaMask</a> for 
              your browser.
          </p>
          <p>
              After installing it, it'll run you through set up. Assuming you don't have an 
              existing crypto wallet you want to import to the extension, you can go with the 
              <b>"Create a wallet"</b> option.
          </p>
          <p>
              Enter a password. This will be used to unlock MetaMask when you haven't used it for
              a while. Record the secret backup phrase (or seed phrase), which can later be used
              to restore your accounts if you lose them for some reason. If you're only using this
              for testing you don't need to worry so much, but keep in mind these accounts can also
              be used on the mainnet (where the <i>real</i> money is) as well. If you decide later to 
              use these same accounts on mainnet you'll want to make sure you've stored the above
              securely.
          </p>
          <p>
              You should now have created your first account with MetaMask. Hooray! By default the
              selected network will be <b>Ethereum Mainnet</b>. From this dropdown you can switch to the
              other test networks as well. This guide will assume you're using the <b>Kovan</b> test
              network from here on out.
          </p>
          <p>
              Finally, to fully test Crypto SEO, we'll need to create another Account so we can
              simulate haivng a <b>payer</b> and <b>payee</b> when creating the commitment. The colourful 
              circle in the top right of MetaMask will show your accounts. Go ahead and create
              another one.
          </p>
          <p>
              All done. Now we can start filling up your wallet with Ether and tokens!
          </p>
          <h2>Get that money</h2>
          <p>
              As the test networks don't deal with real assets, there are dedicated faucets 
              which can be freely used by people to get test Ether and tokens to play around with.
              We'll need two assets in our wallet in order to create SEO Commitments, the common
              currency used on Ethereum: <b>Ether</b>, and also a token called <b>LINK</b>, which is used
              to pay the Oracle to do our Search ranking look up. You'll need to know the 
              address of your account in MetaMask before using them, click <b>Account 1</b> in MetaMask 
              to copy it to the clipboard. Your address for each account is the same on ALL networks.
          </p>
          <h3>Test Ether on Kovan</h3>
          <p>
              Every test network has a slightly different way of retrieving test Ether from the
              faucet. Unfortunately Kovan is one of the trickier 
              ones. This <a href="https://github.com/kovan-testnet/faucet">page</a> is 
              supposed to give the latest information on how to obtain test Ether.
          </p>
          <h4>Gitter chat bot</h4>
          <p>
              <a href="https://gitter.im/kovan-testnet/faucet">This</a> Gitter 
              link will take you to a chat with a bot that dispenses Ether. However, the bot that dispenses
              Ether is often not available. If you see responses in the chat along the lines of
              "I just sent you X Ether" you're in luck, otherwise if you just see a bunch of people
              posting addresses with no response you'll have to try again later. If the bot is
              available though, go ahead and post the address of your account in chat like everyone 
              else. After a while you should see a response from the bot, check MetaMask and you
              should have some test Ether!
          </p>
          <h4>MyCrypto faucet</h4>
          <p>
              A slightly more reliable way is to use <a href="https://app.mycrypto.com/faucet">MyCrypto</a>. 
              Unfortunately, it's a little more involved to set up your account e.t.c and the faucet only
              gives you a measly 0.01 Ether.
          </p>
          <h3>Getting test LINK tokens</h3>
          <p>
              Thankfully LINK is a lot easier to obtain on the test networks. You can head to 
              this <a href="https://kovan.chain.link/">link</a> to get it on Kovan. Replace 'kovan'
              with any other test network to see the equivalent faucets. 
          </p>
          <p>
              Enter your address and get your free 100 LINK tokens. In order to see these assets 
              hit your wallet though, you'll need to tell MetaMask the address of the LINK token.
              Head to <a href="https://docs.chain.link/docs/link-token-contracts">this</a> page 
              to get the address of the LINK token for each network.
              Now, in MetaMask, at the bottom, you should see an 'Add Token' button, click it and then
              go to the 'Custom token' tab. Enter the address for your network and 'LINK' as the
              name and 'Next'. You should now see your LINK tokens in your assets list!
          </p>
          <h2>Create the SEO Commitment</h2>
          <p>
              It's finally time to create your SEO Commitment! First thing you need to do is allow
              this site to see the accounts you have in MetaMask. In the top right of this site you'll
              see a Connect button, go ahead and click it and proceed through the dialogs. After 
              that, if all has gone well, you should see your account address where the Connect 
              button was and to the left the network you're connected to, which should be Kovan. 
              If not, refresh the page and wait a second for it to hopefully resolve.
          </p>
          <p>
              Head to the Create tab above, you should see a form which lets you fill in the details
              of the SEO Commitment you'd like to create. Fill out the search details. Hitting 
              the <b>Refresh</b> button will give you the latest search ranking for the term and site. 
              As we're just testing though, and we want to see this contract working, you can click
              the toggle to enter a ranking manually. If you enter a number a few ranks lower than
              the current one you can see how the payout mechanism works.
          </p>
          <p>
              Now enter the <b>Account 2</b> address as the Payee, fill out the payment details with
              some relatively little amounts that your test wallet can afford and set the timeout to a few
              minutes into the future so we can see it working quickly. After hitting <b>Submit</b>,
              you should be taken through some dialogs to create your commitment, giving you a
              number which represents its ID.
          </p>
          <p>
              Once it's created you'll be taken to the View tab where you can see the details of your
              new SEO commitment. You should see a date for when the commitment is expected to execute.
              Once this time has passed, the status should update to <b>Processing</b> and finally
              <b>Completed</b> (you may need to hit 'Back' and search again to refresh). If it executed
              correctly you should see a small box at the bottom where you can retrieve any returned
              funds (if there were any). And switching to Payee's account (<b>Account 2</b>) should
              show you the payout amount waiting to be withdrawn for them too. That's it!
          </p>
          </Card.Body>
        </Card>
        </Container>      
      )
    }
  }