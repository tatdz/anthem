// script/AddLiquidityFinal.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";

// Import proper types
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";

contract AddLiquidityFinal is Script {
    // Arbitrum Sepolia addresses
    address constant POSITION_MANAGER = 0xAc631556d3d4019C95769033B5E719dD77124BAc;
    address constant HOOK_ADDRESS = 0x5C087519b91F90C66F24Ff13Fd48F262427CcAC0;
    
    // Mock token addresses
    address constant MOCK_BTC = 0x525F87c067c669FCC037C86e493F137870Da37cf;
    address constant MOCK_ETH = 0xA210e112825a120B4aaB5F8fDD9dd700b0A5c3DE;
    address constant MOCK_USDC = 0xd0c9a47E83f5dD0F40671D621454c370fcf601Db;
    
    // Pool configuration
    uint24 constant LP_FEE = 3000;
    int24 constant TICK_SPACING = 60;
    
    // Based on the trace: Actual pool ticks
    int24 constant BTC_USDC_TICK = -302920;
    int24 constant ETH_USDC_TICK = -332860;

    function run() external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = vm.parseUint(privateKeyStr);
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Add liquidity to BTC/USDC pool
        addLiquidityToPool(
            MOCK_BTC,
            MOCK_USDC,
            BTC_USDC_TICK,
            deployer,
            uint128(200_000_000),  // BTC max amount
            uint128(100)           // USDC max amount
        );
        
        // Add liquidity to ETH/USDC pool
        addLiquidityToPool(
            MOCK_ETH,
            MOCK_USDC,
            ETH_USDC_TICK,
            deployer,
            uint128(600_000_000),  // ETH max amount
            uint128(100)           // USDC max amount
        );
        
        vm.stopBroadcast();
    }
    
    function addLiquidityToPool(
        address token0,
        address token1,
        int24 currentTick,
        address recipient,
        uint128 amount0Max,
        uint128 amount1Max
    ) internal {
        // Sort tokens
        (address currency0Addr, address currency1Addr) = token0 < token1 
            ? (token0, token1) 
            : (token1, token0);
        
        // Convert to Currency type
        Currency currency0 = Currency.wrap(currency0Addr);
        Currency currency1 = Currency.wrap(currency1Addr);
        
        // Create PoolKey with correct types
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK_ADDRESS)
        });
        
        // Calculate tick range AROUND the actual current tick
        int24 tickLower = truncateTickSpacing(currentTick - 10 * TICK_SPACING, TICK_SPACING);
        int24 tickUpper = truncateTickSpacing(currentTick + 10 * TICK_SPACING, TICK_SPACING);
        
        // Small liquidity amount for testing
        uint256 liquidity = 1000;
        
        // Create mint parameters using v4-periphery pattern
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION), 
            uint8(Actions.SETTLE_PAIR), 
            uint8(Actions.SWEEP), 
            uint8(Actions.SWEEP)
        );

        bytes[] memory params = new bytes[](4);
        params[0] = abi.encode(
            poolKey, 
            tickLower, 
            tickUpper, 
            liquidity, 
            amount0Max, 
            amount1Max, 
            recipient, 
            new bytes(0)
        );
        params[1] = abi.encode(currency0, currency1);
        params[2] = abi.encode(currency0, recipient);
        params[3] = abi.encode(currency1, recipient);
        
        // Call PositionManager
        IPositionManager positionManager = IPositionManager(POSITION_MANAGER);
        
        positionManager.modifyLiquidities{value: 0}(
            abi.encode(actions, params),
            block.timestamp + 3600
        );
    }
    
    function truncateTickSpacing(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        return ((tick / tickSpacing) * tickSpacing);
    }
}