const ATestnetConsumer = artifacts.require("ATestnetConsumer");

module.exports = function (deployer) {
  deployer.deploy(ATestnetConsumer);
};
