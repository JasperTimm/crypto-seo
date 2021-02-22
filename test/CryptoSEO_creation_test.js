
const { expectRevert } = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

const statusCodes = ["Created", "Processing", "Completed"]

contract('CryptoSEO commitment creation', accounts => {
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

  const initOraclePayment = 10 ** 18
  var BN = web3.utils.BN

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
        assert.equal(newCommitment.status, statusCodes.indexOf("Processing"))        
        assert.equal(newCommitment.domainMatch, validCommitment.domainMatch)
        assert.equal(newCommitment.site, validCommitment.site)
        assert.equal(newCommitment.searchTerm, validCommitment.searchTerm)
        assert.equal(newCommitment.initialSearchRank, validCommitment.initialSearchRank)
        assert.equal(newCommitment.amtPerRankEth, validCommitment.amtPerRankEth)
        assert.equal(newCommitment.maxPayableEth, validCommitment.maxPayableEth)
        assert.equal(newCommitment.timeToExecute, validCommitment.timeToExecute)
        assert.equal(newCommitment.payee, validCommitment.payee)
        assert.equal(newCommitment.payer, defaultAccount)

        let ocLINKBal = await link.balanceOf(oc.address)
        assert.equal(String(ocLINKBal), String(initOraclePayment))

        let numSEOCommitments = await cc.numSEOCommitments()
        assert.equal(numSEOCommitments, 1)

        let creationEvent = (await cc.getPastEvents('SEOCommitmentCreated'))[0]
        assert.equal(creationEvent.event, "SEOCommitmentCreated")
        assert.equal(creationEvent.returnValues.commitmentId, 0)
        assert.equal(creationEvent.returnValues.site, validCommitment.site)
        assert.equal(creationEvent.returnValues.searchTerm, validCommitment.searchTerm)
      })
    })

    context('when called with initialSearchRank set to 0', () => {
      it('fails to create the commitment', async () => {
        await expectRevert(cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, 0,
          validCommitment.amtPerRankEth, validCommitment.maxPayableEth, validCommitment.timeToExecute, validCommitment.payee, {
            from: defaultAccount,
            value: validCommitment.maxPayableEth
          }), "initialSearchRank must be greater than zero")
      })
    })

    context('when called with amtPerRankEth set to 0', () => {
      it('fails to create the commitment', async () => {
        await expectRevert(cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
          0, validCommitment.maxPayableEth, validCommitment.timeToExecute, validCommitment.payee, {
            from: defaultAccount,
            value: validCommitment.maxPayableEth
          }), "amtPerRankEth must be greater than zero")
      })
    })

    context('when called with maxPayableEth less than amtPerRankEth', () => {
      it('fails to create the commitment', async () => {
        await expectRevert(cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
          validCommitment.maxPayableEth, validCommitment.amtPerRankEth, validCommitment.timeToExecute, validCommitment.payee, {
            from: defaultAccount,
            value: validCommitment.amtPerRankEth
          }), "maxPayableEth must be larger than or equal to amtPerRankEth")
      })
    })

    context('when called with insufficient eth', () => {
      it('fails to create the commitment', async () => {
        await expectRevert(cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
          validCommitment.maxPayableEth, validCommitment.amtPerRankEth, validCommitment.timeToExecute, validCommitment.payee, {
            from: defaultAccount,
          }), "Eth sent didn't match maxPayableEth")
      })
    })
 
    context('when called with timeToExecute in the past', () => {
      it('fails to create the commitment', async () => {
        await expectRevert(cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
          validCommitment.amtPerRankEth, validCommitment.maxPayableEth, Math.floor(Date.now() / 1000) - 10, validCommitment.payee, {
            from: defaultAccount,
            value: validCommitment.maxPayableEth
          }), "timeToExecute must be in the future")
      })
    })

  })

  describe('#createSEOCommitment without LINK approval', () => {
    context('when called without having approved LINK', () => {
      it('fails to create the commitment', async () => {
        await expectRevert.unspecified(cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
          validCommitment.amtPerRankEth, validCommitment.maxPayableEth, validCommitment.timeToExecute, validCommitment.payee, {
            from: defaultAccount,
            value: validCommitment.maxPayableEth
          }))
      })
    })
  })

  describe('#executeSEOCommitment', () => {
    beforeEach(async () => {
      await link.approve(cc.address, String(initOraclePayment), {from: defaultAccount})
      await cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
        validCommitment.amtPerRankEth, validCommitment.maxPayableEth, validCommitment.timeToExecute, validCommitment.payee, {
          from: defaultAccount,
          value: validCommitment.maxPayableEth
        })      
    })

    context('when called with a valid commitment', () => {
      it('executes the commitment', async () => {
        let requestEvent = (await cc.getPastEvents('RequestGoogleSearchSent'))[0]
        assert.equal(requestEvent.returnValues.commitmentId, 0)

        let reqId = requestEvent.returnValues.requestId
        assert.equal(reqId.length, 66)
        assert.equal(reqId.startsWith("0x"), true)

        let searchReq = await cc.requestMap(reqId)
        assert.equal(searchReq.isValue, true)
        assert.equal(searchReq.commitmentId, 0)

        let comt = await cc.seoCommitmentList(0)
        assert.equal(comt.requestId, reqId)
      })
    })
  })

})