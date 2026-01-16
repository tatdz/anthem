// script/DeployCompleteSystem.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CoreWriterOracle} from "../src/CoreWriterOracle.sol";
import {V4SwapExecutor} from "../src/V4SwapExecutor.sol";

contract DeployCompleteSystem is Script {
    // Token addresses
    address constant MOCK_BTC = 0x525F87c067c669FCC037C86e493F137870Da37cf;
    address constant MOCK_ETH = 0xA210e112825a120B4aaB5F8fDD9dd700b0A5c3DE;
    address constant MOCK_USDC = 0xd0c9a47E83f5dD0F40671D621454c370fcf601Db;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying Complete Anthem System...");
        console.log("Deployer:", deployer);
        
        // Check token balances first
        console.log("\nChecking token balances...");
        uint256 btcBalance = IERC20(MOCK_BTC).balanceOf(deployer);
        uint256 ethBalance = IERC20(MOCK_ETH).balanceOf(deployer);
        uint256 usdcBalance = IERC20(MOCK_USDC).balanceOf(deployer);
        
        console.log("Deployer BTC balance:", btcBalance);
        console.log("Deployer ETH balance:", ethBalance);
        console.log("Deployer USDC balance:", usdcBalance);
        
        // 1. Deploy CoreWriterOracle
        console.log("\n1. Deploying CoreWriterOracle...");
        CoreWriterOracle oracle = new CoreWriterOracle(deployer);
        console.log("Oracle:", address(oracle));
        
        // 2. Deploy V4SwapExecutor
        console.log("\n2. Deploying V4SwapExecutor...");
        V4SwapExecutor swapExecutor = new V4SwapExecutor(deployer);
        console.log("SwapExecutor:", address(swapExecutor));
        
        // 3. Link contracts
        console.log("\n3. Linking contracts...");
        swapExecutor.setCoreWriterOracle(address(oracle));
        console.log(" Linked SwapExecutor -> Oracle");
        
        // 4. Fund SwapExecutor with tokens using direct transfers (not transferFrom)
        console.log("\n4. Funding SwapExecutor...");
        
        // Use the deployer's private key context to call transfer directly
        // This is equivalent to the deployer calling transfer() from their wallet
        
        // Transfer BTC if available (use raw call with delegatecall to simulate direct wallet transfer)
        uint256 btcAmount = 100_000_000; // 1 BTC in satoshis
        if (btcBalance >= btcAmount) {
            // Direct call to transfer function
            (bool btcSuccess, ) = MOCK_BTC.call(
                abi.encodeWithSignature("transfer(address,uint256)", address(swapExecutor), btcAmount)
            );
            require(btcSuccess, "BTC transfer failed");
            console.log("Transferred 1.0 BTC to SwapExecutor");
        } else {
            console.log("Skipping BTC transfer (insufficient balance)");
        }
        
        // Transfer ETH if available
        uint256 ethAmount = 10_000_000_000_000_000_000; // 10 ETH
        if (ethBalance >= ethAmount) {
            (bool ethSuccess, ) = MOCK_ETH.call(
                abi.encodeWithSignature("transfer(address,uint256)", address(swapExecutor), ethAmount)
            );
            require(ethSuccess, "ETH transfer failed");
            console.log("Transferred 10.0 ETH to SwapExecutor");
        } else {
            console.log("Skipping ETH transfer (insufficient balance)");
        }
        
        // Transfer USDC if available
        uint256 usdcAmount = 1000_000_000; // 1000 USDC
        if (usdcBalance >= usdcAmount) {
            (bool usdcSuccess, ) = MOCK_USDC.call(
                abi.encodeWithSignature("transfer(address,uint256)", address(swapExecutor), usdcAmount)
            );
            require(usdcSuccess, "USDC transfer failed");
            console.log("Transferred 1000 USDC to SwapExecutor");
        } else {
            console.log("Skipping USDC transfer (insufficient balance: %s, needed: %s)", usdcBalance, usdcAmount);
        }
        
        vm.stopBroadcast();
        
        // Print final status
        console.log("\n==================================================");
        console.log(" COMPLETE SYSTEM DEPLOYED!");
        console.log("==================================================");
        console.log("\nContract Addresses:");
        console.log("CoreWriterOracle:", address(oracle));
        console.log("V4SwapExecutor:  ", address(swapExecutor));
        
        // Check final balances in SwapExecutor
        uint256 finalBtc = IERC20(MOCK_BTC).balanceOf(address(swapExecutor));
        uint256 finalEth = IERC20(MOCK_ETH).balanceOf(address(swapExecutor));
        uint256 finalUsdc = IERC20(MOCK_USDC).balanceOf(address(swapExecutor));
        
        console.log("\nToken Balances in SwapExecutor:");
        console.log("BTC:  %s", formatBalance(finalBtc, 8));
        console.log("ETH:  %s", formatBalance(finalEth, 18));
        console.log("USDC: %s", formatBalance(finalUsdc, 6));
        
        console.log("\nTest Commands:");
        console.log("\n# Test BTC swap (sell 0.001 BTC for USDC):");
        console.log("cast send %s \\", address(swapExecutor));
        console.log("  \"executeRealBtcUsdcSwap(bool,uint256)\" \\");
        console.log("  true 100000 \\");
        console.log("  --rpc-url $ALCHEMY_ARBITRUM_TESTNET_URL \\");
        console.log("  --private-key $PRIVATE_KEY");
        
        console.log("\n# Check oracle priority score:");
        console.log("cast call %s \"priorityScore()\" --rpc-url $ALCHEMY_ARBITRUM_TESTNET_URL", address(oracle));
        
        console.log("\n# Check SwapExecutor balances:");
        console.log("cast call %s \"getBalances()\" --rpc-url $ALCHEMY_ARBITRUM_TESTNET_URL", address(swapExecutor));
    }
    
    // Helper function to format token balances
    function formatBalance(uint256 balance, uint8 decimals) internal view returns (string memory) {
        if (decimals == 18) {
            return string(abi.encodePacked(vm.toString(balance / 10**18), ".", vm.toString((balance % 10**18) / 10**16), " ETH"));
        } else if (decimals == 8) {
            return string(abi.encodePacked(vm.toString(balance / 10**8), ".", vm.toString((balance % 10**8) / 10**6), " BTC"));
        } else if (decimals == 6) {
            return string(abi.encodePacked(vm.toString(balance / 10**6), ".", vm.toString((balance % 10**6) / 10**4), " USDC"));
        }
        return vm.toString(balance);
    }
}