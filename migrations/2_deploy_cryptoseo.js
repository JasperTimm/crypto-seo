const CryptoSEO = artifacts.require("CryptoSEO")
const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
const { Oracle } = require('@chainlink/contracts/truffle/v0.6/Oracle')
require('dotenv').config();

module.exports = async (deployer, network, [defaultAccount]) => {
  if (network == "test") {
    //Testing set up here
    LinkToken.setProvider(deployer.provider)
    Oracle.setProvider(deployer.provider)
    try {
      await deployer.deploy(LinkToken, { from: defaultAccount })
      await deployer.deploy(Oracle, LinkToken.address, { from: defaultAccount })
      await deployer.deploy(CryptoSEO, LinkToken.address, Oracle.address, "000", "001", "http://test.com")
    } catch (err) {
      console.error(err)
    }
  } else {
    //TODO: Put the Oracle address and Job ID somewhere in config (this is for Rinkeby)
    deployer.deploy(CryptoSEO, 
      '0x0000000000000000000000000000000000000000', 
      process.env.ORACLE_ADDR,
      process.env.SLEEP_JOB_ID,
      process.env.SEARCH_JOB_ID,
      process.env.SEARCH_URL)
  }
};
