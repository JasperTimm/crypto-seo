
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

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
  }

  const zeroAddr = '0x0000000000000000000000000000000000000000'
  const searchUrl = "http://test.com/search"
  const sleepPayment = 0.1 * 10 ** 18
  const searchPayment = 0.1 * 10 ** 18
  const linkPayment = sleepPayment + searchPayment  
  var BN = web3.utils.BN

  let link, oc, cc

  beforeEach(async () => {
    link = await LinkToken.new({ from: defaultAccount })
    oc = await Oracle.new(link.address, { from: defaultAccount })
    cc = await CryptoSEO.new(link.address, oc.address, "001", "002", searchUrl, { from: consumer })
    await oc.setFulfillmentPermission(oracleNode, true, {
      from: defaultAccount,
    })
  })

  describe('#rerunExpiredCommitment', () => {
    beforeEach(async () => {
      let updatedTimeToExecute = (await time.latest()).add(new BN(60 * 60 * 24 * 30)) // Need to keep this updated relative to latest block as we increase time in tests
      await link.approve(cc.address, String(linkPayment), {from: defaultAccount})
      await cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
        validCommitment.amtPerRankEth, validCommitment.maxPayableEth, String(updatedTimeToExecute), validCommitment.payee, {
          from: defaultAccount,
          value: validCommitment.maxPayableEth
        })      
    })

    context('when called with an expired commitment id', () => {
      it('executes the commitment again', async () => {
        await time.increase((60 * 60 * 24 * 31))
        await link.approve(cc.address, String(searchPayment), {from: defaultAccount})
        await cc.rerunExpiredCommitment(0)

        requestEvent = (await cc.getPastEvents('RequestSearchSent'))[0]
        assert.equal(requestEvent.returnValues.commitmentId, 0)
        let expectedUrl = `${searchUrl}?term=${validCommitment.searchTerm}&domainMatch=${validCommitment.domainMatch}&site=${validCommitment.site}`
        assert.equal(requestEvent.returnValues.url, expectedUrl)

        reqId = requestEvent.returnValues.requestId
        assert.equal(reqId.length, 66)
        assert.equal(reqId.startsWith("0x"), true)
        assert.notEqual(reqId, zeroAddr)

        searchReq = await cc.requestMap(reqId)
        assert.equal(searchReq.isValue, true)
        assert.equal(searchReq.commitmentId, 0)
      })
    })

    context('when called with an invalid commitment id', () => {
      it('fails to rerun the commitment', async () => {
        await link.approve(cc.address, String(searchPayment), {from: defaultAccount})
        await expectRevert(cc.rerunExpiredCommitment(50), "No commitment for that commitmentId")
      })
    })

    context('when called with a commitment which has not expired', () => {
      it('fails to rerun the commitment', async () => {
        await expectRevert(cc.rerunExpiredCommitment(0), "Commitment has not yet expired")
      })
    })    

    context('when called without having approved a LINK transfer', () => {
      it('fails to rerun the commitment', async () => {
        await time.increase((60 * 60 * 24 * 31))
        await expectRevert.unspecified(cc.rerunExpiredCommitment(0))
      })
    })

  })

})