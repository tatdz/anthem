// src/V4SwapExecutor.sol 
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPoolSwapTest {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }
    
    struct TestSettings {
        bool takeClaims;
        bool settleUsingBurn;
    }
    
    function swap(
        PoolKey calldata key,
        SwapParams calldata params,
        TestSettings calldata testSettings,
        bytes calldata hookData
    ) external payable returns (int256 delta);
}

contract V4SwapExecutor is Ownable {
    IPoolSwapTest public constant POOL_SWAP_TEST = IPoolSwapTest(0xf3A39C86dbd13C45365E57FB90fe413371F65AF8);
    
    address public constant MOCK_BTC = 0x525F87c067c669FCC037C86e493F137870Da37cf;
    address public constant MOCK_ETH = 0xA210e112825a120B4aaB5F8fDD9dd700b0A5c3DE;
    address public constant MOCK_USDC = 0xd0c9a47E83f5dD0F40671D621454c370fcf601Db;
    
    address public coreWriterOracle;
    
    event RealSwapExecuted(
        bytes32 indexed poolId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        int256 delta,
        bool success,
        uint256 timestamp
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _approveTokens();
    }
    
    /**
     * @notice Execute REAL swap in BTC/USDC pool
     */
    function executeRealBtcUsdcSwap(
        bool zeroForOne,
        uint256 amountIn // in token decimals (satoshis for BTC)
    ) external onlyOwner returns (bool) {
        // Prepare PoolKey
        IPoolSwapTest.PoolKey memory poolKey = IPoolSwapTest.PoolKey({
            currency0: MOCK_BTC,
            currency1: MOCK_USDC,
            fee: 3000,
            tickSpacing: 60,
            hooks: address(0)
        });
        
        // Prepare SwapParams
        IPoolSwapTest.SwapParams memory swapParams = IPoolSwapTest.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn), // Negative for exact input
            sqrtPriceLimitX96: zeroForOne ? 
                uint160(4295128741) : // MIN_SQRT_PRICE + 1 for BTC → USDC
                uint160(1461446703485210103287273052203988822378723970341) // MAX_SQRT_PRICE - 1
        });
        
        // Prepare TestSettings
        IPoolSwapTest.TestSettings memory testSettings = IPoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        // Check balance
        address tokenIn = zeroForOne ? MOCK_BTC : MOCK_USDC;
        require(IERC20(tokenIn).balanceOf(address(this)) >= amountIn, "Insufficient balance");
        
        // Execute swap
        try POOL_SWAP_TEST.swap(poolKey, swapParams, testSettings, "") returns (int256 delta) {
            bytes32 poolId = keccak256(abi.encode(poolKey));
            
            emit RealSwapExecuted(
                poolId,
                tokenIn,
                zeroForOne ? MOCK_USDC : MOCK_BTC,
                amountIn,
                delta,
                true,
                block.timestamp
            );
            
            // Update oracle
            _updateOracle(poolId, amountIn, delta > 0, false);
            
            return true;
        } catch {
            bytes32 poolId = keccak256(abi.encode(poolKey));
            address tokenOut = zeroForOne ? MOCK_USDC : MOCK_BTC;
            
            emit RealSwapExecuted(
                poolId,
                tokenIn,
                tokenOut,
                amountIn,
                0,
                false,
                block.timestamp
            );
            return false;
        }
    }
    
    /**
     * @notice Execute REAL swap in ETH/USDC pool
     */
    function executeRealEthUsdcSwap(
        bool zeroForOne,
        uint256 amountIn // in token decimals (wei for ETH)
    ) external onlyOwner returns (bool) {
        IPoolSwapTest.PoolKey memory poolKey = IPoolSwapTest.PoolKey({
            currency0: MOCK_ETH,
            currency1: MOCK_USDC,
            fee: 3000,
            tickSpacing: 60,
            hooks: address(0)
        });
        
        IPoolSwapTest.SwapParams memory swapParams = IPoolSwapTest.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: zeroForOne ? 
                uint160(4295128741) : 
                uint160(1461446703485210103287273052203988822378723970341)
        });
        
        IPoolSwapTest.TestSettings memory testSettings = IPoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        address tokenIn = zeroForOne ? MOCK_ETH : MOCK_USDC;
        require(IERC20(tokenIn).balanceOf(address(this)) >= amountIn, "Insufficient balance");
        
        try POOL_SWAP_TEST.swap(poolKey, swapParams, testSettings, "") returns (int256 delta) {
            bytes32 poolId = keccak256(abi.encode(poolKey));
            
            emit RealSwapExecuted(
                poolId,
                tokenIn,
                zeroForOne ? MOCK_USDC : MOCK_ETH,
                amountIn,
                delta,
                true,
                block.timestamp
            );
            
            _updateOracle(poolId, amountIn, delta > 0, false);
            
            return true;
        } catch {
            bytes32 poolId = keccak256(abi.encode(poolKey));
            address tokenOut = zeroForOne ? MOCK_USDC : MOCK_ETH;
            
            emit RealSwapExecuted(
                poolId,
                tokenIn,
                tokenOut,
                amountIn,
                0,
                false,
                block.timestamp
            );
            return false;
        }
    }
    
    /**
     * @notice Direct call with raw calldata (for debugging)
     */
    function executeWithCalldata(bytes calldata data) external onlyOwner returns (bool) {
        (bool success, ) = address(POOL_SWAP_TEST).call(data);
        return success;
    }
    
    /**
     * @notice Get the exact calldata for a swap
     */
    function getSwapCalldata(
        bool useBtcPool,
        bool zeroForOne,
        uint256 amountIn
    ) external pure returns (bytes memory) {
        address currency0 = useBtcPool ? MOCK_BTC : MOCK_ETH;
        
        IPoolSwapTest.PoolKey memory poolKey = IPoolSwapTest.PoolKey({
            currency0: currency0,
            currency1: MOCK_USDC,
            fee: 3000,
            tickSpacing: 60,
            hooks: address(0)
        });
        
        IPoolSwapTest.SwapParams memory swapParams = IPoolSwapTest.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: zeroForOne ? 
                uint160(4295128741) : 
                uint160(1461446703485210103287273052203988822378723970341)
        });
        
        IPoolSwapTest.TestSettings memory testSettings = IPoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        return abi.encodeCall(
            POOL_SWAP_TEST.swap,
            (poolKey, swapParams, testSettings, "")
        );
    }
    
    function setCoreWriterOracle(address oracle) external onlyOwner {
        coreWriterOracle = oracle;
    }
    
    function getBalances() external view returns (
        uint256 btcBalance,
        uint256 ethBalance,
        uint256 usdcBalance
    ) {
        btcBalance = IERC20(MOCK_BTC).balanceOf(address(this));
        ethBalance = IERC20(MOCK_ETH).balanceOf(address(this));
        usdcBalance = IERC20(MOCK_USDC).balanceOf(address(this));
    }
    
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    // Internal functions
    
    function _updateOracle(
        bytes32 poolId,
        uint256 volume,
        bool isProfitable,
        bool isStress
    ) internal {
        if (coreWriterOracle == address(0)) return;
        
        // Calculate tick change: positive if profitable, negative if stress
        int24 tickChange = isStress ? 
            -int24(int256(volume / 10**14)) : 
            (isProfitable ? int24(int256(volume / 10**16)) : -int24(int256(volume / 10**16)));
        
        coreWriterOracle.call(
            abi.encodeWithSignature(
                "reportV4Swap(bytes32,uint256,int24,bool)",
                poolId,
                volume,
                tickChange,
                isStress
            )
        );
    }
    
    function _approveTokens() internal {
        uint256 maxAmount = type(uint256).max;
        IERC20(MOCK_BTC).approve(address(POOL_SWAP_TEST), maxAmount);
        IERC20(MOCK_ETH).approve(address(POOL_SWAP_TEST), maxAmount);
        IERC20(MOCK_USDC).approve(address(POOL_SWAP_TEST), maxAmount);
    }
}