// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ISovereignALM {
    struct ALMLiquidityQuoteInput {
        bool isZeroToOne;
        uint256 amountInMinusFee;
        uint256 feeInBips;
        address sender;
        address recipient;
        address tokenOutSwap;
    }
    
    struct ALMLiquidityQuote {
        bool isCallbackOnSwap;
        uint256 amountOut;
        uint256 amountInFilled;
    }
    
    function getLiquidityQuote(
        ALMLiquidityQuoteInput memory input,
        bytes calldata externalContext,
        bytes calldata verifierData
    ) external returns (ALMLiquidityQuote memory);
    
    function onDepositLiquidityCallback(uint256 amount0, uint256 amount1, bytes memory data) external;
    function onSwapCallback(bool isZeroToOne, uint256 amountIn, uint256 amountOut) external;
}