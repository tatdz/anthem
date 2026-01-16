//AnthemVault.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./AnthemSenior.sol";
import "./AnthemJunior.sol";
import "./SovereignPool.sol";

contract AnthemVault is Ownable {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable usdc;
    AnthemSenior public immutable senior;
    AnthemJunior public immutable junior;
    SovereignPool public immutable pool;
    address public immutable oracle;
    
    uint256 public totalDeposited;
    uint256 public totalLPTokens;
    
    uint256 public constant MAX_DEPOSIT_AMOUNT = 100_000 * 1e6;
    
    struct UserPosition {
        uint256 totalDeposited;
        uint256 lpTokens;
        uint256 lastUpdated;
    }
    
    mapping(address => UserPosition) public userPositions;
    
    event Deposit(address indexed user, uint256 usdcAmount, uint256 lpTokens);
    event Withdraw(address indexed user, uint256 usdcAmount, uint256 lpTokensBurned);
    event TrancheRatioUpdated(uint256 seniorBps, uint256 juniorBps, uint256 priorityScore);
    
    constructor(
        IERC20 _usdc,
        address _senior,
        address _junior,
        address _pool,
        address _oracle
    ) Ownable(msg.sender) {
        require(address(_usdc) != address(0), "USDC zero address");
        require(_senior != address(0), "Senior zero address");
        require(_junior != address(0), "Junior zero address");
        require(_pool != address(0), "Pool zero address");
        require(_oracle != address(0), "Oracle zero address");
        
        usdc = _usdc;
        senior = AnthemSenior(_senior);
        junior = AnthemJunior(_junior);
        pool = SovereignPool(_pool);
        oracle = _oracle;
    }
    
    // ================== MAIN DEPOSIT ==================
    
    function deposit(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Must deposit > 0 USDC");
        require(usdcAmount <= MAX_DEPOSIT_AMOUNT, "Max 100,000 USDC per deposit");
        
        // Transfer USDC from user to vault
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        totalDeposited += usdcAmount;
        
        // Get allocation ratios from oracle
        (uint256 seniorBps, uint256 juniorBps, uint256 priorityScore) = _getOracleRatios();
        
        // Calculate tranche amounts
        uint256 seniorAmount = (usdcAmount * seniorBps) / 10000;
        uint256 juniorAmount = usdcAmount - seniorAmount;
        
        // Mint tokens to VAULT
        uint256 seniorShares = _mintSenior(seniorAmount);
        uint256 juniorShares = _mintJunior(juniorAmount);
        
        // Provide liquidity to pool with vault's tokens
        uint256 lpTokens = _provideLiquidityToPool(seniorShares, juniorShares);
        
        // Mint LP tokens to user (representing their share of pool liquidity)
        if (lpTokens > 0) {
            userPositions[msg.sender].lpTokens += lpTokens;
            totalLPTokens += lpTokens;
            
            // Transfer LP tokens to user
            require(pool.transfer(msg.sender, lpTokens), "LP token transfer failed");
        }
        
        // Update user position
        UserPosition storage position = userPositions[msg.sender];
        position.totalDeposited += usdcAmount;
        position.lastUpdated = block.timestamp;
        
        emit Deposit(msg.sender, usdcAmount, lpTokens);
        emit TrancheRatioUpdated(seniorBps, juniorBps, priorityScore);
    }
    
    // ================== INTERNAL FUNCTIONS ==================
    
    function _mintSenior(uint256 seniorAmount) internal returns (uint256 shares) {
        if (seniorAmount == 0) return 0;
        
        // Approve and deposit to senior tranche (mints to vault)
        usdc.approve(address(senior), seniorAmount);
        shares = senior.deposit(seniorAmount, address(this));
        usdc.approve(address(senior), 0);
        
        return shares;
    }
    
    function _mintJunior(uint256 juniorAmount) internal returns (uint256 shares) {
        if (juniorAmount == 0) return 0;
        
        // Approve and deposit to junior tranche (mints to vault)
        usdc.approve(address(junior), juniorAmount);
        shares = junior.depositFor(juniorAmount, address(this));
        usdc.approve(address(junior), 0);
        
        return shares;
    }
    
    function _provideLiquidityToPool(
        uint256 seniorShares,
        uint256 juniorShares
    ) internal returns (uint256 lpTokens) {
        if (seniorShares == 0 || juniorShares == 0) return 0;
        
        // FIXED: Transfer tokens to pool first, then call mint
        senior.transfer(address(pool), seniorShares);
        junior.transfer(address(pool), juniorShares);
        
        // Call pool's mint function
        (bool success, bytes memory data) = address(pool).call(
            abi.encodeWithSignature("mint(address)", address(this))
        );
        
        require(success, "Pool mint failed");
        
        if (data.length >= 32) {
            lpTokens = abi.decode(data, (uint256));
        }
        
        return lpTokens;
    }
    
    // ================== WITHDRAW ==================
    
    function withdraw(uint256 lpTokenAmount) external {
        require(lpTokenAmount > 0, "Must withdraw > 0 LP tokens");
        
        UserPosition storage position = userPositions[msg.sender];
        require(position.lpTokens >= lpTokenAmount, "Insufficient LP tokens");
        
        // Transfer LP tokens from user to vault
        pool.transferFrom(msg.sender, address(this), lpTokenAmount);
        
        // Burn LP tokens to get back sANTHEM and jANTHEM
        (uint256 amount0, uint256 amount1) = pool.burn(address(this));
        
        // Convert tokens back to USDC (optional - for now just transfer tokens)
        // For simplicity, just transfer the tokens to user
        if (amount0 > 0) {
            senior.transfer(msg.sender, amount0);
        }
        
        if (amount1 > 0) {
            junior.transfer(msg.sender, amount1);
        }
        
        position.lpTokens -= lpTokenAmount;
        totalLPTokens -= lpTokenAmount;
        
        emit Withdraw(msg.sender, 0, lpTokenAmount);
    }
    
    // ================== ORACLE FUNCTIONS ==================
    
    function _getOracleRatios() internal view returns (uint256, uint256, uint256) {
        (bool success, bytes memory data) = oracle.staticcall(
            abi.encodeWithSignature("getTrancheRatios()")
        );
        require(success, "Oracle call failed");
        return abi.decode(data, (uint256, uint256, uint256));
    }
    
    // ================== ADMIN FUNCTIONS ==================
    
    // Initialize pool with existing tokens (for testing/fixing)
    function initializePoolWithExistingTokens() external onlyOwner returns (uint256 lpTokens) {
        uint256 seniorBalance = senior.balanceOf(address(this));
        uint256 juniorBalance = junior.balanceOf(address(this));
        
        require(seniorBalance > 0 && juniorBalance > 0, "No tokens in vault");
        
        // Provide liquidity with existing tokens
        lpTokens = _provideLiquidityToPool(seniorBalance, juniorBalance);
        
        // Mint initial LP tokens to owner
        if (lpTokens > 0) {
            require(pool.transfer(owner(), lpTokens), "LP token transfer failed");
        }
        
        return lpTokens;
    }
    
    // Manual liquidity provision (for testing)
    function manualAddLiquidity(
        uint256 seniorAmount,
        uint256 juniorAmount
    ) external onlyOwner returns (uint256 lpTokens) {
        require(seniorAmount > 0 && juniorAmount > 0, "Amounts must be > 0");
        
        // Transfer tokens from owner to vault
        senior.transferFrom(msg.sender, address(this), seniorAmount);
        junior.transferFrom(msg.sender, address(this), juniorAmount);
        
        // Provide liquidity
        lpTokens = _provideLiquidityToPool(seniorAmount, juniorAmount);
        
        // Transfer LP tokens to owner
        if (lpTokens > 0) {
            require(pool.transfer(msg.sender, lpTokens), "LP token transfer failed");
        }
        
        return lpTokens;
    }
    
    // Emergency: Owner can recover stuck funds
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    // ================== VIEW FUNCTIONS ==================
    
    function getVaultOverview() external view returns (
        uint256 totalUSDC,
        uint256 totalLPTokens_,
        uint256 seniorRatioBps,
        uint256 juniorRatioBps,
        uint256 priorityScore,
        bool poolInitialized
    ) {
        totalUSDC = totalDeposited;
        totalLPTokens_ = totalLPTokens;
        (seniorRatioBps, juniorRatioBps, priorityScore) = _getOracleRatios();
        poolInitialized = pool.totalSupply() > 0;
    }
    
    function getUserPosition(address user) external view returns (
        uint256 totalDeposited_,
        uint256 lpTokens_,
        uint256 lastUpdated_
    ) {
        UserPosition memory position = userPositions[user];
        return (
            position.totalDeposited,
            position.lpTokens,
            position.lastUpdated
        );
    }
    
    function calculateAllocation(uint256 depositAmount) external view returns (
        uint256 seniorAmount,
        uint256 juniorAmount,
        uint256 seniorBps,
        uint256 juniorBps,
        uint256 priorityScore_
    ) {
        (seniorBps, juniorBps, priorityScore_) = _getOracleRatios();
        seniorAmount = (depositAmount * seniorBps) / 10000;
        juniorAmount = depositAmount - seniorAmount;
    }
    
    // Get token balances in vault (for debugging)
    function getVaultTokenBalances() external view returns (
        uint256 usdcBalance,
        uint256 seniorBalance,
        uint256 juniorBalance,
        uint256 lpBalance
    ) {
        usdcBalance = usdc.balanceOf(address(this));
        seniorBalance = senior.balanceOf(address(this));
        juniorBalance = junior.balanceOf(address(this));
        lpBalance = pool.balanceOf(address(this));
    }
}