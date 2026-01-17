// frontend/scripts/swap-automation.js
const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

const RPC_URL = process.env.ALCHEMY_ARBITRUM_TESTNET_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const SWAP_EXECUTOR = process.env.NEXT_PUBLIC_V4_SWAP_EXECUTOR;
const CORE_WRITER_ORACLE = process.env.NEXT_PUBLIC_COREWRITER_ORACLE;

// Arbiscan testnet URL
const ARBISCAN_TESTNET_BASE = 'https://sepolia.arbiscan.io/tx';

// Token decimals
const BTC_DECIMALS = 8; // 1 BTC = 100,000,000 satoshis
const ETH_DECIMALS = 18; // 1 ETH = 1e18 wei
const USDC_DECIMALS = 6; // 1 USDC = 1e6

// ✅ FIXED: Correct Pool IDs from CoreWriterOracle contract (must match frontend)
const POOL_IDS = {
    BTC_USDC: '0x1dd8c051c7fc03e6d22c98be140f43f7443f7553826817cda2115ace5ae1b3aa',
    ETH_USDC: '0x3b7a8b2f53613e34d3c8df21673da84ab403788442e775f4103afa8018c99546'
};

// ABI for contracts
const SWAP_EXECUTOR_ABI = [
    "function executeRealBtcUsdcSwap(bool,uint256) returns (bool)",
    "function executeRealEthUsdcSwap(bool,uint256) returns (bool)",
    "function getBalances() view returns (uint256,uint256,uint256)"
];

const CORE_WRITER_ABI = [
    "function priorityScore() view returns (uint256)",
    "function getTrancheRatios() view returns (uint256,uint256,uint256)",
    "function getAdjustedLTV() view returns (uint256,uint256,uint256)",
    "function reportV4Swap(bytes32,uint256,int24,bool) external",
    "function setPriorityScore(uint256,string) external"
];

class AnthemAutomator {
    constructor() {
        if (!RPC_URL || !PRIVATE_KEY) {
            throw new Error('Missing environment variables: RPC_URL or PRIVATE_KEY');
        }
        
        if (!SWAP_EXECUTOR || !CORE_WRITER_ORACLE) {
            throw new Error('Missing contract addresses in environment variables');
        }
        
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.swapExecutor = new ethers.Contract(SWAP_EXECUTOR, SWAP_EXECUTOR_ABI, this.wallet);
        this.coreWriter = new ethers.Contract(CORE_WRITER_ORACLE, CORE_WRITER_ABI, this.wallet);
        this.eventCounter = 0;
        this.transactionHistory = [];
        this.automationRunning = false;
        console.log('✅ Anthem Automator initialized');
        console.log(`📊 Using Pool IDs:`);
        console.log(`   BTC/USDC: ${POOL_IDS.BTC_USDC}`);
        console.log(`   ETH/USDC: ${POOL_IDS.ETH_USDC}`);
    }

    // ==================== CORE FUNCTIONS ====================

    async getCurrentState() {
        try {
            const priorityScore = await this.coreWriter.priorityScore();
            const [seniorRatio, juniorRatio, currentScore] = await this.coreWriter.getTrancheRatios();
            const [seniorLTV, juniorLTV, adjustment] = await this.coreWriter.getAdjustedLTV();
            
            return {
                priorityScore: Number(priorityScore),
                seniorRatio: Number(seniorRatio) / 100,
                juniorRatio: Number(juniorRatio) / 100,
                seniorLTV: Number(seniorLTV) / 100,
                juniorLTV: Number(juniorLTV) / 100,
                adjustment: Number(adjustment) / 100,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to get state:', error.message);
            return null;
        }
    }

    generateArbiscanLink(txHash) {
        return `${ARBISCAN_TESTNET_BASE}/${txHash}`;
    }

    async logTransaction(tx, type, eventName, description = '') {
        try {
            const receipt = await tx.wait();
            const link = this.generateArbiscanLink(tx.hash);
            const gasCost = ethers.formatUnits(receipt.gasUsed * receipt.gasPrice, 'ether');
            
            const txInfo = {
                event: eventName,
                type: type,
                hash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                gasCost: parseFloat(gasCost).toFixed(6),
                timestamp: new Date().toISOString(),
                arbiscanLink: link,
                description: description
            };
            
            this.transactionHistory.push(txInfo);
            
            console.log(`📊 ${type.toUpperCase()}`);
            console.log(`   📝 ${description || eventName}`);
            console.log(`   🔗 ${link}`);
            console.log(`   ⛽ Gas: ${txInfo.gasCost} ETH`);
            console.log(`   🧱 Block: ${receipt.blockNumber}`);
            
            // Update API status
            await this.updateApiStatus('add-transaction', {
                transaction: txInfo
            });
            
            return txInfo;
        } catch (error) {
            console.error(`❌ Failed to log transaction: ${error.message}`);
            return null;
        }
    }

    // ==================== API STATUS UPDATES ====================

    async updateApiStatus(action, data = {}) {
        try {
            const response = await fetch('http://localhost:3000/api/automation/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            
            if (!response.ok) {
                console.log('⚠️ Failed to update API status:', await response.text());
            }
        } catch (error) {
            // Silent fail - API might not be running
        }
    }

    // ==================== BALANCE CHECK ====================

    async getSwapExecutorBalances() {
        try {
            const balances = await this.swapExecutor.getBalances();
            return {
                btc: Number(balances[0]),
                eth: Number(balances[1]),
                usdc: Number(balances[2])
            };
        } catch (error) {
            console.error('❌ Failed to get balances:', error.message);
            return { btc: 0, eth: 0, usdc: 0 };
        }
    }

    // ==================== κ_t THRESHOLD COMMENTS ====================

    displayKappaTThresholdComment(kappaT) {
        console.log(`\n🎯 κ_t = ${kappaT} THRESHOLD ANALYSIS:`);
        console.log(`${'-'.repeat(50)}`);
        
        if (kappaT >= 100) {
            console.log(`   🚨 MAXIMUM STRESS (κ_t=100):`);
            console.log(`      • Junior tranche at MAXIMUM allocation`);
            console.log(`      • LTV ratios at MINIMUM levels`);
            console.log(`      • Senior fully protected from ADL/liquidation`);
            console.log(`      • Junior absorbing ALL tail risk`);
            console.log(`      • System in HIGHEST protection mode`);
            
        } else if (kappaT >= 90) {
            console.log(`   🔥 EXTREME STRESS (κ_t≥90):`);
            console.log(`      • JELLY-like conditions possible`);
            console.log(`      • ADL queues likely backing up`);
            console.log(`      • Junior absorbing significant waste`);
            console.log(`      • Senior protection at maximum`);
            console.log(`      • LTV ratios severely restricted`);
            
        } else if (kappaT >= 80) {
            console.log(`   ⚠️  HIGH STRESS (κ_t≥80):`);
            console.log(`      • Market stress building`);
            console.log(`      • ADL inefficiency possible`);
            console.log(`      • Junior allocation increasing rapidly`);
            console.log(`      • Senior protection strengthening`);
            console.log(`      • LTV ratios decreasing`);
            
        } else if (kappaT >= 70) {
            console.log(`   🟡 ELEVATED STRESS (κ_t≥70):`);
            console.log(`      • Unusual market activity`);
            console.log(`      • Potential ADL waste accumulation`);
            console.log(`      • Junior starting to absorb more risk`);
            console.log(`      • Senior getting additional protection`);
            console.log(`      • LTV ratios moderating`);
            
        } else if (kappaT >= 60) {
            console.log(`   🟠 MODERATE STRESS (κ_t≥60):`);
            console.log(`      • JELLY ADL waste detection threshold (60%)`);
            console.log(`      • ADL queues becoming inefficient`);
            console.log(`      • Junior tranche yield increasing`);
            console.log(`      • Senior protection activating`);
            console.log(`      • LTV ratios adjusting downward`);
            
        } else if (kappaT >= 50) {
            console.log(`   🔵 MILD STRESS (κ_t≥50):`);
            console.log(`      • Above normal market activity`);
            console.log(`      • ADL queues functioning normally`);
            console.log(`      • Balanced tranche allocation`);
            console.log(`      • Standard protection levels`);
            console.log(`      • Moderate LTV ratios`);
            
        } else if (kappaT >= 40) {
            console.log(`   🟢 NORMAL (κ_t≥40):`);
            console.log(`      • Normal market conditions`);
            console.log(`      • ADL queues efficient`);
            console.log(`      • Senior-focused allocation`);
            console.log(`      • Junior earning premium yield`);
            console.log(`      • Maximum LTV available`);
            
        } else {
            console.log(`   💤 CALM (κ_t<40):`);
            console.log(`      • Very calm market`);
            console.log(`      • Minimal ADL activity`);
            console.log(`      • Maximum senior allocation`);
            console.log(`      • Junior yield normal`);
            console.log(`      • Full LTV capacity`);
        }
    }

    // ==================== EVENT EXECUTION ====================

    async executeAnthemEvent() {
        this.eventCounter++;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📅 EVENT ${this.eventCounter}`);
        console.log(`${'='.repeat(60)}`);
        
        // Update API status
        await this.updateApiStatus('event-executed', {
            event: { name: 'Starting event...', type: 'INITIALIZING' }
        });
        
        // Get current balances
        const balances = await this.getSwapExecutorBalances();
        
        // EXPANDED EVENTS LIST WITH JELLY-LIKE EVENTS (more frequent)
        const events = [
            // Calm market (small volumes, won't affect score) - 20%
            { name: 'Small BTC Swap', type: 'NORMAL_SWAP', stressLevel: 0, emoji: '🟢', asset: 'BTC', isStress: false, volumeBTC: 0.001 },
            { name: 'Small ETH Swap', type: 'NORMAL_SWAP', stressLevel: 0, emoji: '🟢', asset: 'ETH', isStress: false, volumeETH: 0.5 },
            
            // Large ETH swap (>1 ETH, will increase score by +5) - 10%
            { name: 'Large ETH Swap', type: 'HIGH_VOLUME', stressLevel: 10, emoji: '🔵', asset: 'ETH', isStress: false, volumeETH: 1.2 },
            
            // Regular stress events - 30%
            { name: 'BTC Price Drop', type: 'PRICE_DROP', stressLevel: 30, emoji: '🟡', asset: 'BTC', isStress: true, volumeBTC: 0.01 },
            { name: 'ETH Price Drop', type: 'PRICE_DROP', stressLevel: 35, emoji: '🟡', asset: 'ETH', isStress: true, volumeETH: 0.8 },
            { name: 'Market Stress', type: 'MARKET_STRESS', stressLevel: 50, emoji: '🟠', asset: 'ETH', isStress: true, volumeETH: 1.0 },
            
            // JELLY-LIKE EVENTS (more frequent - 40%)
            { name: 'JELLY ADL Queue Backup', type: 'ADL_BACKUP', stressLevel: 70, emoji: '🌀', asset: 'BTC', isStress: true, volumeBTC: 0.015, jellyEvent: true },
            { name: 'JELLY κ_t=60% Waste Detected', type: 'WASTE_DETECTED', stressLevel: 75, emoji: '⚠️', asset: 'ETH', isStress: true, volumeETH: 1.5, jellyEvent: true },
            { name: 'Mass Liquidation Cascade', type: 'LIQUIDATION_CASCADE', stressLevel: 85, emoji: '💥', asset: 'BTC', isStress: true, volumeBTC: 0.02, jellyEvent: true },
            { name: 'ADL Queue Stress', type: 'ADL_STRESS', stressLevel: 80, emoji: '🔴', asset: 'ETH', isStress: true, volumeETH: 1.8, jellyEvent: true },
            { name: 'Market Panic', type: 'MARKET_PANIC', stressLevel: 90, emoji: '🚨', asset: 'BTC', isStress: true, volumeBTC: 0.03, jellyEvent: true },
            { name: 'JELLY Protocol Stress', type: 'JELLY_STRESS', stressLevel: 95, emoji: '🪼', asset: 'ETH', isStress: true, volumeETH: 2.0, jellyEvent: true }
        ];
        
        // Weight events: JELLY events appear more frequently
        let event;
        if (this.eventCounter % 3 === 0) {
            // Every 3rd event is definitely a JELLY event
            const jellyEvents = events.filter(e => e.jellyEvent);
            const eventIndex = Math.floor(Math.random() * jellyEvents.length);
            event = jellyEvents[eventIndex];
        } else {
            // Otherwise random from all events
            const eventIndex = Math.floor(Math.random() * events.length);
            event = events[eventIndex];
        }
        
        console.log(`🎯 ${event.emoji} ${event.name}`);
        console.log(`📊 Type: ${event.type} | Asset: ${event.asset} | Stress Event: ${event.isStress ? 'YES 🔴' : 'NO 🟢'}`);
        
        const beforeState = await this.getCurrentState();
        if (beforeState) {
            this.displayState(beforeState, 'BEFORE');
            // Show κ_t threshold analysis
            this.displayKappaTThresholdComment(beforeState.priorityScore);
        }
        
        // Execute swap
        let swapResult = null;
        if (event.asset === 'BTC') {
            swapResult = await this.executeBtcSwap(event, true); // true = BTC→USDC
        } else if (event.asset === 'ETH') {
            swapResult = await this.executeEthSwap(event, true); // true = ETH→USDC
        }
        
        // Report to oracle
        const oracleResult = await this.reportToOracle(event);
        
        // Wait and get updated state
        let afterState = null;
        if ((swapResult && swapResult.success) || oracleResult.success) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            afterState = await this.getCurrentState();
            if (afterState && beforeState) {
                this.displayState(afterState, 'AFTER');
                this.displayStateChange(beforeState, afterState);
                
                // Show updated κ_t threshold analysis
                this.displayKappaTThresholdComment(afterState.priorityScore);
            }
        }
        
        // Show event summary
        this.displayEventSummary(event, swapResult, oracleResult);
        
        // Update API status with completed event
        await this.updateApiStatus('event-executed', {
            event: {
                name: event.name,
                type: event.type,
                asset: event.asset,
                isStress: event.isStress,
                jellyEvent: event.jellyEvent || false,
                priorityScore: afterState?.priorityScore || beforeState?.priorityScore,
                timestamp: new Date().toISOString()
            },
            eventsExecuted: this.eventCounter
        });
        
        return { event, swapResult, oracleResult, beforeState, afterState };
    }

    async executeBtcSwap(event, zeroForOne = true) {
        const volumeBTC = event.volumeBTC || 0.01;
        const amount = Math.floor(volumeBTC * 10**BTC_DECIMALS);
        
        const direction = zeroForOne ? 'BTC→USDC' : 'USDC→BTC';
        
        console.log(`\n💱 V4 BTC SWAP EXECUTION`);
        console.log(`   Simulating: ${event.name}`);
        console.log(`   Amount: ${volumeBTC.toFixed(4)} BTC (${amount.toLocaleString()} satoshis)`);
        console.log(`   Direction: ${direction}`);
        console.log(`   Pool ID: ${POOL_IDS.BTC_USDC.substring(0, 20)}...`);
        
        try {
            const tx = await this.swapExecutor.executeRealBtcUsdcSwap(zeroForOne, amount, {
                gasLimit: 500000n, // Increased gas limit
                gasPrice: 30000000n // Fixed gas price
            });
            
            const txInfo = await this.logTransaction(
                tx, 
                'V4 BTC Swap', 
                event.name,
                `${volumeBTC.toFixed(4)} BTC ${direction}`
            );
            return { success: true, txInfo };
        } catch (error) {
            console.error(`❌ BTC Swap failed: ${error.message}`);
            
            // Try much smaller amount
            console.log(`   Trying much smaller amount...`);
            try {
                const smallerAmount = Math.floor(amount / 100);
                const smallerTx = await this.swapExecutor.executeRealBtcUsdcSwap(zeroForOne, smallerAmount, {
                    gasLimit: 300000n,
                    gasPrice: 30000000n
                });
                
                const smallerTxInfo = await this.logTransaction(
                    smallerTx, 
                    'V4 BTC Swap (Tiny)', 
                    event.name,
                    `${(smallerAmount / 10**BTC_DECIMALS).toFixed(6)} BTC ${direction}`
                );
                return { success: true, txInfo: smallerTxInfo };
            } catch (retryError) {
                console.error(`❌ Even smaller swap failed: ${retryError.message}`);
                return { success: false, error: retryError.message };
            }
        }
    }

    async executeEthSwap(event, zeroForOne = true) {
        const volumeETH = event.volumeETH || 0.5;
        const amount = ethers.parseUnits(volumeETH.toString(), ETH_DECIMALS);
        
        const direction = zeroForOne ? 'ETH→USDC' : 'USDC→ETH';
        
        console.log(`\n💱 V4 ETH SWAP EXECUTION`);
        console.log(`   Simulating: ${event.name}`);
        console.log(`   Amount: ${volumeETH.toFixed(4)} ETH`);
        console.log(`   Direction: ${direction}`);
        console.log(`   Pool ID: ${POOL_IDS.ETH_USDC.substring(0, 20)}...`);
        
        try {
            const tx = await this.swapExecutor.executeRealEthUsdcSwap(zeroForOne, amount, {
                gasLimit: 500000n, // Increased gas limit
                gasPrice: 30000000n // Fixed gas price
            });
            
            const txInfo = await this.logTransaction(
                tx, 
                'V4 ETH Swap', 
                event.name,
                `${volumeETH.toFixed(4)} ETH ${direction}`
            );
            return { success: true, txInfo };
        } catch (error) {
            console.error(`❌ ETH Swap failed: ${error.message}`);
            
            // Try much smaller amount
            console.log(`   Trying much smaller amount...`);
            try {
                const smallerAmount = ethers.parseUnits((volumeETH / 100).toString(), ETH_DECIMALS);
                const smallerTx = await this.swapExecutor.executeRealEthUsdcSwap(zeroForOne, smallerAmount, {
                    gasLimit: 300000n,
                    gasPrice: 30000000n
                });
                
                const smallerTxInfo = await this.logTransaction(
                    smallerTx, 
                    'V4 ETH Swap (Tiny)', 
                    event.name,
                    `${(volumeETH / 100).toFixed(6)} ETH ${direction}`
                );
                return { success: true, txInfo: smallerTxInfo };
            } catch (retryError) {
                console.error(`❌ Even smaller swap failed: ${retryError.message}`);
                return { success: false, error: retryError.message };
            }
        }
    }

    async reportToOracle(event) {
        try {
            const poolId = event.asset === 'BTC' 
                ? POOL_IDS.BTC_USDC
                : POOL_IDS.ETH_USDC;
            
            let volume;
            let volumeHuman;
            let tickChange;
            
            // Set volume and tick change
            if (event.asset === 'BTC') {
                const volumeBTC = event.volumeBTC || 0.01;
                volume = Math.floor(volumeBTC * 10**BTC_DECIMALS);
                volumeHuman = volumeBTC.toFixed(4);
                
                // JELLY events have larger tick changes
                if (event.jellyEvent) {
                    tickChange = -60 - Math.floor(Math.random() * 60); // -60 to -120 for JELLY events
                } else if (event.isStress) {
                    tickChange = -30 - Math.floor(Math.random() * 40); // -30 to -70
                } else if (event.type === 'HIGH_VOLUME') {
                    tickChange = 10 + Math.floor(Math.random() * 20); // 10 to 30
                } else {
                    tickChange = Math.floor(Math.random() * 20) - 10; // -10 to 10
                }
            } else {
                const volumeETH = event.volumeETH || 0.5;
                volume = ethers.parseUnits(volumeETH.toString(), ETH_DECIMALS);
                volumeHuman = volumeETH.toFixed(4);
                
                // JELLY events have larger tick changes
                if (event.jellyEvent) {
                    tickChange = -70 - Math.floor(Math.random() * 80); // -70 to -150 for JELLY events
                } else if (event.isStress) {
                    tickChange = -40 - Math.floor(Math.random() * 60); // -40 to -100
                } else if (event.type === 'HIGH_VOLUME') {
                    tickChange = 15 + Math.floor(Math.random() * 25); // 15 to 40
                } else {
                    tickChange = Math.floor(Math.random() * 20) - 10; // -10 to 10
                }
            }
            
            console.log(`\n📡 COREWRITER ORACLE UPDATE`);
            console.log(`   Event: ${event.name}`);
            console.log(`   Asset: ${event.asset}`);
            console.log(`   Volume: ${volumeHuman} ${event.asset}`);
            console.log(`   Tick Change: ${tickChange}`);
            console.log(`   Stress Event: ${event.isStress ? 'YES 🔴 (+15 κ_t)' : 'NO 🟢'}`);
            console.log(`   Pool ID: ${poolId.substring(0, 20)}...`);
            
            // Special JELLY event messaging
            if (event.jellyEvent) {
                console.log(`   🪼 JELLY-LIKE EVENT: Simulating ${event.type}`);
                console.log(`   🎯 ANTHEM RESPONSE: Extreme stress → Maximum junior protection`);
                console.log(`   📊 IMPACT: κ_t +15, Junior allocation increasing`);
            } else if (event.isStress) {
                console.log(`   🎯 ANTHEM LOGIC: Stress event → κ_t +15`);
            } else if (event.asset === 'ETH' && (event.volumeETH || 0) > 1.0) {
                console.log(`   🎯 ANTHEM LOGIC: Normal ETH swap > 1 ETH → κ_t +5`);
            } else if (event.asset === 'ETH') {
                console.log(`   🎯 ANTHEM LOGIC: Normal ETH swap < 1 ETH → κ_t unchanged`);
            } else {
                console.log(`   🎯 ANTHEM LOGIC: BTC events only affect κ_t if stress event`);
            }
            
            // Increase gas limit for oracle call
            const tx = await this.coreWriter.reportV4Swap(poolId, volume, tickChange, event.isStress, {
                gasLimit: 800000n, // Increased gas limit for oracle
                gasPrice: 30000000n
            });
            
            const txInfo = await this.logTransaction(
                tx,
                'CoreWriter Update',
                event.name,
                `${event.asset} ${event.isStress ? 'STRESS' : 'NORMAL'} event`
            );
            
            return { success: true, txInfo };
            
        } catch (error) {
            console.error(`❌ Oracle update failed: ${error.message}`);
            
            // Try to decode the error
            if (error.message.includes('Invalid pool')) {
                console.error(`   🔍 ERROR DETAILS: Pool ID might be incorrect`);
                console.error(`   Current Pool ID for ${event.asset}:`);
                console.error(`   ${event.asset === 'BTC' ? POOL_IDS.BTC_USDC : POOL_IDS.ETH_USDC}`);
            }
            
            return { success: false, error: error.message };
        }
    }

    displayState(state, label) {
        console.log(`\n📊 ${label} STATE`);
        console.log(`${'-'.repeat(40)}`);
        console.log(`🎯 Priority Score (κ_t): ${state.priorityScore}/100`);
        
        let scoreColor = '🟢';
        if (state.priorityScore > 75) scoreColor = '🔴';
        else if (state.priorityScore > 25) scoreColor = '🟡';
        console.log(`   ${scoreColor} ${this.getProtectionLevel(state.priorityScore)}`);
        
        console.log(`\n🏦 ANTHEM TRANCHES`);
        console.log(`   Senior (Protected): ${state.seniorRatio.toFixed(2)}%`);
        console.log(`   Junior (Risk Absorption): ${state.juniorRatio.toFixed(2)}%`);
        
        console.log(`\n💰 REAL LENDING LTV`);
        console.log(`   Senior LTV: ${state.seniorLTV.toFixed(2)}%`);
        console.log(`   Junior LTV: ${state.juniorLTV.toFixed(2)}%`);
        console.log(`   LTV Adjustment: ${state.adjustment.toFixed(2)}%`);
    }

    displayStateChange(before, after) {
        const priorityChange = after.priorityScore - before.priorityScore;
        const seniorRatioChange = after.seniorRatio - before.seniorRatio;
        const seniorLTVChange = after.seniorLTV - before.seniorLTV;
        
        console.log(`\n📈 STATE CHANGES`);
        console.log(`${'-'.repeat(40)}`);
        
        if (priorityChange !== 0) {
            const arrow = priorityChange > 0 ? '↗️' : '↘️';
            console.log(`   Priority Score (κ_t): ${before.priorityScore} → ${after.priorityScore} ${arrow} (Δ${priorityChange.toFixed(1)})`);
        }
        
        if (seniorRatioChange !== 0) {
            const arrow = seniorRatioChange > 0 ? '↗️' : '↘️';
            console.log(`   Senior Allocation: ${before.seniorRatio.toFixed(2)}% → ${after.seniorRatio.toFixed(2)}% ${arrow} (Δ${seniorRatioChange.toFixed(2)}%)`);
        }
        
        if (seniorLTVChange !== 0) {
            const arrow = seniorLTVChange > 0 ? '↗️' : '↘️';
            console.log(`   Senior LTV: ${before.seniorLTV.toFixed(2)}% → ${after.seniorLTV.toFixed(2)}% ${arrow} (Δ${seniorLTVChange.toFixed(2)}%)`);
        }
    }

    displayEventSummary(event, swapResult, oracleResult) {
        console.log(`\n📋 EVENT ${this.eventCounter} SUMMARY`);
        console.log(`${'='.repeat(40)}`);
        console.log(`🎯 ${event.emoji} ${event.name}`);
        console.log(`📊 Type: ${event.type} | Asset: ${event.asset}`);
        
        console.log(`\n✅ RESULTS`);
        if (swapResult && swapResult.success && swapResult.txInfo) {
            console.log(`   💱 V4 Swap: SUCCESS`);
            console.log(`      🔗 ${swapResult.txInfo.arbiscanLink}`);
        } else if (swapResult && !swapResult.success) {
            console.log(`   💱 V4 Swap: FAILED - ${swapResult.error}`);
        }
        
        if (oracleResult.success && oracleResult.txInfo) {
            console.log(`   📡 CoreWriter Oracle: SUCCESS`);
            console.log(`      🔗 ${oracleResult.txInfo.arbiscanLink}`);
            
            if (event.jellyEvent) {
                console.log(`   🪼 JELLY IMPACT: Extreme stress → κ_t +15`);
            } else if (event.isStress) {
                console.log(`   🎯 κ_t IMPACT: Stress event → +15`);
            } else if (event.asset === 'ETH' && (event.volumeETH || 0) > 1.0) {
                console.log(`   🎯 κ_t IMPACT: Large ETH volume (>1 ETH) → +5`);
            } else {
                console.log(`   🎯 κ_t IMPACT: No change (small volume or BTC event)`);
            }
        } else {
            console.log(`   📡 CoreWriter Oracle: FAILED - ${oracleResult.error}`);
            
            // Additional debugging info
            if (oracleResult.error && oracleResult.error.includes('Invalid pool')) {
                console.log(`   🔍 DEBUG: Pool ID validation failed`);
                console.log(`   Make sure pool IDs match contract:`);
                console.log(`   BTC: ${POOL_IDS.BTC_USDC}`);
                console.log(`   ETH: ${POOL_IDS.ETH_USDC}`);
            }
        }
        
        console.log(`\n📊 Session Stats:`);
        console.log(`   Total Events: ${this.eventCounter}`);
        console.log(`   Total Transactions: ${this.transactionHistory.length}`);
    }

    getProtectionLevel(score) {
        if (score > 75) return 'HIGH PROTECTION 🔴 (Junior absorbs risk, LTV reduced)';
        if (score > 25) return 'MODERATE 🟡 (Balanced protection, standard LTV)';
        return 'CALM 🟢 (Maximum LTV, senior-focused allocation)';
    }

    async runContinuous(intervalSeconds = 15) {
        console.log(`${'⭐'.repeat(30)}`);
        console.log(`🚀 ANTHEM SYSTEM AUTOMATION WITH JELLY EVENTS`);
        console.log(`${'⭐'.repeat(30)}`);
        console.log(`⏰ Interval: ${intervalSeconds} seconds`);
        console.log(`🌐 Network: Arbitrum Sepolia Testnet`);
        console.log(`🔗 All transactions include Arbiscan links`);
        console.log(`${'-'.repeat(60)}`);
        
        console.log(`\n🎯 ANTHEM CORE LOGIC:`);
        console.log(`   • κ_t (Priority Score): 0-100 stress indicator`);
        console.log(`   • Stress events: +15 to κ_t`);
        console.log(`   • Normal ETH swaps > 1 ETH: +5 to κ_t`);
        console.log(`   • Small swaps: No change to κ_t`);
        console.log(`   • Higher κ_t → More junior allocation`);
        console.log(`   • Higher κ_t → Lower LTV ratios`);
        
        console.log(`\n🪼 JELLY-LIKE EVENTS:`);
        console.log(`   • Every 3rd event is a JELLY stress event`);
        console.log(`   • Simulating ADL queue backup & waste`);
        console.log(`   • Testing Anthem's protection mechanisms`);
        console.log(`   • κ_t=60%: JELLY waste detection threshold`);
        
        console.log(`\n📊 CONTRACT ADDRESSES:`);
        console.log(`   SwapExecutor: ${SWAP_EXECUTOR}`);
        console.log(`   CoreWriterOracle: ${CORE_WRITER_ORACLE}`);
        console.log(`   🔗 Arbiscan Base: ${ARBISCAN_TESTNET_BASE}`);
        
        console.log(`\n🏊 POOL IDs (using same as frontend):`);
        console.log(`   BTC/USDC: ${POOL_IDS.BTC_USDC}`);
        console.log(`   ETH/USDC: ${POOL_IDS.ETH_USDC}`);
        
        // Show current balances
        const balances = await this.getSwapExecutorBalances();
        console.log(`\n💰 SWAP EXECUTOR BALANCES:`);
        console.log(`   BTC: ${(balances.btc / 10**BTC_DECIMALS).toFixed(6)} BTC`);
        console.log(`   ETH: ${(balances.eth / 10**ETH_DECIMALS).toFixed(6)} ETH`);
        console.log(`   USDC: ${(balances.usdc / 10**USDC_DECIMALS).toFixed(2)} USDC`);
        
        const initialState = await this.getCurrentState();
        if (initialState) {
            this.displayState(initialState, 'INITIAL');
            this.displayKappaTThresholdComment(initialState.priorityScore);
        }
        
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🎬 STARTING ANTHEM AUTOMATION...`);
        console.log(`${'═'.repeat(60)}\n`);
        
        // Update API that automation is starting
        await this.updateApiStatus('start');
        this.automationRunning = true;
        
        process.on('SIGINT', async () => {
            console.log(`\n${'⚠️'.repeat(20)}`);
            console.log(`🛑 AUTOMATION STOPPED BY USER`);
            console.log(`${'⚠️'.repeat(20)}`);
            console.log(`\n👋 Total events executed: ${this.eventCounter}`);
            console.log(`📊 Total transactions: ${this.transactionHistory.length}`);
            
            // Update API that automation stopped
            await this.updateApiStatus('stop');
            this.automationRunning = false;
            
            process.exit(0);
        });
        
        // Countdown timer for next event
        let countdown = intervalSeconds;
        const countdownInterval = setInterval(() => {
            if (!this.automationRunning) {
                clearInterval(countdownInterval);
                return;
            }
            countdown--;
            
            // Update API with countdown
            this.updateApiStatus('tick', { nextEventIn: countdown });
            
            if (countdown <= 0) {
                countdown = intervalSeconds;
            }
        }, 1000);
        
        while (this.automationRunning) {
            try {
                await this.executeAnthemEvent();
                
                if (this.eventCounter % 3 === 0) {
                    this.showSimpleDashboard();
                }
                
                console.log(`\n${'⏰'.repeat(20)}`);
                console.log(`⏱️  Next event in ${intervalSeconds} seconds...`);
                console.log(`${'⏰'.repeat(20)}\n`);
                
                // Countdown
                for (let i = intervalSeconds; i > 0 && this.automationRunning; i--) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    countdown = i;
                }
                
            } catch (error) {
                console.error(`❌ Event execution error: ${error.message}`);
                console.log(`Waiting ${intervalSeconds} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
            }
        }
        
        clearInterval(countdownInterval);
    }
    
    showSimpleDashboard() {
        console.log(`\n${'═'.repeat(80)}`);
        console.log(`📊 SIMPLE DASHBOARD - Event ${this.eventCounter}`);
        console.log(`${'═'.repeat(80)}`);
        
        console.log(`🔗 Recent Transactions:`);
        this.transactionHistory.slice(-3).forEach((tx, i) => {
            const index = this.transactionHistory.length - 3 + i + 1;
            console.log(`   ${index}. ${tx.type}: ${tx.event}`);
            console.log(`      🔗 ${tx.arbiscanLink}`);
        });
    }
    
    async stop() {
        this.automationRunning = false;
        await this.updateApiStatus('stop');
        console.log('🛑 Automation stopped');
    }
}

// ==================== FOR API ROUTE ====================

async function executeSingleEvent() {
    try {
        const automator = new AnthemAutomator();
        const result = await automator.executeAnthemEvent();
        return result;
    } catch (error) {
        console.error('Failed to execute single event:', error);
        throw error;
    }
}

async function startAutomation(intervalSeconds = 15) {
    try {
        const automator = new AnthemAutomator();
        await automator.runContinuous(intervalSeconds);
        return { success: true, message: 'Automation started' };
    } catch (error) {
        console.error('Failed to start automation:', error);
        return { success: false, error: error.message };
    }
}

// ==================== MANUAL EXECUTION ====================

if (require.main === module) {
    const automator = new AnthemAutomator();
    automator.runContinuous(15).catch(console.error);
}

module.exports = { AnthemAutomator, executeSingleEvent, startAutomation };