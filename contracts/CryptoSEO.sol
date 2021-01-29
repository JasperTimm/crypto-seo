//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.6/vendor/Ownable.sol";

contract CryptoSEO is ChainlinkClient, Ownable {
  uint256 private ORACLE_PAYMENT = 1 * LINK;
  uint256 private REQUEST_EXPIRY = 1 days;
  LinkTokenInterface private link;
  
  enum SeoCommitmentStatus { Created, Processing }

  struct SEOCommitment {
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
    SeoCommitmentStatus status;
  }

  struct SearchRequest {
    bool isValue;
    uint256 commitmentId;
    uint256 requestTime;
  }

  event SEOCommitmentCreated(
    uint256 indexed commitmentId,
    string site,
    string searchTerm
  );

  event RequestGoogleSearchSent(
    uint256 indexed commitmentId,
    bytes32 indexed requestId,
    uint256 timeToExecute
  );

  event RequestGoogleSearchFulfilled(
    bytes32 indexed requestId,
    uint256 rank
  );

  event PayoutCommitment(
    uint256 indexed commitmentId,
    uint256 payerBal,
    uint256 payeeBal
  );

  mapping (uint256=>SEOCommitment) public seoCommitmentList;
  mapping (bytes32=>SearchRequest) public requestMap;
  mapping (address=>uint256) public payoutAmt;

  uint256 public numSEOCommitments;
  address public oracle;
  string public googleSearchJobId;

  constructor() public Ownable() {
    numSEOCommitments = 0;
    setPublicChainlinkToken();
    link = LinkTokenInterface(chainlinkTokenAddress());
  }

  //Ensure we can receive Eth transfers for testing
  receive() external payable {}

  function setOracle(address _oracle) public onlyOwner {
    oracle = _oracle;
  }

  function setGoogleSearchJobId(string calldata _jobid) public onlyOwner {
    googleSearchJobId = _jobid;
  }

  function setRequestTimeout(uint256 _REQUEST_EXPIRY) public onlyOwner {
    REQUEST_EXPIRY = _REQUEST_EXPIRY;
  }

  function setOraclePayment(uint256 _ORACLE_PAYMENT) public onlyOwner {
    ORACLE_PAYMENT = _ORACLE_PAYMENT;
  }

  function withdrawEther() public onlyOwner {
    msg.sender.transfer(address(this).balance);
  }

  function withdrawLink() public onlyOwner {
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

  function createSEOCommitment(string calldata site, string calldata searchTerm, bool domainMatch,
    uint256 initialSearchRank, uint256 amtPerRankEth, uint256 maxPayableEth,
    uint256 timeToExecute, address payable payee) public payable returns (uint256) {
    require(msg.value == maxPayableEth, "Eth sent didn't match maxPayableEth");
    require(amtPerRankEth > 0, "amtPerRankEth must be greater than zero");
    require(maxPayableEth >= amtPerRankEth, "maxPayableEth must be larger than or equal to amtPerRankEth");
    require(initialSearchRank > 0, "initialSearchRank must be non-zero");
    require(link.transferFrom(msg.sender, address(this), ORACLE_PAYMENT), "LINK transferFrom not approved");

    SEOCommitment memory comt = SEOCommitment(true, domainMatch, site, searchTerm, initialSearchRank,
      amtPerRankEth, maxPayableEth, timeToExecute, payee, msg.sender, SeoCommitmentStatus.Created);
    uint commitmentId = numSEOCommitments;
    seoCommitmentList[commitmentId] = comt;
    numSEOCommitments++;

    emit SEOCommitmentCreated(commitmentId, site, searchTerm);

    executeSEOCommitment(commitmentId);

    return commitmentId;
  }

  function executeSEOCommitment(uint256 commitmentId) public returns (bytes32) {
    SEOCommitment memory comt = seoCommitmentList[commitmentId];
    require(comt.isValue, "Not a valid commitment ID");
    require(comt.status == SeoCommitmentStatus.Created, "Commitment is not in 'Created' status");

    bytes32 requestId = requestGoogleSearch(comt, this.fulfillCommitment.selector);
    requestMap[requestId] = SearchRequest(true, commitmentId, now);

    comt.status = SeoCommitmentStatus.Processing;
    seoCommitmentList[commitmentId] = comt;

    emit RequestGoogleSearchSent(commitmentId, requestId, comt.timeToExecute);

    return requestId;
  }

  function requestGoogleSearch(SEOCommitment memory comt, bytes4 callbackSelector) private returns (bytes32 requestId)
  {
    Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32(googleSearchJobId), address(this), callbackSelector);
    req.add("term", comt.searchTerm);
    req.add("site", comt.site);
    req.addUint("until", comt.timeToExecute);
    if (comt.domainMatch) {
      req.add("domainMatch", "true");
    }
    return sendChainlinkRequestTo(oracle, req, ORACLE_PAYMENT);
  }

  function resetExpiredRequest(bytes32 _requestId) public {
    SearchRequest memory req = requestMap[_requestId];
    require(req.isValue, "No such request");
    require(now > req.requestTime + REQUEST_EXPIRY, "Request has not yet expired");
    delete requestMap[_requestId];

    SEOCommitment memory comt = seoCommitmentList[req.commitmentId];
    require(comt.isValue, "No commitment for that requestId");

    comt.status = SeoCommitmentStatus.Created;
    seoCommitmentList[req.commitmentId] = comt;
    return;
  }

  function fulfillCommitment(bytes32 _requestId, uint256 _rank)
    public
    recordChainlinkFulfillment(_requestId)
  {
    // Ensure we're only called as a callback from the Oracle
    require(msg.sender == oracle, "This function can only be called by the Oracle");

    emit RequestGoogleSearchFulfilled(_requestId, _rank);

    SearchRequest memory req = requestMap[_requestId];
    require(req.isValue, "SearchRequest with that requestId doesn't exit");
    delete requestMap[_requestId];

    SEOCommitment memory cont = seoCommitmentList[req.commitmentId];
    require(cont.isValue, "No commitment found for that commitmentId");
    require(cont.status == SeoCommitmentStatus.Processing, "Commitment not in processing status");
    delete seoCommitmentList[req.commitmentId];

    uint256 payerBal = 0;
    uint256 payeeBal = 0;
    if (_rank == 0 || _rank > cont.initialSearchRank) {
      // Search rank was worse, return funds to payer
      payerBal = cont.maxPayableEth;
    } else {
      uint256 payForRankInc = (cont.initialSearchRank - _rank) * cont.amtPerRankEth;
      if (payForRankInc > cont.maxPayableEth) {
        payeeBal = cont.maxPayableEth;
      } else {
        uint256 refund = cont.maxPayableEth - payForRankInc;
        payerBal = refund;
        payeeBal = payForRankInc;
      }
    }

    payoutAmt[cont.payer] = payoutAmt[cont.payer] + payerBal;
    payoutAmt[cont.payee] = payoutAmt[cont.payee] + payeeBal;

    emit PayoutCommitment(req.commitmentId, payerBal, payeeBal);

    return;
  }

  function withdrawPayout() public {
    require(payoutAmt[msg.sender] > 0, "Nothing to payout");
    uint256 bal = payoutAmt[msg.sender];
    payoutAmt[msg.sender] = 0;
    msg.sender.transfer(bal);
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