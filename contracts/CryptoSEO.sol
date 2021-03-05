//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.6/vendor/Ownable.sol";

contract CryptoSEO is ChainlinkClient, Ownable {
  uint256 public SLEEP_PAYMENT = 0.1 * 10 ** 18;
  uint256 public SEARCH_PAYMENT = 0.1 * 10 ** 18;
  uint256 public REQUEST_EXPIRY = 1 hours;
  LinkTokenInterface private link;
  
  enum SeoCommitmentStatus { Created, Processing, Completed }

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
    bytes32 requestId;
    SeoCommitmentStatus status;
  }

  struct ChainlinkRequest {
    bool isValue;
    uint256 commitmentId;
  }

  event SEOCommitmentCreated(
    uint256 indexed commitmentId,
    string site,
    string searchTerm
  );

  event RequestWaitSent(
    uint256 indexed commitmentId,
    bytes32 indexed requestId,
    uint256 timeToExecute
  );

  event RequestSearchSent(
    uint256 indexed commitmentId,
    bytes32 indexed requestId
  );

  event RequestSearchFulfilled(
    bytes32 indexed requestId,
    uint256 rank
  );

  event PayoutCommitment(
    uint256 indexed commitmentId,
    uint256 payerBal,
    uint256 payeeBal
  );

  mapping (uint256=>SEOCommitment) public seoCommitmentList;
  mapping (bytes32=>ChainlinkRequest) public requestMap;
  mapping (address=>uint256) public payoutAmt;

  uint256 public numSEOCommitments;
  address public oracle;
  string public sleepJobId;
  string public searchJobId;
  string public searchUrl;

  constructor(address _link, address _oracle, string memory _sleepJobId, string memory _searchJobId, string memory _searchUrl) public Ownable() {
    numSEOCommitments = 0;

    if (_link == address(0)) {
      setPublicChainlinkToken();
    } else {
      setChainlinkToken(_link);
    }
    link = LinkTokenInterface(chainlinkTokenAddress());
    
    setOracle(_oracle);
    setSleepJobId(_sleepJobId);
    setSearchJobId(_searchJobId);
    setSearchUrl(_searchUrl);
  }

  //Ensure we can receive Eth transfers for testing
  receive() external payable {}

  function linkAddress() public view returns (address) {
    return address(link);
  }

  function setOracle(address _oracle) public onlyOwner {
    oracle = _oracle;
  }

  function setSleepJobId(string memory _jobid) public onlyOwner {
    sleepJobId = _jobid;
  }

  function setSearchJobId(string memory _jobid) public onlyOwner {
    searchJobId = _jobid;
  }

  function setSearchUrl(string memory _searchUrl) public onlyOwner {
    searchUrl = _searchUrl;
  }

  function setRequestTimeout(uint256 _REQUEST_EXPIRY) public onlyOwner {
    REQUEST_EXPIRY = _REQUEST_EXPIRY;
  }

  function setSleepPayment(uint256 _PAYMENT) public onlyOwner {
    SLEEP_PAYMENT = _PAYMENT;
  }

  function setSearchPayment(uint256 _PAYMENT) public onlyOwner {
    SEARCH_PAYMENT = _PAYMENT;
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
    require(initialSearchRank > 0, "initialSearchRank must be greater than zero");
    require(timeToExecute > now, "timeToExecute must be in the future");
    require(link.transferFrom(msg.sender, address(this), SLEEP_PAYMENT + SEARCH_PAYMENT), "LINK transferFrom not approved");

    SEOCommitment memory comt = SEOCommitment(true, domainMatch, site, searchTerm, initialSearchRank,
      amtPerRankEth, maxPayableEth, timeToExecute, payee, msg.sender, 0, SeoCommitmentStatus.Created);
    uint commitmentId = numSEOCommitments;
    seoCommitmentList[commitmentId] = comt;
    numSEOCommitments++;

    emit SEOCommitmentCreated(commitmentId, site, searchTerm);

    executeWait(commitmentId, comt.timeToExecute);

    return commitmentId;
  }

  function executeWait(uint256 commitmentId, uint256 timeToExecute) private {
    Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32(sleepJobId), address(this), this.fulfillWait.selector);
    req.addUint("until", timeToExecute);
    bytes32 requestId = sendChainlinkRequestTo(oracle, req, SLEEP_PAYMENT);
    requestMap[requestId] = ChainlinkRequest(true, commitmentId);

    emit RequestWaitSent(commitmentId, requestId, timeToExecute);

    return;
  }

  function fulfillWait(bytes32 _requestId)
    public
    onlyOracle
    recordChainlinkFulfillment(_requestId)
  {
    ChainlinkRequest memory req = requestMap[_requestId];
    require(req.isValue, "SearchRequest with that requestId doesn't exit");
    delete requestMap[_requestId];
    executeSEOCommitment(req.commitmentId);

    return;
  } 

  function executeSEOCommitment(uint256 commitmentId) private {
    SEOCommitment memory comt = seoCommitmentList[commitmentId];
    require(comt.isValue, "Not a valid commitment ID");
    require(comt.status == SeoCommitmentStatus.Created, "Commitment is not in 'Created' status");

    bytes32 requestId = requestGoogleSearch(comt, this.fulfillCommitment.selector);
    requestMap[requestId] = ChainlinkRequest(true, commitmentId);

    comt.status = SeoCommitmentStatus.Processing;
    comt.requestId = requestId;
    seoCommitmentList[commitmentId] = comt;

    emit RequestSearchSent(commitmentId, requestId);

    return;
  }

  function requestGoogleSearch(SEOCommitment memory comt, bytes4 callbackSelector) private returns (bytes32 requestId)
  {
    Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32(searchJobId), address(this), callbackSelector);
    string memory url = string(abi.encodePacked(searchUrl, "?term=", comt.searchTerm, "&domainMatch=", comt.domainMatch, "&site=", comt.site));
    req.add("get", url);
    req.add("path", "result");
    return sendChainlinkRequestTo(oracle, req, SEARCH_PAYMENT);
  }

  function rerunExpiredCommitment(uint256 _commitmentId) public commitmentExpired(_commitmentId) {
    require(link.transferFrom(msg.sender, address(this), SEARCH_PAYMENT), "LINK transferFrom not approved");

    SEOCommitment memory comt = seoCommitmentList[_commitmentId];
    delete requestMap[comt.requestId];
    comt.status = SeoCommitmentStatus.Created;
    seoCommitmentList[_commitmentId] = comt;

    executeSEOCommitment(_commitmentId);

    return;
  }

  modifier commitmentExpired(uint256 _commitmentId) {
    SEOCommitment memory comt = seoCommitmentList[_commitmentId];
    require(comt.isValue, "No commitment for that commitmentId");
    require(comt.status == SeoCommitmentStatus.Created, "Commitment is not in Created status");
    require(now > comt.timeToExecute + REQUEST_EXPIRY, "Commitment has not yet expired");
    _;
  }

  modifier onlyOracle() {
    require(msg.sender == oracle, "This function can only be called by the Oracle");
    _;
  }

  function fulfillCommitment(bytes32 _requestId, uint256 _rank)
    public
    onlyOracle
    recordChainlinkFulfillment(_requestId)
  {
    emit RequestSearchFulfilled(_requestId, _rank);

    ChainlinkRequest memory req = requestMap[_requestId];
    require(req.isValue, "SearchRequest with that requestId doesn't exit");
    delete requestMap[_requestId];

    SEOCommitment memory comt = seoCommitmentList[req.commitmentId];
    require(comt.isValue, "No commitment found for that commitmentId");
    require(comt.status == SeoCommitmentStatus.Processing, "Commitment not in processing status");
    comt.requestId = 0;
    comt.status = SeoCommitmentStatus.Completed;
    seoCommitmentList[req.commitmentId] = comt;

    uint256 payerBal = 0;
    uint256 payeeBal = 0;
    if (_rank == 0 || _rank >= comt.initialSearchRank) {
      // Search rank was not better, return funds to payer
      payerBal = comt.maxPayableEth;
    } else {
      uint256 payForRankInc = (comt.initialSearchRank - _rank) * comt.amtPerRankEth;
      if (payForRankInc > comt.maxPayableEth) {
        payeeBal = comt.maxPayableEth;
      } else {
        uint256 refund = comt.maxPayableEth - payForRankInc;
        payerBal = refund;
        payeeBal = payForRankInc;
      }
    }

    payoutAmt[comt.payer] = payoutAmt[comt.payer] + payerBal;
    payoutAmt[comt.payee] = payoutAmt[comt.payee] + payeeBal;

    emit PayoutCommitment(req.commitmentId, payerBal, payeeBal);

    return;
  }

  function withdrawPayout() public {
    require(payoutAmt[msg.sender] > 0, "Nothing to payout");
    uint256 bal = payoutAmt[msg.sender];
    payoutAmt[msg.sender] = 0;
    msg.sender.transfer(bal);

    return;
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