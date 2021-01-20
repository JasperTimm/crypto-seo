//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.6/vendor/Ownable.sol";

contract CryptoSEO is ChainlinkClient, Ownable {
  uint256 constant private ORACLE_PAYMENT = 1 * LINK;
  uint256 constant private REQUEST_EXPIRY = 1 days;

  enum SeoContractStatus { Created, Processing }

  struct SEOContract {
    bool isValue;
    bool domainMatch;
    string site;
    string searchTerm;
    uint256 initialSearchRank;
    uint256 amtPerRankEth;
    uint256 maxPayableEth;
    uint256 timeToExecute; // in secs since Epoch
    address payable payee;
    address payable payer;
    SeoContractStatus status;
  }

  struct SearchRequest {
    bool isValue;
    uint256 contractId;
    uint256 requestTime;
  }

  event RequestGoogleSearchFulfilled(
    bytes32 indexed requestId,
    uint256 indexed rank
  );

  mapping (uint256=>SEOContract) public seoContractList;
  mapping (bytes32=>SearchRequest) public requestMap;

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
    uint256 timeToExecute, address payable payee) public payable returns (uint256 contractId) {
    require(msg.value == maxPayableEth, "Eth sent didn't match maxPayableEth");
    require(amtPerRankEth > 0, "amtPerRankEth must be greater than zero");
    require(maxPayableEth >= amtPerRankEth, "maxPayableEth must be larger than or equal to amtPerRankEth");
    require(initialSearchRank > 0, "initialSearchRank must be non-zero");

    seoContractList[numSEOContracts] = SEOContract(true, domainMatch, site, searchTerm, initialSearchRank,
      amtPerRankEth, maxPayableEth, timeToExecute, payee, msg.sender, SeoContractStatus.Created);
    numSEOContracts++;
    return numSEOContracts - 1;
  }

  function executeSEOContract(uint256 contractId) public returns (bytes32) {
    SEOContract memory cont = seoContractList[contractId];
    require(cont.isValue, "Not a valid contract ID");
    require(cont.status == SeoContractStatus.Created, "Contract is not in 'Created' status");
    require(now > cont.timeToExecute, "Contract is not ready to execute yet");
    cont.status = SeoContractStatus.Processing;
    seoContractList[contractId] = cont;

    bytes32 requestId = requestGoogleSearch(cont, this.fulfillContract.selector);
    requestMap[requestId] = SearchRequest(true, contractId, now);
    return requestId;
  }

  function requestGoogleSearch(SEOContract memory cont, bytes4 callbackSelector) private returns (bytes32 requestId)
  {
    Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32(googleSearchJobId), address(this), callbackSelector);
    req.add("term", cont.searchTerm);
    req.add("site", cont.site);
    if (cont.domainMatch) {
      req.add("domainMatch", "true");
    }
    return sendChainlinkRequestTo(oracle, req, ORACLE_PAYMENT);
  }

  function resetExpiredRequest(bytes32 _requestId) public {
    SearchRequest memory req = requestMap[_requestId];
    require(req.isValue, "No such request");
    require(now > req.requestTime + REQUEST_EXPIRY, "Request has not yet expired");
    delete requestMap[_requestId];

    SEOContract memory cont = seoContractList[req.contractId];
    require(cont.isValue, "No contract for that requestId");

    cont.status = SeoContractStatus.Created;
    seoContractList[req.contractId] = cont;
    return;
  }

  function fulfillContract(bytes32 _requestId, uint256 _rank)
    public
    recordChainlinkFulfillment(_requestId)
  {
    // Ensure we're only called as a callback from the Oracle
    require(msg.sender == oracle, "This function can only be called by the Oracle");

    emit RequestGoogleSearchFulfilled(_requestId, _rank);

    SearchRequest memory req = requestMap[_requestId];
    require(req.isValue, "SearchRequest with that requestId doesn't exit");
    delete requestMap[_requestId];

    SEOContract memory cont = seoContractList[req.contractId];
    require(cont.isValue, "No contract found for that contractId");
    require(cont.status == SeoContractStatus.Processing, "Contract not in processing status");
    delete seoContractList[req.contractId];

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