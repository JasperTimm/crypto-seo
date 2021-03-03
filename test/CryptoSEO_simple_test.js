
const { expectRevert } = require('@openzeppelin/test-helpers')
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
  const initSleepJobId = "001"
  const initSearchJobId = "002"
  const initSearchUrl = "http://test.com"
  const initReqExpiry = 60 * 60 // (1 hour)
  const initSleepPayment = 0.1 * 10 ** 18
  const initSearchPayment = 0.1 * 10 ** 18
  const payment = web3.utils.toWei('1', 'ether')
  var BN = web3.utils.BN

  let link, oc, cc

  beforeEach(async () => {
    link = await LinkToken.new({ from: defaultAccount })
    oc = await Oracle.new(link.address, { from: defaultAccount })
    cc = await CryptoSEO.new(link.address, oc.address, initSleepJobId, initSearchJobId, initSearchUrl, { from: consumer })
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

  describe('#setSleepJobId', () => {
    context('when called by a non-owner', () => {
      it('cannot set job id', async () => {
        await expectRevert(cc.setSleepJobId("000", { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the job id', async () => {
        let jobId = await cc.sleepJobId()
        assert.equal(jobId, initSleepJobId)
        await cc.setSleepJobId("000", { from: consumer })
        jobId = await cc.sleepJobId()
        assert.equal(jobId, "000")
      })
    })
  })

  describe('#setSearchJobId', () => {
    context('when called by a non-owner', () => {
      it('cannot set job id', async () => {
        await expectRevert(cc.setSearchJobId("000", { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the job id', async () => {
        let jobId = await cc.searchJobId()
        assert.equal(jobId, initSearchJobId)
        await cc.setSearchJobId("000", { from: consumer })
        jobId = await cc.searchJobId()
        assert.equal(jobId, "000")
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

  describe('#setSleepPayment', () => {
    context('when called by a non-owner', () => {
      it('cannot set the sleep payment', async () => {
        await expectRevert(cc.setSleepPayment(0, { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the sleep payment', async () => {
        let sleepPmt = await cc.SLEEP_PAYMENT()
        assert.equal(sleepPmt, initSleepPayment)
        await cc.setSleepPayment(0, { from: consumer })
        oraclePmt = await cc.SLEEP_PAYMENT()
        assert.equal(oraclePmt, 0)
      })
    })
  })

  describe('#setSearchPayment', () => {
    context('when called by a non-owner', () => {
      it('cannot set the search payment', async () => {
        await expectRevert(cc.setSearchPayment(0, { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the search payment', async () => {
        let oraclePmt = await cc.SEARCH_PAYMENT()
        assert.equal(oraclePmt, initSearchPayment)
        await cc.setSearchPayment(0, { from: consumer })
        oraclePmt = await cc.SEARCH_PAYMENT()
        assert.equal(oraclePmt, 0)
      })
    })
  })  

  describe('#setSearchUrl', () => {
    context('when called by a non-owner', () => {
      it('cannot set the search URL', async () => {
        await expectRevert(cc.setSearchUrl("http://new.com", { from: stranger }), "Ownable: caller is not the owner")
      })
    })

    context('when called by the owner', () => {
      it('sets the search URL', async () => {
        let searchUrl = await cc.searchUrl()
        assert.equal(searchUrl, initSearchUrl)
        await cc.setSearchUrl("http://new.com", { from: consumer })
        searchUrl = await cc.searchUrl()
        assert.equal(searchUrl, "http://new.com")
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

        const tx = await web3.eth.getTransaction(receipt.tx)
        const txCost = new BN(tx.gasPrice * receipt.receipt.cumulativeGasUsed)

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