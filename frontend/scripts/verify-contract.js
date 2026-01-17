// scripts/verify-contract.js
const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

const RPC_URL = process.env.ALCHEMY_ARBITRUM_TESTNET_URL;
const CORE_WRITER_ORACLE = process.env.NEXT_PUBLIC_COREWRITER_ORACLE;

const CORE_WRITER_ABI = [
  "function priorityScore() view returns (uint256)",
  "function getTrancheRatios() view returns (uint256,uint256,uint256)",
  "function getAdjustedLTV() view returns (uint256,uint256,uint256)",
  "function lastUpdate() view returns (uint256)"
];

async function verifyContract() {
  console.log('🔍 VERIFYING COREWRITER ORACLE CONTRACT');
  console.log('='.repeat(50));
  
  if (!RPC_URL || !CORE_WRITER_ORACLE) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CORE_WRITER_ORACLE, CORE_WRITER_ABI, provider);
    
    console.log(`📊 Contract Address: ${CORE_WRITER_ORACLE}`);
    console.log(`🌐 Network: ${provider.network?.name || 'Unknown'}`);
    
    // Get priority score
    const priorityScore = await contract.priorityScore();
    console.log(`\n🎯 PRIORITY SCORE (κ_t): ${Number(priorityScore)}/100`);
    
    // Get tranche ratios
    const [seniorRatio, juniorRatio, currentScore] = await contract.getTrancheRatios();
    console.log(`\n🏦 TRANCHES:`);
    console.log(`   Senior Allocation: ${Number(seniorRatio) / 100}%`);
    console.log(`   Junior Allocation: ${Number(juniorRatio) / 100}%`);
    console.log(`   Current Score in contract: ${Number(currentScore)}/100`);
    
    // Get LTV adjustments
    const [seniorLTV, juniorLTV, adjustment] = await contract.getAdjustedLTV();
    console.log(`\n💰 LTV RATIOS:`);
    console.log(`   Senior LTV: ${Number(seniorLTV) / 100}%`);
    console.log(`   Junior LTV: ${Number(juniorLTV) / 100}%`);
    console.log(`   Adjustment: ${Number(adjustment) / 100}%`);
    
    // Get last update timestamp
    try {
      const lastUpdate = await contract.lastUpdate();
      const timestamp = new Date(Number(lastUpdate) * 1000);
      console.log(`\n⏰ LAST UPDATE: ${timestamp.toLocaleString()}`);
      console.log(`   ${Math.floor((Date.now() - timestamp.getTime()) / 1000)} seconds ago`);
    } catch (error) {
      console.log(`\n⏰ No lastUpdate function available`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ VERIFICATION COMPLETE');
    
    // Interpretation
    const score = Number(priorityScore);
    console.log(`\n📝 INTERPRETATION:`);
    if (score === 100) {
      console.log(`   🚨 MAXIMUM STRESS (100/100):`);
      console.log(`      • Contract might be at maximum value`);
      console.log(`      • Check if this is expected behavior`);
      console.log(`      • Senior tranche has maximum protection`);
    } else if (score >= 75) {
      console.log(`   🔥 HIGH STRESS (${score}/100):`);
      console.log(`      • Stress events are having effect`);
      console.log(`      • Junior allocation: ${Number(juniorRatio) / 100}%`);
    } else if (score >= 50) {
      console.log(`   ⚠️  MODERATE STRESS (${score}/100):`);
      console.log(`      • System responding to events`);
    } else {
      console.log(`   🟢 CALM (${score}/100):`);
      console.log(`      • Normal operation`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    
    // Check common issues
    if (error.message.includes('invalid address')) {
      console.error(`\n🔍 ISSUE: Invalid contract address`);
      console.error(`   Current: ${CORE_WRITER_ORACLE}`);
      console.error(`   Check your .env.local file`);
    } else if (error.message.includes('network')) {
      console.error(`\n🔍 ISSUE: Network connection problem`);
      console.error(`   RPC URL: ${RPC_URL?.substring(0, 50)}...`);
    }
  }
}

// Run verification
verifyContract();

module.exports = { verifyContract };