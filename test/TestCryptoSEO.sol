pragma solidity 0.6.12;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/CryptoSEO.sol";

contract TestCryptoSEO {
  function testCryptoSEO() public {
    Assert.equal(uint(1), uint(1), "Oh no!");
  }
}