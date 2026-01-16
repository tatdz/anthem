// contracts/src/CompleteHook.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "lib/v4-periphery/src/utils/BaseHook.sol";

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";

contract CompleteHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    // Counters for tracking
    mapping(PoolId => uint256) public beforeAddLiquidityCount;
    mapping(PoolId => uint256) public beforeRemoveLiquidityCount;
    mapping(PoolId => uint256) public beforeSwapCount;
    mapping(PoolId => uint256) public afterSwapCount;

    // Events for tracking
    event BeforeAddLiquidity(
        PoolId indexed poolId,
        address indexed sender,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        bytes32 salt
    );
    
    event BeforeRemoveLiquidity(
        PoolId indexed poolId,
        address indexed sender,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        bytes32 salt
    );
    
    event BeforeSwap(
        PoolId indexed poolId,
        address indexed sender,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    );
    
    event AfterSwap(
        PoolId indexed poolId,
        address indexed sender,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        BalanceDelta delta
    );

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ---------- LIQUIDITY HOOKS ----------
    function _beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        PoolId poolId = key.toId();
        beforeAddLiquidityCount[poolId]++;
        
        emit BeforeAddLiquidity(
            poolId,
            sender,
            params.tickLower,
            params.tickUpper,
            params.liquidityDelta,
            params.salt
        );
        
        // Optional validation
        require(params.liquidityDelta > 0, "Only adding liquidity allowed");
        
        return this.beforeAddLiquidity.selector;
    }

    function _beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        PoolId poolId = key.toId();
        beforeRemoveLiquidityCount[poolId]++;
        
        emit BeforeRemoveLiquidity(
            poolId,
            sender,
            params.tickLower,
            params.tickUpper,
            params.liquidityDelta,
            params.salt
        );
        
        // Optional validation
        require(params.liquidityDelta < 0, "Only removing liquidity allowed");
        
        return this.beforeRemoveLiquidity.selector;
    }

    // ---------- SWAP HOOKS ----------
    // Fixed: Use SwapParams (not IPoolManager.SwapParams)
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        beforeSwapCount[poolId]++;
        
        emit BeforeSwap(
            poolId,
            sender,
            params.zeroForOne,
            params.amountSpecified,
            params.sqrtPriceLimitX96
        );
        
        // Return the selector to allow the operation
        // Zero delta = no change to swap amounts
        // Zero = no change to fee
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        afterSwapCount[poolId]++;
        
        emit AfterSwap(
            poolId,
            sender,
            params.zeroForOne,
            params.amountSpecified,
            params.sqrtPriceLimitX96,
            delta
        );
        
        // Return the selector and zero delta
        return (BaseHook.afterSwap.selector, 0);
    }
}