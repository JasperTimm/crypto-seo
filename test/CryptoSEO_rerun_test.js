
/* eslint-disable @typescript-eslint/no-var-requires */
const { oracle } = require('@chainlink/test-helpers')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

const statusCodes = ["Created", "Processing", "Completed"]

contract('CryptoSEO rerun', accounts => {
  const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
  const { Oracle } = require('@chainlink/contracts/truffle/v0.6/Oracle')
  const CryptoSEO = artifacts.require('CryptoSEO')

  const defaultAccount = accounts[0]
  const oracleNode = accounts[1]
  const stranger = accounts[2]
  const consumer = accounts[3]

  const validCommitment = {
    domainMatch: false,
    site: "https://github.com",
    searchTerm: "github",
    initialSearchRank: "5",
    amtPerRankEth: web3.utils.toWei('0.001', 'ether'), // in  Wei
    maxPayableEth: web3.utils.toWei('0.01', 'ether'), // in Wei
    timeToExecute: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // Will execute a month from now
    payee: stranger,

    // payer: consumer,
    // isValue: true,
    // status: 0
  }

  const zeroAddr = '0x0000000000000000000000000000000000000000'
  const searchJobId = "000"
  const newJobId = "001"
  const initReqExpiry = 60 * 60 // (1 hour)
  const initOraclePayment = 10 ** 18
  const payment = web3.utils.toWei('1', 'ether')
  var BN = web3.utils.BN

  // These parameters are used to validate the data was received
  // on the deployed oracle contract. The Job ID only represents
  // the type of data, but will not work on a public testnet.
  // For the latest JobIDs, visit a node listing service like:
  // https://market.link/
  const jobId = web3.utils.toHex('4c7b7ffb66b344fbaa64995af81e355a')
  const url =
    'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,JPY'
  const path = 'USD'
  const times = 100

  let link, oc, cc

  beforeEach(async () => {
    link = await LinkToken.new({ from: defaultAccount })
    oc = await Oracle.new(link.address, { from: defaultAccount })
    cc = await CryptoSEO.new(link.address, oc.address, "000", { from: consumer })
    await oc.setFulfillmentPermission(oracleNode, true, {
      from: defaultAccount,
    })
  })

  describe('#rerunExpiredRequest', () => {
    beforeEach(async () => {
      let updatedTimeToExecute = (await time.latest()).add(new BN(60 * 60 * 24 * 30)) // Need to keep this updated relative to latest block as we increase time in tests
      await link.approve(cc.address, String(initOraclePayment), {from: defaultAccount})
      await cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
        validCommitment.amtPerRankEth, validCommitment.maxPayableEth, String(updatedTimeToExecute), validCommitment.payee, {
          from: defaultAccount,
          value: validCommitment.maxPayableEth
        })      
    })

    context('when called with an expired request id', () => {
      it('executes the commitment again', async () => {
        let requestEvent = (await cc.getPastEvents('RequestGoogleSearchSent'))[0]
        let reqId = requestEvent.returnValues.requestId
        let reqTimeToExecute = requestEvent.returnValues.timeToExecute
        await time.increase((60 * 60 * 24 * 31))
        await link.approve(cc.address, String(initOraclePayment), {from: defaultAccount})
        await cc.rerunExpiredRequest(reqId)

        let searchReq = await cc.requestMap(reqId)
        assert.equal(searchReq.isValue, false)

        requestEvent = (await cc.getPastEvents('RequestGoogleSearchSent'))[0]
        assert.equal(requestEvent.returnValues.commitmentId, 0)
        assert.equal(requestEvent.returnValues.timeToExecute, reqTimeToExecute)

        reqId = requestEvent.returnValues.requestId
        assert.equal(reqId.length, 66)
        assert.equal(reqId.startsWith("0x"), true)

        searchReq = await cc.requestMap(reqId)
        assert.equal(searchReq.isValue, true)
        assert.equal(searchReq.commitmentId, 0)
        assert.equal(searchReq.timeToExecute, reqTimeToExecute)        
      })
    })


    context('when called with an invalid request id', () => {
      it('fails to rerun the commitment', async () => {
        await link.approve(cc.address, String(initOraclePayment), {from: defaultAccount})
        await expectRevert(cc.rerunExpiredRequest(zeroAddr), "No such request")
      })
    })

    context('when called with a request which has not expired', () => {
      it('fails to rerun the commitment', async () => {
        let requestEvent = (await cc.getPastEvents('RequestGoogleSearchSent'))[0]
        let reqId = requestEvent.returnValues.requestId
        await expectRevert(cc.rerunExpiredRequest(reqId), "Request has not yet expired")
      })
    })    

    context('when called without having approved a LINK transfer', () => {
      it('fails to rerun the commitment', async () => {
        let requestEvent = (await cc.getPastEvents('RequestGoogleSearchSent'))[0]
        let reqId = requestEvent.returnValues.requestId
        await time.increase((60 * 60 * 24 * 31))
        await expectRevert(cc.rerunExpiredRequest(reqId), "Error: Revert or exceptional halt")
      })
    })

  })

})