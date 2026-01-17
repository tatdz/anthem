// frontend/scripts/fund-swap-executor.js
const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

const RPC_URL = process.env.ALCHEMY_ARBITRUM_TESTNET_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Contract addresses
const SWAP_EXECUTOR = process.env.NEXT_PUBLIC_V4_SWAP_EXECUTOR;
const MOCK_BTC = process.env.NEXT_PUBLIC_MOCK_BTC;
const MOCK_ETH = process.env.NEXT_PUBLIC_MOCK_ETH;
const MOCK_USDC = process.env.NEXT_PUBLIC_MOCK_USDC;

console.log('💰 Funding SwapExecutor with ERC20 Tokens Only');
console.log('===============================================');
console.log(`SwapExecutor: ${SWAP_EXECUTOR}`);

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ERC20 ABI
const erc20Abi = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address,uint256) returns (bool)',
    'function decimals() view returns (uint8)',
    'function mint(address,uint256) external'
];

async function fundToken(tokenAddress, tokenName, targetAmount) {
    console.log(`\n📊 Funding ${tokenName}...`);
    
    const token = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    const decimals = await token.decimals();
    const target = ethers.parseUnits(targetAmount, decimals);
    
    // Check current balance
    const currentBalance = await token.balanceOf(SWAP_EXECUTOR);
    console.log(`Current ${tokenName}: ${ethers.formatUnits(currentBalance, decimals)}`);
    
    if (currentBalance >= target) {
        console.log(`✅ Sufficient ${tokenName}`);
        return;
    }
    
    // Calculate needed amount
    const needed = target - currentBalance;
    
    // Try minting first
    try {
        console.log(`Attempting to mint ${ethers.formatUnits(needed, decimals)} ${tokenName}...`);
        const tx = await token.mint(SWAP_EXECUTOR, needed);
        await tx.wait();
        console.log(`✅ Minted ${ethers.formatUnits(needed, decimals)} ${tokenName}`);
    } catch (mintError) {
        // If mint fails, try transferring from deployer
        console.log(`Mint not available, transferring from deployer...`);
        const deployerBalance = await token.balanceOf(wallet.address);
        console.log(`Deployer ${tokenName}: ${ethers.formatUnits(deployerBalance, decimals)}`);
        
        if (deployerBalance >= needed) {
            const tx = await token.transfer(SWAP_EXECUTOR, needed);
            await tx.wait();
            console.log(`✅ Transferred ${ethers.formatUnits(needed, decimals)} ${tokenName}`);
        } else {
            console.log(`⚠️  Cannot fund ${tokenName}: insufficient deployer balance`);
        }
    }
}

async function main() {
    console.log(`Deployer: ${wallet.address}`);
    
    // Check deployer native ETH (for gas only)
    const deployerEth = await provider.getBalance(wallet.address);
    console.log(`\nDeployer gas ETH: ${ethers.formatEther(deployerEth)} (for transactions only)`);
    
    // Fund tokens
    await fundToken(MOCK_BTC, 'BTC', '10'); // 10 BTC
    await fundToken(MOCK_ETH, 'ETH', '20'); // 20 ETH (ERC20, not native!)
    await fundToken(MOCK_USDC, 'USDC', '20000'); // 20,000 USDC
    
    // Display final balances
    console.log('\n===============================================');
    console.log('✅ FINAL SWAPEXECUTOR BALANCES:');
    console.log('===============================================');
    
    const btc = new ethers.Contract(MOCK_BTC, erc20Abi, wallet);
    const eth = new ethers.Contract(MOCK_ETH, erc20Abi, wallet);
    const usdc = new ethers.Contract(MOCK_USDC, erc20Abi, wallet);
    
    const btcDecimals = await btc.decimals();
    const ethDecimals = await eth.decimals();
    const usdcDecimals = await usdc.decimals();
    
    const btcBalance = await btc.balanceOf(SWAP_EXECUTOR);
    const ethBalance = await eth.balanceOf(SWAP_EXECUTOR);
    const usdcBalance = await usdc.balanceOf(SWAP_EXECUTOR);
    
    console.log(`Mock BTC:  ${ethers.formatUnits(btcBalance, btcDecimals)} BTC`);
    console.log(`Mock ETH:  ${ethers.formatUnits(ethBalance, ethDecimals)} ETH (ERC20)`);
    console.log(`Mock USDC: ${ethers.formatUnits(usdcBalance, usdcDecimals)} USDC`);
    console.log('===============================================');
    console.log('\n💡 Note: SwapExecutor uses ERC20 tokens, not native ETH');
    console.log('   Mock ETH is an ERC20 token, not native Ethereum');
}

main().catch(console.error);