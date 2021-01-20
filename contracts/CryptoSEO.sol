//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.6/vendor/Ownable.sol";

contract CryptoSEO is ChainlinkClient, Ownable {
  uint256 constant private ORACLE_PAYMENT = 1 * LINK;

  enum SeoContractStatus { Created, Processing, Completed }

  struct SEOContract {
    string site;
    string searchTerm;
    bool domainMatch;
    uint256 initialSearchRank;
    uint256 amtPerRankEth;
    uint256 maxPayableEth;
    uint256 timeToExecute; // in secs since Epoch
    address payable payee;
    address payable payer;
    SeoContractStatus status;
  }

  event RequestGoogleSearchFulfilled(
    bytes32 indexed requestId,
    uint256 indexed rank
  );

  mapping (uint256=>SEOContract) public seoContractList;
  mapping (bytes32=>SEOContract) public procContractList;
  uint256 public numSEOContracts;
  address public oracle;
  string public googleSearchJobId;

  constructor() public Ownable() {
    numSEOContracts = 0;
    setPublicChainlinkToken();
  }

  function setOracle(address _oracle) public onlyOwner {
    oracle = _oracle;
  }

  function setGoogleSearchJobId(string calldata _jobid) public onlyOwner {
    googleSearchJobId = _jobid;
  }

  function withdrawEther() public onlyOwner {
    msg.sender.transfer(address(this).balance);
  } 

  function createSEOContract(string calldata site, string calldata searchTerm, bool domainMatch,
    uint256 initialSearchRank, uint256 amtPerRankEth, uint256 maxPayableEth,
    uint256 timeToExecute, address payable payee) public payable returns (uint256) {
    require(msg.value == maxPayableEth, "Eth sent didn't match maxPayableEth");
    require(maxPayableEth > amtPerRankEth, "maxPayableEth must be larger than amtPerRankEth");
    require(initialSearchRank > 0, "initialSearchRank must be non-zero");

    SEOContract memory cont = SEOContract(site, searchTerm, domainMatch, initialSearchRank,
      amtPerRankEth, maxPayableEth, timeToExecute, payee, msg.sender, SeoContractStatus.Created);
    seoContractList[numSEOContracts] = cont;
    numSEOContracts++;
    return numSEOContracts - 1;
  }

  function executeSEOContract(uint256 contractID) public {
    SEOContract memory cont = seoContractList[contractID];
    require(cont.status == SeoContractStatus.Created, "Contract is not in 'Created' status");
    require(block.timestamp > cont.timeToExecute, "Contract is not ready to execute yet");
    cont.status = SeoContractStatus.Processing;

    bytes32 requestId = requestGoogleSearch(cont, this.fulfillContract.selector);
    procContractList[requestId] = cont;
    delete seoContractList[contractID];
  }

  function requestGoogleSearch(SEOContract memory cont, bytes4 callbackSelector) private returns (bytes32)
  {
    Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32(googleSearchJobId), address(this), callbackSelector);
    req.add("term", cont.searchTerm);
    req.add("site", cont.site);
    if (cont.domainMatch) {
      req.add("domainMatch", "true");
    }
    return sendChainlinkRequestTo(oracle, req, ORACLE_PAYMENT);
  }

  function fulfillContract(bytes32 _requestId, uint256 _rank)
    public
    recordChainlinkFulfillment(_requestId)
  {
    // Ensure we're only called as a callback from the Oracle
    require(msg.sender == oracle, "This function can only be called by the Oracle");

    emit RequestGoogleSearchFulfilled(_requestId, _rank);

    SEOContract memory cont = procContractList[_requestId];
    delete procContractList[_requestId];

    if (_rank == 0 || _rank > cont.initialSearchRank) {
      // Search rank was worse, return funds to payer
      cont.payer.transfer(cont.maxPayableEth);
      return;
    }
    uint256 payForRankInc = (cont.initialSearchRank - _rank) * cont.amtPerRankEth;
    if (payForRankInc > cont.maxPayableEth) {
      cont.payee.transfer(cont.maxPayableEth);
      return;
    } else {
      uint256 refund = cont.maxPayableEth - payForRankInc;
      cont.payee.transfer(payForRankInc);
      cont.payer.transfer(refund);
      return;
    }
  }

  function getChainlinkToken() public view returns (address) {
    return chainlinkTokenAddress();
  }

  function withdrawLink() public onlyOwner {
    LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
    require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
  }

  function cancelRequest(
    bytes32 _requestId,
    uint256 _payment,
    bytes4 _callbackFunctionId,
    uint256 _expiration
  )
    public
    onlyOwner
  {
    cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
  }

  function stringToBytes32(string memory source) private pure returns (bytes32 result) {
    bytes memory tempEmptyStringTest = bytes(source);
    if (tempEmptyStringTest.length == 0) {
      return 0x0;
    }

    assembly { // solhint-disable-line no-inline-assembly
      result := mload(add(source, 32))
    }
  }

}