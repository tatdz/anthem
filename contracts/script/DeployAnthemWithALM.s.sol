// script/DeployAnthemWithALM.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AnthemSenior} from "../src/AnthemSenior.sol";
import {AnthemJunior} from "../src/AnthemJunior.sol";
import {SovereignPool} from "../src/SovereignPool.sol";
import {AnthemVault} from "../src/AnthemVault.sol";
import {AnthemSovereignALM} from "../src/AnthemSovereignALM.sol";
import {AnthemLendingModule} from "../src/AnthemLendingModule.sol";
import {MockL1Read} from "../src/MockL1Read.sol";
import {MockCoreWriter} from "../src/MockCoreWriter.sol";

contract DeployAnthemWithALM is Script {
    // UI mock token addresses (from existing deployment)
    address constant UI_MOCK_USDC = 0x164D636e9c513472E310a17c55B6C78994bF5307;
    
    function run() external returns (
        address senior,
        address junior,
        address pool,
        address vault,
        address lendingModule,
        address alm,
        address mockL1Read,
        address mockCoreWriter
    ) {
        // Read existing oracle from environment
        string memory oracleAddressStr = vm.envString("NEXT_PUBLIC_COREWRITER_ORACLE");
        address oracle = vm.parseAddress(oracleAddressStr);
        require(oracle != address(0), "Oracle address not set in .env");
        console.log("Using existing CoreWriterOracle:", oracle);
        
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        console.log("Deployer address:", deployer);
        
        vm.startBroadcast(deployer);
        
        // ================== 1. DEPLOY MOCK CONTRACTS ==================
        console.log("\n1. Deploying MockL1Read...");
        MockL1Read mockL1ReadContract = new MockL1Read();
        mockL1Read = address(mockL1ReadContract);
        console.log("   MockL1Read:", mockL1Read);
        
        console.log("\n2. Deploying MockCoreWriter...");
        MockCoreWriter mockCoreWriterContract = new MockCoreWriter();
        mockCoreWriter = address(mockCoreWriterContract);
        console.log("   MockCoreWriter:", mockCoreWriter);
        
        // ================== 2. DEPLOY ANTHEM TOKENS ==================
        console.log("\n3. Deploying AnthemSenior...");
        AnthemSenior seniorContract = new AnthemSenior(IERC20(UI_MOCK_USDC));
        senior = address(seniorContract);
        console.log("   AnthemSenior:", senior);
        
        console.log("\n4. Deploying AnthemJunior...");
        AnthemJunior juniorContract = new AnthemJunior(
            address(0), // vault - will be set later
            UI_MOCK_USDC,
            deployer  // initial owner
        );
        junior = address(juniorContract);
        console.log("   AnthemJunior:", junior);
        
        // ================== 3. DEPLOY SOVEREIGN POOL ==================
        console.log("\n5. Deploying SovereignPool...");
        SovereignPool poolContract = new SovereignPool(
            IERC20(senior),
            IERC20(junior)
        );
        pool = address(poolContract);
        console.log("   SovereignPool:", pool);
        
        // ================== 4. DEPLOY ANTHEM VAULT ==================
        console.log("\n6. Deploying AnthemVault...");
        AnthemVault vaultContract = new AnthemVault(
            IERC20(UI_MOCK_USDC),
            senior,
            junior,
            pool,
            oracle
        );
        vault = address(vaultContract);
        console.log("   AnthemVault:", vault);
        
        // ================== 5. DEPLOY ANTHEM SOVEREIGN ALM ==================
        console.log("\n7. Deploying AnthemSovereignALM...");
        AnthemSovereignALM almContract = new AnthemSovereignALM(
            pool,
            vault,
            oracle,
            deployer
        );
        alm = address(almContract);
        console.log("   AnthemSovereignALM:", alm);
        
        // ================== 6. DEPLOY ANTHEM LENDING MODULE ==================
        console.log("\n8. Deploying AnthemLendingModule...");
        AnthemLendingModule lendingModuleContract = new AnthemLendingModule(
            UI_MOCK_USDC,
            senior,
            junior,
            oracle
        );
        lendingModule = address(lendingModuleContract);
        console.log("   AnthemLendingModule:", lendingModule);
        
        vm.stopBroadcast();
        
        // ================== 7. POST-DEPLOY CONFIGURATION ==================
        console.log("\n9. Starting post-deploy configuration...");
        
        // Configure contracts
        configureContracts(
            senior, junior, pool, vault, lendingModule, alm,
            oracle, deployer
        );
        
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("AnthemSenior:", senior);
        console.log("AnthemJunior:", junior);
        console.log("SovereignPool:", pool);
        console.log("AnthemVault:", vault);
        console.log("AnthemSovereignALM:", alm);
        console.log("AnthemLendingModule:", lendingModule);
        console.log("MockL1Read:", mockL1Read);
        console.log("MockCoreWriter:", mockCoreWriter);
        console.log("Oracle:", oracle);
        console.log("\nNote: ALM is deployed but NOT integrated into Vault");
        console.log("Users can use ALM separately if needed");
        
        return (senior, junior, pool, vault, lendingModule, alm, mockL1Read, mockCoreWriter);
    }
    
    function configureContracts(
        address senior,
        address junior,
        address pool,
        address vault,
        address lendingModule,
        address alm,
        address oracle,
        address configDeployer
    ) internal {
        console.log("\n--- Configuration Phase ---");
        
        vm.startBroadcast(configDeployer);
        
        // 1. Set vault in tokens
        console.log("1. Setting vault in AnthemJunior...");
        AnthemJunior juniorContract = AnthemJunior(junior);
        juniorContract.setVault(vault);
        
        // 2. Set oracle in AnthemJunior
        console.log("2. Setting oracle in AnthemJunior...");
        juniorContract.setCoreWriterOracle(oracle);
        
        // 3. Set vault ownership for tokens
        console.log("3. Transferring token ownership to vault...");
        AnthemSenior seniorContract = AnthemSenior(senior);
        seniorContract.transferOwnership(vault);
        juniorContract.transferOwnership(vault);
        
        // 4. Set ALM in SovereignPool (Pool still needs to know about ALM)
        console.log("4. Setting ALM in SovereignPool...");
        SovereignPool poolContract = SovereignPool(pool);
        poolContract.setALM(alm);
        
        // 5. NO LONGER setting ALM in AnthemVault (since we removed it)
        // The vault will work independently
        
        // 6. Transfer lending module ownership to vault
        console.log("5. Transferring lending module ownership...");
        AnthemLendingModule lendingModuleContract = AnthemLendingModule(lendingModule);
        lendingModuleContract.transferOwnership(vault);
        
        // 7. Fund lending module with initial USDC
        console.log("6. Funding lending module with 50,000 USDC...");
        ERC20 usdcToken = ERC20(UI_MOCK_USDC);
        uint256 lendingFunding = 50_000 * 1e6;
        
        // Check deployer balance
        uint256 deployerBalance = usdcToken.balanceOf(configDeployer);
        console.log("   Deployer USDC balance:", deployerBalance / 1e6);
        require(deployerBalance >= lendingFunding, "Deployer needs at least 50,000 USDC");
        
        // Approve and deposit
        require(usdcToken.approve(lendingModule, lendingFunding), "Approve failed");
        lendingModuleContract.deposit(lendingFunding);
        
        vm.stopBroadcast();
        
        console.log("All configurations completed!");
    }
}