//AnthemLendingModule.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AnthemSenior} from "./AnthemSenior.sol";
import {AnthemJunior} from "./AnthemJunior.sol";

contract AnthemLendingModule is Ownable {
    using SafeERC20 for IERC20;
    
    // ================== EVENTS ==================
    event LoanCreated(uint256 loanId, address indexed borrower, address collateralToken, uint256 collateralAmount, uint256 loanAmount);
    event LoanRepaid(uint256 loanId, uint256 amountRepaid, uint256 interestPaid);
    event LoanLiquidated(uint256 loanId, address liquidator, uint256 collateralSeized);
    event LTVAdjusted(address collateralToken, uint256 oldLTV, uint256 newLTV, uint256 priorityScore);
    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);
    
    // ================== STRUCTS ==================
    struct Loan {
        address borrower;
        address collateralToken;
        uint256 collateralAmount;
        uint256 loanAmount;
        uint256 interestAccrued; // Interest accrued so far
        uint256 creationTime;
        uint256 dueDate;
        bool active;
        uint256 priorityScoreAtCreation;
    }
    
    // ================== IMMUTABLES ==================
    IERC20 public immutable usdc;
    AnthemSenior public immutable sAnthem;
    AnthemJunior public immutable jAnthem;
    address public immutable oracle;
    
    // ================== STATE VARIABLES ==================
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoanIds;
    uint256 public loanCount;
    
    uint256 public totalUSDCDeployed;
    uint256 public totalCollateralValue;
    
    // LTV parameters (in BPS)
    uint256 public constant MAX_LTV_SENIOR = 6000;
    uint256 public constant MAX_LTV_JUNIOR = 4000;
    uint256 public constant MIN_LTV = 2000;
    uint256 public constant INTEREST_RATE_BPS = 500; // 5% annual in BPS (500 = 5%)
    
    // ================== MODIFIERS ==================
    modifier validCollateral(address token) {
        require(token == address(sAnthem) || token == address(jAnthem), "Invalid collateral");
        _;
    }
    
    modifier onlyBorrower(uint256 loanId) {
        require(loans[loanId].borrower == msg.sender, "Not borrower");
        _;
    }
    
    modifier loanActive(uint256 loanId) {
        require(loans[loanId].active, "Loan inactive");
        _;
    }
    
    // ================== CONSTRUCTOR ==================
    constructor(
        address _usdc,
        address _sAnthem,
        address _jAnthem,
        address _oracle
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "USDC zero address");
        require(_sAnthem != address(0), "sAnthem zero address");
        require(_jAnthem != address(0), "jAnthem zero address");
        require(_oracle != address(0), "Oracle zero address");
        
        usdc = IERC20(_usdc);
        sAnthem = AnthemSenior(_sAnthem);
        jAnthem = AnthemJunior(_jAnthem);
        oracle = _oracle;
    }
    
    // ================== VALANTIS INTERFACE ==================
    function assetBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
    
    function deposit(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalUSDCDeployed += amount;
        emit Deposit(msg.sender, amount);
    }
    
    function withdraw(uint256 amount, address recipient) external onlyOwner {
        require(amount <= usdc.balanceOf(address(this)), "Insufficient balance");
        usdc.safeTransfer(recipient, amount);
        totalUSDCDeployed -= amount;
        emit Withdraw(recipient, amount);
    }
    
    // ================== LENDING LOGIC ==================
    function createLoan(
        address collateralToken,
        uint256 collateralAmount,
        uint256 desiredLoanAmount
    ) external validCollateral(collateralToken) returns (uint256 loanId) {
        require(collateralAmount > 0, "Collateral must be > 0");
        require(desiredLoanAmount > 0, "Loan amount must be > 0");
        
        uint256 priorityScore = _getCurrentPriorityScore();
        (uint256 maxLTV, ) = calculateAdlAdjustedLTV(collateralToken, priorityScore);
        
        uint256 maxLoan = (collateralAmount * maxLTV) / 10000;
        require(desiredLoanAmount <= maxLoan, "Exceeds ADL-adjusted LTV");
        
        require(desiredLoanAmount <= usdc.balanceOf(address(this)), "Insufficient USDC");
        
        // Transfer collateral from borrower
        IERC20(collateralToken).safeTransferFrom(
            msg.sender,
            address(this),
            collateralAmount
        );
        
        // Create loan
        loanId = loanCount++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            collateralToken: collateralToken,
            collateralAmount: collateralAmount,
            loanAmount: desiredLoanAmount,
            interestAccrued: 0,
            creationTime: block.timestamp,
            dueDate: block.timestamp + 30 days,
            active: true,
            priorityScoreAtCreation: priorityScore
        });
        
        userLoanIds[msg.sender].push(loanId);
        totalCollateralValue += collateralAmount;
        
        // Transfer loan amount to borrower
        usdc.safeTransfer(msg.sender, desiredLoanAmount);
        
        emit LoanCreated(loanId, msg.sender, collateralToken, collateralAmount, desiredLoanAmount);
        emit LTVAdjusted(collateralToken, collateralToken == address(sAnthem) ? MAX_LTV_SENIOR : MAX_LTV_JUNIOR, maxLTV, priorityScore);
        
        return loanId;
    }
    
    function repayLoan(uint256 loanId) external onlyBorrower(loanId) loanActive(loanId) {
        Loan storage loan = loans[loanId];
        
        // Calculate interest
        uint256 interest = calculateInterest(loanId);
        uint256 totalRepay = loan.loanAmount + interest;
        
        // Transfer total repayment from borrower to contract
        usdc.safeTransferFrom(msg.sender, address(this), totalRepay);
        
        // Transfer collateral back to borrower
        IERC20(loan.collateralToken).safeTransfer(msg.sender, loan.collateralAmount);
        
        // Update loan state
        loan.active = false;
        totalCollateralValue -= loan.collateralAmount;
        
        // Transfer interest to owner (from contract balance)
        if (interest > 0) {
            usdc.safeTransfer(owner(), interest);
        }
        
        emit LoanRepaid(loanId, totalRepay, interest);
    }
    
    function liquidateLoan(uint256 loanId) external loanActive(loanId) {
        Loan storage loan = loans[loanId];
        require(block.timestamp > loan.dueDate, "Not overdue");
        
        // Transfer collateral to liquidator
        IERC20(loan.collateralToken).safeTransfer(msg.sender, loan.collateralAmount);
        
        loan.active = false;
        totalCollateralValue -= loan.collateralAmount;
        
        emit LoanLiquidated(loanId, msg.sender, loan.collateralAmount);
    }
    
    // ================== INTEREST CALCULATION ==================
    function calculateInterest(uint256 loanId) public view returns (uint256) {
        Loan memory loan = loans[loanId];
        if (!loan.active) return 0;
        
        uint256 timeElapsed = block.timestamp - loan.creationTime;
        uint256 secondsInYear = 365 days;
        
        // interest = loanAmount * interestRate * timeElapsed / (secondsInYear * 10000)
        uint256 interest = (loan.loanAmount * INTEREST_RATE_BPS * timeElapsed) / (secondsInYear * 10000);
        
        return interest;
    }
    
function calculateTotalRepayment(uint256 loanId) external view returns (uint256) {
    Loan memory loan = loans[loanId];
    if (!loan.active) return loan.loanAmount;
    
    uint256 interest = calculateInterest(loanId);
    // Use safe math
    return loan.loanAmount + interest;
}
    
    // ================== ADL-ADJUSTED LTV ==================
    function calculateAdlAdjustedLTV(
        address collateralToken,
        uint256 priorityScore
    ) public view returns (uint256 maxLTV, uint256 adjustment) {
        uint256 baseLTV = collateralToken == address(sAnthem) ? 
            MAX_LTV_SENIOR : MAX_LTV_JUNIOR;
        
        adjustment = (priorityScore * 4000) / 10000;
        maxLTV = baseLTV - adjustment;
        if (maxLTV < MIN_LTV) maxLTV = MIN_LTV;
        
        return (maxLTV, adjustment);
    }
    
    function getRecommendedLTV(
        address collateralToken
    ) external view returns (
        uint256 baseLTV,
        uint256 currentLTV,
        uint256 adjustment,
        string memory recommendation
    ) {
        uint256 priorityScore = _getCurrentPriorityScore();
        baseLTV = collateralToken == address(sAnthem) ? MAX_LTV_SENIOR : MAX_LTV_JUNIOR;
        (currentLTV, adjustment) = calculateAdlAdjustedLTV(collateralToken, priorityScore);
        
        if (priorityScore > 75) {
            recommendation = "HIGH STRESS: LTV reduced for protection";
        } else if (priorityScore > 25) {
            recommendation = "MODERATE: Standard LTV adjustment";
        } else {
            recommendation = "CALM: Maximum LTV available";
        }
        
        return (baseLTV, currentLTV, adjustment, recommendation);
    }
    
    // ================== VIEW FUNCTIONS ==================
    function getProtocolStats() external view returns (
        uint256 totalLoans,
        uint256 activeLoans,
        uint256 totalCollateral,
        uint256 totalBorrowed,
        uint256 availableUSDC,
        uint256 totalInterestAccrued
    ) {
        uint256 collateral = 0;
        uint256 borrowed = 0;
        uint256 active = 0;
        uint256 interest = 0;
        
        for (uint256 i = 0; i < loanCount; i++) {
            if (loans[i].active) {
                collateral += loans[i].collateralAmount;
                borrowed += loans[i].loanAmount;
                active++;
                interest += calculateInterest(i);
            }
        }
        
        return (
            loanCount, 
            active, 
            collateral, 
            borrowed, 
            usdc.balanceOf(address(this)),
            interest
        );
    }
    
function getLoan(uint256 loanId) external view returns (
    address borrower,
    address collateralToken,
    uint256 collateralAmount,
    uint256 loanAmount,
    uint256 interestAccrued,
    uint256 creationTime,
    uint256 dueDate,
    bool active,
    uint256 priorityScoreAtCreation,
    uint256 currentInterest,
    uint256 totalToRepay
) {
    Loan memory loan = loans[loanId];
    uint256 interest = calculateInterest(loanId);
    uint256 totalRepay = loan.loanAmount + interest;
    
    return (
        loan.borrower,
        loan.collateralToken,
        loan.collateralAmount,
        loan.loanAmount,
        loan.interestAccrued,
        loan.creationTime,
        loan.dueDate,
        loan.active,
        loan.priorityScoreAtCreation,
        interest,
        totalRepay
    );
}
    
    function getUserLoanIds(address user) external view returns (uint256[] memory) {
        return userLoanIds[user];
    }
    
    function getUserLoans(address user) external view returns (uint256[] memory ids, Loan[] memory userLoans) {
        uint256[] memory loanIds = userLoanIds[user];
        Loan[] memory loansArray = new Loan[](loanIds.length);
        
        for (uint256 i = 0; i < loanIds.length; i++) {
            loansArray[i] = loans[loanIds[i]];
        }
        
        return (loanIds, loansArray);
    }
    
    // ================== INTERNAL FUNCTIONS ==================
    function _getCurrentPriorityScore() internal view returns (uint256) {
        (bool success, bytes memory data) = oracle.staticcall(
            abi.encodeWithSignature("priorityScore()")
        );
        
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        return 25;
    }
    
    // ================== ADMIN FUNCTIONS ==================
    function updateInterestRate(uint256 newRateBps) external onlyOwner {
        require(newRateBps <= 2000, "Max 20% interest");
        // This would need a state variable for interest rate
    }
    
    function emergencyWithdrawCollateral(uint256 loanId, address recipient) external onlyOwner {
        Loan storage loan = loans[loanId];
        require(loan.active, "Loan inactive");
        
        IERC20(loan.collateralToken).safeTransfer(recipient, loan.collateralAmount);
        loan.active = false;
        totalCollateralValue -= loan.collateralAmount;
    }
}