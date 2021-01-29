const CryptoSEO = artifacts.require("CryptoSEO");

module.exports = function (deployer, network, accounts) {
  if (network == "test") {
    //Testing set up here
  } else {
    deployer.deploy(CryptoSEO,"0x07389e110b741b60466f71e40f9643ef1341bc01","0854301f6f6c4d2a974d54ea1a57d441")
  }
};
