//src/AnthemSovereignALM.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISovereignALM.sol";
import "./SovereignPool.sol";

contract AnthemSovereignALM is ISovereignALM, Ownable {
    using SafeERC20 for IERC20;
    
    SovereignPool public immutable pool;
    address public immutable anthemVault;
    address public coreWriterOracle;
    
    struct VaultPosition {
        uint256 totalSenior;
        uint256 totalJunior;
        uint256 lpTokens;
        uint256 lastUpdated;
    }
    
    mapping(address => VaultPosition) public vaultPositions;
    
    event AnthemLiquidityProvided(address indexed vault, uint256 seniorAmount, uint256 juniorAmount, uint256 lpTokens);
    event AnthemLiquidityRemoved(address indexed vault, uint256 seniorAmount, uint256 juniorAmount);
    event CoreWriterOracleUpdated(address oracle);
    event LiquidityQuoteCalculated(bool isZeroToOne, uint256 amountIn, uint256 amountOut, uint256 priorityScore);
    
    error OnlyPool();
    error OnlyVault();
    
    modifier onlyPool() {
        if (msg.sender != address(pool)) revert OnlyPool();
        _;
    }
    
    modifier onlyVault() {
        if (msg.sender != anthemVault) revert OnlyVault();
        _;
    }
    
    constructor(
        address _pool,
        address _anthemVault,
        address _coreWriterOracle,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_pool != address(0), "Pool zero address");
        require(_anthemVault != address(0), "Vault zero address");
        
        pool = SovereignPool(_pool);
        anthemVault = _anthemVault;
        coreWriterOracle = _coreWriterOracle;
    }
    
    // ================== ANTHEM-SPECIFIC FUNCTIONS ==================
    
    function provideAnthemLiquidity(
        uint256 seniorAmount,
        uint256 juniorAmount,
        bytes calldata verificationContext
    ) external onlyVault returns (uint256 deposited0, uint256 deposited1) {
        require(seniorAmount > 0 && juniorAmount > 0, "Amounts must be > 0");
        
        IERC20 token0 = IERC20(pool.token0());
        IERC20 token1 = IERC20(pool.token1());
        
        token0.safeTransferFrom(anthemVault, address(this), seniorAmount);
        token1.safeTransferFrom(anthemVault, address(this), juniorAmount);
        
        // Use approve instead of safeApprove (safeApprove doesn't exist in SafeERC20)
        require(token0.approve(address(pool), seniorAmount), "Token0 approval failed");
        require(token1.approve(address(pool), juniorAmount), "Token1 approval failed");
        
        (deposited0, deposited1) = pool.depositLiquidity(
            seniorAmount,
            juniorAmount,
            anthemVault,
            verificationContext,
            abi.encode(anthemVault)
        );
        
        uint256 lpTokens = _calculateLPTokens(deposited0, deposited1);
        
        VaultPosition storage position = vaultPositions[anthemVault];
        position.totalSenior += deposited0;
        position.totalJunior += deposited1;
        position.lpTokens += lpTokens;
        position.lastUpdated = block.timestamp;
        
        emit AnthemLiquidityProvided(anthemVault, deposited0, deposited1, lpTokens);
    }
    
    function removeAnthemLiquidity(
        uint256 seniorAmount,
        uint256 juniorAmount,
        address recipient,
        bytes calldata verificationContext
    ) external onlyVault {
        require(seniorAmount > 0 && juniorAmount > 0, "Amounts must be > 0");
        
        pool.withdrawLiquidity(
            seniorAmount,
            juniorAmount,
            anthemVault,
            recipient,
            verificationContext
        );
        
        VaultPosition storage position = vaultPositions[anthemVault];
        position.totalSenior -= seniorAmount;
        position.totalJunior -= juniorAmount;
        
        uint256 totalSupply = pool.totalSupply();
        if (totalSupply > 0) {
            uint256 shareSenior = (seniorAmount * 1e18) / pool.reserve0();
            uint256 shareJunior = (juniorAmount * 1e18) / pool.reserve1();
            uint256 share = shareSenior < shareJunior ? shareSenior : shareJunior;
            position.lpTokens -= (position.lpTokens * share) / 1e18;
        }
        
        position.lastUpdated = block.timestamp;
        
        emit AnthemLiquidityRemoved(anthemVault, seniorAmount, juniorAmount);
    }
    
    function getDynamicAllocation(uint256 totalUsdc) external view returns (
        uint256 seniorAllocation,
        uint256 juniorAllocation,
        uint256 priorityScore
    ) {
        (bool success, bytes memory data) = coreWriterOracle.staticcall(
            abi.encodeWithSignature("getTrancheRatios()")
        );
        
        if (success && data.length >= 96) {
            (uint256 seniorBps, uint256 juniorBps, uint256 score) = abi.decode(data, (uint256, uint256, uint256));
            seniorAllocation = (totalUsdc * seniorBps) / 10000;
            juniorAllocation = totalUsdc - seniorAllocation;
            priorityScore = score;
        } else {
            seniorAllocation = (totalUsdc * 8500) / 10000;
            juniorAllocation = totalUsdc - seniorAllocation;
            priorityScore = 25;
        }
    }
    
    // ================== VALANTIS ISOVEREIGNALM INTERFACE ==================
    
    function getLiquidityQuote(
        ALMLiquidityQuoteInput memory input,
        bytes calldata externalContext,
        bytes calldata verifierData
    ) external override onlyPool returns (ALMLiquidityQuote memory) {
        (uint256 reserve0, uint256 reserve1,) = pool.getReserves();
        
        uint256 reserveIn = input.isZeroToOne ? reserve0 : reserve1;
        uint256 reserveOut = input.isZeroToOne ? reserve1 : reserve0;
        
        uint256 amountInWithFee = input.amountInMinusFee * 997 / 1000;
        uint256 amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
        
        uint256 priorityScore = 25;
        if (coreWriterOracle != address(0)) {
            (bool success, bytes memory data) = coreWriterOracle.staticcall(
                abi.encodeWithSignature("priorityScore()")
            );
            if (success && data.length >= 32) {
                priorityScore = abi.decode(data, (uint256));
                
                if (priorityScore > 75) {
                    amountOut = amountOut * 98 / 100;
                } else if (priorityScore > 50) {
                    amountOut = amountOut * 99 / 100;
                }
            }
        }
        
        emit LiquidityQuoteCalculated(input.isZeroToOne, input.amountInMinusFee, amountOut, priorityScore);
        
        return ALMLiquidityQuote({
            isCallbackOnSwap: false,
            amountOut: amountOut,
            amountInFilled: input.amountInMinusFee
        });
    }
    
    function onDepositLiquidityCallback(
        uint256 amount0,
        uint256 amount1,
        bytes memory data
    ) external override onlyPool {
        address vault = abi.decode(data, (address));
        require(vault == anthemVault, "Invalid vault");
        
        IERC20 token0 = IERC20(pool.token0());
        IERC20 token1 = IERC20(pool.token1());
        
        require(token0.balanceOf(address(this)) >= amount0, "Insufficient token0");
        require(token1.balanceOf(address(this)) >= amount1, "Insufficient token1");
        
        if (amount0 > 0) {
            require(token0.transfer(address(pool), amount0), "Token0 transfer failed");
        }
        if (amount1 > 0) {
            require(token1.transfer(address(pool), amount1), "Token1 transfer failed");
        }
    }
    
    function onSwapCallback(bool isZeroToOne, uint256 amountIn, uint256 amountOut) external override onlyPool {
        // Track swap activity
        // No action needed for basic implementation
    }
    
    // ================== HELPER FUNCTIONS ==================
    
    function _calculateLPTokens(uint256 amount0, uint256 amount1) internal view returns (uint256) {
        uint256 totalSupply = pool.totalSupply();
        (uint256 reserve0, uint256 reserve1,) = pool.getReserves();
        
        if (totalSupply == 0) {
            return sqrt(amount0 * amount1);
        }
        
        uint256 liquidity0 = (amount0 * totalSupply) / reserve0;
        uint256 liquidity1 = (amount1 * totalSupply) / reserve1;
        return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    }
    
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    // ================== ADMIN FUNCTIONS ==================
    
    function setCoreWriterOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Oracle zero address");
        coreWriterOracle = _oracle;
        emit CoreWriterOracleUpdated(_oracle);
    }
    
    function getVaultPosition(address vault) external view returns (
        uint256 totalSenior,
        uint256 totalJunior,
        uint256 lpTokens,
        uint256 lastUpdated
    ) {
        VaultPosition memory position = vaultPositions[vault];
        return (position.totalSenior, position.totalJunior, position.lpTokens, position.lastUpdated);
    }
    
    function getPoolReserves() external view returns (uint256, uint256) {
        (uint256 reserve0, uint256 reserve1,) = pool.getReserves();
        return (reserve0, reserve1);
    }
    
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}