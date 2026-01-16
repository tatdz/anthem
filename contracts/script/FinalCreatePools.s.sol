// script/FinalCreatePools.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

// Simple interfaces
interface IPositionManager {
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
    function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable returns (int24);
}

struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPermit2 {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

contract FinalCreatePools is Script {
    // Arbitrum Sepolia addresses
    address constant POSITION_MANAGER = 0xAc631556d3d4019C95769033B5E719dD77124BAc;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address constant HOOK_ADDRESS = 0x5C087519b91F90C66F24Ff13Fd48F262427CcAC0;
    
    // Mock token addresses
    address constant MOCK_BTC = 0x525F87c067c669FCC037C86e493F137870Da37cf;
    address constant MOCK_ETH = 0xA210e112825a120B4aaB5F8fDD9dd700b0A5c3DE;
    address constant MOCK_USDC = 0xd0c9a47E83f5dD0F40671D621454c370fcf601Db;
    
    // Pool configuration
    uint24 constant LP_FEE = 3000; // 0.30%
    int24 constant TICK_SPACING = 60;
    
    // Starting prices
    uint160 constant BTC_USDC_START_PRICE = 20960188324000000000000;
    uint160 constant ETH_USDC_START_PRICE = 4691249611841530000000;

    function run() external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = vm.parseUint(privateKeyStr);
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deployer: %s", deployer);
        console.log("Creating pools...");
        
        // First pool: BTC/USDC
        console.log("\n=== Creating BTC/USDC Pool ===");
        bool btcSuccess = createPool(MOCK_BTC, MOCK_USDC, BTC_USDC_START_PRICE);
        
        // Second pool: ETH/USDC
        console.log("\n=== Creating ETH/USDC Pool ===");
        bool ethSuccess = createPool(MOCK_ETH, MOCK_USDC, ETH_USDC_START_PRICE);
        
        console.log("\n=== Summary ===");
        console.log("BTC/USDC pool creation: %s", btcSuccess ? "SUCCESS" : "FAILED");
        console.log("ETH/USDC pool creation: %s", ethSuccess ? "SUCCESS" : "FAILED");
        
        vm.stopBroadcast();
    }
    
    function createPool(address token0, address token1, uint160 startingPrice) internal returns (bool) {
        // Sort tokens
        (address currency0, address currency1) = token0 < token1 
            ? (token0, token1) 
            : (token1, token0);
        
        console.log("Currency0: %s", currency0);
        console.log("Currency1: %s", currency1);
        
        // Setup approvals
        setupApprovals(currency0);
        setupApprovals(currency1);
        
        // Create PoolKey
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: HOOK_ADDRESS
        });

        // Create pool using PositionManager
        IPositionManager positionManager = IPositionManager(POSITION_MANAGER);
        
        console.log("Initializing pool...");
        try positionManager.initializePool{value: 0}(poolKey, startingPrice) returns (int24 tick) {
            if (tick == type(int24).max) {
                console.log("Pool already exists!");
                return true;
            } else {
                console.log("Pool initialized successfully! Tick: %d", tick);
                return true;
            }
        } catch Error(string memory reason) {
            console.log("Failed: %s", reason);
            return false;
        } catch (bytes memory) {
            console.log("Failed with unknown error");
            return false;
        }
    }
    
    function setupApprovals(address token) internal {
        if (token == address(0)) return;
        
        IERC20 erc20 = IERC20(token);
        erc20.approve(PERMIT2, type(uint256).max);
        console.log("Approved token: %s", token);
        
        // Also set Permit2 approval
        IPermit2 permit2 = IPermit2(PERMIT2);
        permit2.approve(token, POSITION_MANAGER, type(uint160).max, type(uint48).max);
        console.log("Set Permit2 approval for token: %s", token);
    }
}