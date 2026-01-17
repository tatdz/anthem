// lib/abis/lending.ts - CORRECTED VERSION
export const ANTHEM_LENDING_MODULE_ABI = [
  // ================== VALANTIS INTERFACE ==================
  "function assetBalance() external view returns (uint256)",
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount, address recipient) external",
  
  // ================== LENDING FUNCTIONS ==================
  {
    "inputs": [
      { "internalType": "address", "name": "collateralToken", "type": "address" },
      { "internalType": "uint256", "name": "collateralAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "desiredLoanAmount", "type": "uint256" }
    ],
    "name": "createLoan",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{ "internalType": "uint256", "name": "loanId", "type": "uint256" }],
    "name": "repayLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{ "internalType": "uint256", "name": "loanId", "type": "uint256" }],
    "name": "liquidateLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // ================== INTEREST CALCULATION ==================
  {
    "inputs": [{ "internalType": "uint256", "name": "loanId", "type": "uint256" }],
    "name": "calculateInterest",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // ================== VIEW FUNCTIONS ==================
  {
    "inputs": [{ "internalType": "address", "name": "collateralToken", "type": "address" }],
    "name": "calculateAdlAdjustedLTV",
    "outputs": [
      { "internalType": "uint256", "name": "maxLTV", "type": "uint256" },
      { "internalType": "uint256", "name": "adjustment", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [{ "internalType": "address", "name": "collateralToken", "type": "address" }],
    "name": "getRecommendedLTV",
    "outputs": [
      { "internalType": "uint256", "name": "baseLTV", "type": "uint256" },
      { "internalType": "uint256", "name": "currentLTV", "type": "uint256" },
      { "internalType": "uint256", "name": "adjustment", "type": "uint256" },
      { "internalType": "string", "name": "recommendation", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "getProtocolStats",
    "outputs": [
      { "internalType": "uint256", "name": "totalLoans", "type": "uint256" },
      { "internalType": "uint256", "name": "activeLoans", "type": "uint256" },
      { "internalType": "uint256", "name": "totalCollateral", "type": "uint256" },
      { "internalType": "uint256", "name": "totalBorrowed", "type": "uint256" },
      { "internalType": "uint256", "name": "availableUSDC", "type": "uint256" },
      { "internalType": "uint256", "name": "totalInterestAccrued", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [{ "internalType": "uint256", "name": "loanId", "type": "uint256" }],
    "name": "getLoan",
    "outputs": [
      { "internalType": "address", "name": "borrower", "type": "address" },
      { "internalType": "address", "name": "collateralToken", "type": "address" },
      { "internalType": "uint256", "name": "collateralAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "loanAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "interestAccrued", "type": "uint256" },
      { "internalType": "uint256", "name": "creationTime", type: "uint256" },
      { "internalType": "uint256", "name": "dueDate", "type": "uint256" },
      { "internalType": "bool", "name": "active", "type": "bool" },
      { "internalType": "uint256", "name": "priorityScoreAtCreation", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserLoanIds",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // ================== STATE VARIABLES ==================
  "function totalUSDCDeployed() external view returns (uint256)",
  "function totalCollateralValue() external view returns (uint256)",
  "function loanCount() external view returns (uint256)",
  "function usdc() external view returns (address)",
  "function sAnthem() external view returns (address)",
  "function jAnthem() external view returns (address)",
  
  // ================== EVENTS ==================
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Withdraw",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "loanId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "borrower", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "collateralToken", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "collateralAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "loanAmount", "type": "uint256" }
    ],
    "name": "LoanCreated",
    "type": "event"
  }
] as const;