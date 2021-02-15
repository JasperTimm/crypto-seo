
/* eslint-disable @typescript-eslint/no-var-requires */
const { oracle } = require('@chainlink/test-helpers')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

contract('CryptoSEO simple', accounts => {
  const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
  const { Oracle } = require('@chainlink/contracts/truffle/v0.6/Oracle')
  const CryptoSEO = artifacts.require('CryptoSEO')

  const defaultAccount = accounts[0]
  const oracleNode = accounts[1]
  const stranger = accounts[2]
  const consumer = accounts[3]

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

  describe('#setOracle', () => {
    context('when called by a non-owner', () => {
      it('cannot set oracle', async () => {
        await expectRevert(cc.setOracle(zeroAddr, { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the oracle address', async () => {
        let oracleAddr = await cc.oracle()
        assert.equal(oracleAddr, oc.address)
        await cc.setOracle(zeroAddr, { from: consumer })
        oracleAddr = await cc.oracle()
        assert.equal(oracleAddr, zeroAddr)
      })
    })
  })

  describe('#setGoogleSearchJobId', () => {
    context('when called by a non-owner', () => {
      it('cannot set job id', async () => {
        await expectRevert(cc.setGoogleSearchJobId(newJobId, { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the job id', async () => {
        let jobId = await cc.googleSearchJobId()
        assert.equal(jobId, searchJobId)
        await cc.setGoogleSearchJobId(newJobId, { from: consumer })
        jobId = await cc.googleSearchJobId()
        assert.equal(jobId, newJobId)
      })
    })
  })

  describe('#setRequestTimeout', () => {
    context('when called by a non-owner', () => {
      it('cannot set the request timeout', async () => {
        await expectRevert(cc.setRequestTimeout(0, { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the request timeout', async () => {
        let reqExpiry = await cc.REQUEST_EXPIRY()
        assert.equal(reqExpiry, initReqExpiry)
        await cc.setRequestTimeout(0, { from: consumer })
        reqExpiry = await cc.REQUEST_EXPIRY()
        assert.equal(reqExpiry, 0)
      })
    })
  })

  describe('#setOraclePayment', () => {
    context('when called by a non-owner', () => {
      it('cannot set the oracle payment', async () => {
        await expectRevert(cc.setOraclePayment(0, { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the oracle payment', async () => {
        let oraclePmt = await cc.ORACLE_PAYMENT()
        assert.equal(oraclePmt, initOraclePayment)
        await cc.setOraclePayment(0, { from: consumer })
        oraclePmt = await cc.ORACLE_PAYMENT()
        assert.equal(oraclePmt, 0)
      })
    })
  })

  describe('#withdrawEther', () => {
    beforeEach(async () => {
      await cc.withdrawEther({ from: consumer })
      await web3.eth.sendTransaction({
        to: cc.address,
        from: defaultAccount,
        value: payment
      })
    })

    context('when called by a non-owner', () => {
      it('cannot withdraw', async () => {
        await expectRevert(cc.withdrawEther({ from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('transfers ETH to the owner', async () => {
        const beforeBal = new BN(await web3.eth.getBalance(consumer))
        const receipt = await cc.withdrawEther({ from: consumer })
        const afterBal = new BN(await web3.eth.getBalance(consumer))

        const tx = await web3.eth.getTransaction(receipt.transactionHash)
        const txCost = new BN(tx.gasPrice * receipt.cumulativeGasUsed)

        assert.equal(afterBal.toString(), beforeBal.add(new BN(payment)).sub(txCost).toString())
      })
    })
  })

  describe('#withdrawLink', () => {
    beforeEach(async () => {
      await link.transfer(cc.address, payment, {
        from: defaultAccount,
      })
    })

    context('when called by a non-owner', () => {
      it('cannot withdraw', async () => {
        await expectRevert(cc.withdrawLink({ from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('transfers LINK to the owner', async () => {
        const beforeBalance = await link.balanceOf(consumer)
        assert.equal(beforeBalance, '0')
        await cc.withdrawLink({ from: consumer })
        const afterBalance = await link.balanceOf(consumer)
        assert.equal(afterBalance, payment)
      })
    })
  })


})