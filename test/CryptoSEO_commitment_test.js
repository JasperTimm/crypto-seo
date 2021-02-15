
/* eslint-disable @typescript-eslint/no-var-requires */
const { oracle } = require('@chainlink/test-helpers')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

contract('CryptoSEO commitment', accounts => {
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
  const initReqExpiry = 60 * 60 * 24 // (1 day)
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

  describe('#createSEOCommitment', () => {
    beforeEach(async () => {
      await link.approve(cc.address, String(initOraclePayment), {from: defaultAccount})
    })

    context('when called with a valid commitment', () => {
      it('creates the commitment', async () => {
        await cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
          validCommitment.amtPerRankEth, validCommitment.maxPayableEth, validCommitment.timeToExecute, validCommitment.payee, {
            from: defaultAccount,
            value: validCommitment.maxPayableEth
          })
        let newCommitment = await cc.seoCommitmentList(0)
        assert.equal(newCommitment.isValue, true)
      })
    })

  })




})