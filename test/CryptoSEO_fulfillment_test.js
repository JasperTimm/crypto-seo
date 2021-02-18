
const { expectRevert } = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

const statusCodes = ["Created", "Processing", "Completed"]

contract('CryptoSEO commitment fulfillment', accounts => {
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
    initialSearchRank: "15",
    amtPerRankEth: web3.utils.toWei('0.001', 'ether'), // in  Wei
    maxPayableEth: web3.utils.toWei('0.01', 'ether'), // in Wei
    timeToExecute: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // Will execute a month from now
    payee: stranger,
  }

  const initOraclePayment = 10 ** 18
  var BN = web3.utils.BN

  let link, oc, cc, reqEvt

  beforeEach(async () => {
    link = await LinkToken.new({ from: defaultAccount })
    oc = await Oracle.new(link.address, { from: defaultAccount })
    cc = await CryptoSEO.new(link.address, oc.address, "000", { from: consumer })
    await oc.setFulfillmentPermission(oracleNode, true, {
      from: defaultAccount,
    })
  })

  
  describe('#fulfillCommitment', () => {
    beforeEach(async () => {
      await link.approve(cc.address, String(initOraclePayment), {from: defaultAccount})
      await cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
        validCommitment.amtPerRankEth, validCommitment.maxPayableEth, validCommitment.timeToExecute, validCommitment.payee, {
          from: defaultAccount,
          value: validCommitment.maxPayableEth
        })
      reqEvt = (await oc.getPastEvents('OracleRequest'))[0]
    })

    context('when executed from an address other than the Oracle', () => {
      it('fails to execute', async () => {
        await expectRevert(cc.fulfillCommitment(reqEvt.returnValues.requestId, 0, {from: stranger}), "Source must be the oracle of the request")
      })
    })

    context('when executed with a search rank of 0', () => {
      it('sets max payout for payer', async () => {
        const rank = 0
        await oc.fulfillOracleRequest(reqEvt.returnValues.requestId, reqEvt.returnValues.payment, reqEvt.returnValues.callbackAddr,
          reqEvt.returnValues.callbackFunctionId, reqEvt.returnValues.cancelExpiration, web3.utils.padLeft(web3.utils.toHex(rank), 64), {
            from: oracleNode
          })
        let payoutEvt = (await cc.getPastEvents('PayoutCommitment'))[0]
        assert.equal(payoutEvt.returnValues.commitmentId, 0)
        assert.equal(payoutEvt.returnValues.payerBal, validCommitment.maxPayableEth)
        assert.equal(payoutEvt.returnValues.payeeBal, '0')

        let searchEvt = (await cc.getPastEvents('RequestGoogleSearchFulfilled'))[0]
        assert.equal(searchEvt.returnValues.requestId, reqEvt.returnValues.requestId)
        assert.equal(searchEvt.returnValues.rank, rank)

        let payerAmt = await cc.payoutAmt(defaultAccount)
        let payeeAmt = await cc.payoutAmt(validCommitment.payee)
        assert.equal(payerAmt, validCommitment.maxPayableEth)
        assert.equal(payeeAmt, '0')

        let req = await cc.requestMap(reqEvt.returnValues.requestId)
        assert.equal(req.isValue, false)

        let comt = await cc.seoCommitmentList(0)
        assert.equal(comt.isValue, true)
        assert.equal(comt.status, statusCodes.indexOf("Completed"))
      })
    })

    context('when executed with a search rank equal to initial rank', () => {
      it('sets max payout for payer', async () => {
        const rank = validCommitment.initialSearchRank
        await oc.fulfillOracleRequest(reqEvt.returnValues.requestId, reqEvt.returnValues.payment, reqEvt.returnValues.callbackAddr,
          reqEvt.returnValues.callbackFunctionId, reqEvt.returnValues.cancelExpiration, web3.utils.padLeft(web3.utils.toHex(rank), 64), {
            from: oracleNode
          })
        let payoutEvt = (await cc.getPastEvents('PayoutCommitment'))[0]
        assert.equal(payoutEvt.returnValues.commitmentId, 0)
        assert.equal(payoutEvt.returnValues.payerBal, validCommitment.maxPayableEth)
        assert.equal(payoutEvt.returnValues.payeeBal, '0')

        let searchEvt = (await cc.getPastEvents('RequestGoogleSearchFulfilled'))[0]
        assert.equal(searchEvt.returnValues.requestId, reqEvt.returnValues.requestId)
        assert.equal(searchEvt.returnValues.rank, rank)

        let payerAmt = await cc.payoutAmt(defaultAccount)
        let payeeAmt = await cc.payoutAmt(validCommitment.payee)
        assert.equal(payerAmt, validCommitment.maxPayableEth)
        assert.equal(payeeAmt, '0')

        let req = await cc.requestMap(reqEvt.returnValues.requestId)
        assert.equal(req.isValue, false)

        let comt = await cc.seoCommitmentList(0)
        assert.equal(comt.isValue, true)
        assert.equal(comt.status, statusCodes.indexOf("Completed"))        
      })
    })

    context('when executed with a search rank slightly better than initial rank', () => {
      it('splits payout between payer and payee', async () => {
        const rankIncr = 4
        const rank = validCommitment.initialSearchRank - rankIncr
        const expPayeeBal = (new BN(validCommitment.amtPerRankEth)).mul(new BN(rankIncr))
        const expPayerBal = (new BN(validCommitment.maxPayableEth)).sub(expPayeeBal)

        await oc.fulfillOracleRequest(reqEvt.returnValues.requestId, reqEvt.returnValues.payment, reqEvt.returnValues.callbackAddr,
          reqEvt.returnValues.callbackFunctionId, reqEvt.returnValues.cancelExpiration, web3.utils.padLeft(web3.utils.toHex(rank), 64), {
            from: oracleNode
          })
        let payoutEvt = (await cc.getPastEvents('PayoutCommitment'))[0]
        assert.equal(payoutEvt.returnValues.commitmentId, 0)
        assert.equal(payoutEvt.returnValues.payerBal, String(expPayerBal))
        assert.equal(payoutEvt.returnValues.payeeBal, String(expPayeeBal))

        let searchEvt = (await cc.getPastEvents('RequestGoogleSearchFulfilled'))[0]
        assert.equal(searchEvt.returnValues.requestId, reqEvt.returnValues.requestId)
        assert.equal(searchEvt.returnValues.rank, rank)

        let payerAmt = await cc.payoutAmt(defaultAccount)
        let payeeAmt = await cc.payoutAmt(validCommitment.payee)
        assert.equal(payerAmt, String(expPayerBal))
        assert.equal(payeeAmt, String(expPayeeBal))

        let req = await cc.requestMap(reqEvt.returnValues.requestId)
        assert.equal(req.isValue, false)

        let comt = await cc.seoCommitmentList(0)
        assert.equal(comt.isValue, true)
        assert.equal(comt.status, statusCodes.indexOf("Completed"))        
      })
    })
    
    context('when executed with a search rank a lot better than initial rank', () => {
      it('sets max payout for payee', async () => {
        const rank = 2

        await oc.fulfillOracleRequest(reqEvt.returnValues.requestId, reqEvt.returnValues.payment, reqEvt.returnValues.callbackAddr,
          reqEvt.returnValues.callbackFunctionId, reqEvt.returnValues.cancelExpiration, web3.utils.padLeft(web3.utils.toHex(rank), 64), {
            from: oracleNode
          })
        let payoutEvt = (await cc.getPastEvents('PayoutCommitment'))[0]
        assert.equal(payoutEvt.returnValues.commitmentId, 0)
        assert.equal(payoutEvt.returnValues.payerBal, '0')
        assert.equal(payoutEvt.returnValues.payeeBal, validCommitment.maxPayableEth)

        let searchEvt = (await cc.getPastEvents('RequestGoogleSearchFulfilled'))[0]
        assert.equal(searchEvt.returnValues.requestId, reqEvt.returnValues.requestId)
        assert.equal(searchEvt.returnValues.rank, rank)

        let payerAmt = await cc.payoutAmt(defaultAccount)
        let payeeAmt = await cc.payoutAmt(validCommitment.payee)
        assert.equal(payerAmt, '0')
        assert.equal(payeeAmt, validCommitment.maxPayableEth)

        let req = await cc.requestMap(reqEvt.returnValues.requestId)
        assert.equal(req.isValue, false)

        let comt = await cc.seoCommitmentList(0)
        assert.equal(comt.isValue, true)
        assert.equal(comt.status, statusCodes.indexOf("Completed"))        
      })
    })
  })

  describe('#withdrawPayout', () => {
    beforeEach(async () => {
      let rank = 0
      await link.approve(cc.address, String(initOraclePayment), {from: defaultAccount})
      await cc.createSEOCommitment(validCommitment.site, validCommitment.searchTerm, validCommitment.domainMatch, validCommitment.initialSearchRank,
        validCommitment.amtPerRankEth, validCommitment.maxPayableEth, validCommitment.timeToExecute, validCommitment.payee, {
          from: defaultAccount,
          value: validCommitment.maxPayableEth
        })
      reqEvt = (await oc.getPastEvents('OracleRequest'))[0]
      await oc.fulfillOracleRequest(reqEvt.returnValues.requestId, reqEvt.returnValues.payment, reqEvt.returnValues.callbackAddr,
        reqEvt.returnValues.callbackFunctionId, reqEvt.returnValues.cancelExpiration, web3.utils.padLeft(web3.utils.toHex(rank), 64), {
          from: oracleNode
        })      
    })

    context('when called from an address with no payout', () => {
      it('reverts with an error', async () => {
        await expectRevert(cc.withdrawPayout({from: stranger}), "Nothing to payout")
      })
    })
    
    context('when called from an address with a payout', () => {
      it('transfers the payout amt to the sender', async () => {
        const payout = new BN(validCommitment.maxPayableEth)
        const beforeBal = new BN(await web3.eth.getBalance(defaultAccount))
        const receipt = await cc.withdrawPayout({from: defaultAccount})
        const afterBal = new BN(await web3.eth.getBalance(defaultAccount))

        const tx = await web3.eth.getTransaction(receipt.tx)
        const txCost = new BN(tx.gasPrice * receipt.receipt.cumulativeGasUsed)

        assert.equal(afterBal.toString(), beforeBal.add(payout).sub(txCost).toString())        
      })
    })     
  })  
})