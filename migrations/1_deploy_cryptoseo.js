const CryptoSEO = artifacts.require("CryptoSEO")
const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
const { Oracle } = require('@chainlink/contracts/truffle/v0.6/Oracle')

module.exports = async (deployer, network, [defaultAccount]) => {
  if (network == "test") {
    //Testing set up here
    LinkToken.setProvider(deployer.provider)
    Oracle.setProvider(deployer.provider)
    try {
      await deployer.deploy(LinkToken, { from: defaultAccount })
      await deployer.deploy(Oracle, LinkToken.address, { from: defaultAccount })
      await deployer.deploy(CryptoSEO, LinkToken.address, Oracle.address, "000")
    } catch (err) {
      console.error(err)
    }
  } else {
    //TODO: Put the Oracle address and Job ID somewhere in config (this is for Rinkeby)
    deployer.deploy(CryptoSEO, '0x0000000000000000000000000000000000000000', "0x07389e110b741b60466f71e40f9643ef1341bc01", "0854301f6f6c4d2a974d54ea1a57d441")
  }
};
