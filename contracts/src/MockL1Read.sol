// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockL1Read {
  struct Position {
    int64 szi;
    uint64 entryNtl;
    int64 isolatedRawUsd;
    uint32 leverage;
    bool isIsolated;
  }

  struct SpotBalance {
    uint64 total;
    uint64 hold;
    uint64 entryNtl;
  }

  struct UserVaultEquity {
    uint64 equity;
    uint64 lockedUntilTimestamp;
  }

  struct Withdrawable {
    uint64 withdrawable;
  }

  struct Delegation {
    address validator;
    uint64 amount;
    uint64 lockedUntilTimestamp;
  }

  struct DelegatorSummary {
    uint64 delegated;
    uint64 undelegated;
    uint64 totalPendingWithdrawal;
    uint64 nPendingWithdrawals;
  }

  struct PerpAssetInfo {
    string coin;
    uint32 marginTableId;
    uint8 szDecimals;
    uint8 maxLeverage;
    bool onlyIsolated;
  }

  struct SpotInfo {
    string name;
    uint64[2] tokens;
  }

  struct TokenInfo {
    string name;
    uint64[] spots;
    uint64 deployerTradingFeeShare;
    address deployer;
    address evmContract;
    uint8 szDecimals;
    uint8 weiDecimals;
    int8 evmExtraWeiDecimals;
  }

  struct UserBalance {
    address user;
    uint64 balance;
  }

  struct TokenSupply {
    uint64 maxSupply;
    uint64 totalSupply;
    uint64 circulatingSupply;
    uint64 futureEmissions;
    UserBalance[] nonCirculatingUserBalances;
  }

  struct Bbo {
    uint64 bid;
    uint64 ask;
  }

  struct AccountMarginSummary {
    int64 accountValue;
    uint64 marginUsed;
    uint64 ntlPos;
    int64 rawUsd;
  }

  struct CoreUserExists {
    bool exists;
  }

  struct BasisAndValue {
    uint64 basis;
    uint64 value;
  }

  struct BorrowLendUserTokenState {
    BasisAndValue borrow;
    BasisAndValue supply;
  }

  constructor() {}

  function position(address, uint16) external pure returns (Position memory) {
    return Position(0, 0, 0, 1, false);
  }

  function spotBalance(address, uint64) external pure returns (SpotBalance memory) {
    return SpotBalance(1000, 500, 500);
  }

  function userVaultEquity(address, address) external pure returns (UserVaultEquity memory) {
    return UserVaultEquity(1000, 0);
  }

  function withdrawable(address) external pure returns (Withdrawable memory) {
    return Withdrawable(1000);
  }

  function delegations(address) external pure returns (Delegation[] memory) {
    Delegation[] memory del = new Delegation[](0);
    return del;
  }

  function delegatorSummary(address) external pure returns (DelegatorSummary memory) {
    return DelegatorSummary(0, 0, 0, 0);
  }

  function markPx(uint32) external pure returns (uint64) {
    return 1000000;
  }

  function oraclePx(uint32) external pure returns (uint64) {
    return 1000000;
  }

  function spotPx(uint32) external pure returns (uint64) {
    return 1000000;
  }

  function l1BlockNumber() external pure returns (uint64) {
    return 123456;
  }

  function perpAssetInfo(uint32) external pure returns (PerpAssetInfo memory) {
    return PerpAssetInfo("BTC", 1, 8, 50, false);
  }

  function spotInfo(uint32) external pure returns (SpotInfo memory) {
    return SpotInfo("USDC", [uint64(1), uint64(2)]);
  }

  function tokenInfo(uint32) external pure returns (TokenInfo memory) {
    uint64[] memory spots = new uint64[](0);
    return TokenInfo("USDC", spots, 100, address(0), address(0), 6, 6, 0);
  }

  function tokenSupply(uint32) external pure returns (TokenSupply memory) {
    UserBalance[] memory balances = new UserBalance[](0);
    return TokenSupply(1000000, 500000, 400000, 100000, balances);
  }

  function bbo(uint32) external pure returns (Bbo memory) {
    return Bbo(999999, 1000001);
  }

  function accountMarginSummary(uint32, address) external pure returns (AccountMarginSummary memory) {
    return AccountMarginSummary(1000, 500, 500, 1000);
  }

  function coreUserExists(address) external pure returns (CoreUserExists memory) {
    return CoreUserExists(true);
  }

  function borrowLendUserState(address, uint64) external pure returns (BorrowLendUserTokenState memory) {
    BasisAndValue memory borrow = BasisAndValue(1000, 500);
    BasisAndValue memory supply = BasisAndValue(2000, 1000);
    return BorrowLendUserTokenState(borrow, supply);
  }
}
