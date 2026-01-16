// src/SovereignPool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISovereignALM.sol"; 

contract SovereignPool is ERC20, Ownable {
    IERC20 public immutable token0; // sANTHEM
    IERC20 public immutable token1; // jANTHEM
    
    address public alm;
    address public sovereignVault;
    
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public lastUpdated;
    
    // Valantis compatibility
    uint256 public poolManagerFeeBips;
    uint256 public feePoolManager0;
    uint256 public feePoolManager1;
    
    event Mint(address indexed sender, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(address indexed sender, uint256 amount0Out, uint256 amount1Out, address indexed to);
    event ALMSet(address alm);
    event DepositLiquidity(uint256 amount0, uint256 amount1);
    event WithdrawLiquidity(address indexed recipient, uint256 amount0, uint256 amount1);
    
    constructor(IERC20 _token0, IERC20 _token1) 
        ERC20("Anthem LP", "ANTHEM-LP") 
        Ownable(msg.sender) 
    {
        require(address(_token0) != address(_token1), "Identical addresses");
        token0 = _token0;
        token1 = _token1;
        sovereignVault = address(this);
        lastUpdated = block.timestamp;
    }
    
    // ================== ALM & VALANTIS COMPATIBILITY ==================
    
    function setALM(address _alm) external onlyOwner {
        require(_alm != address(0), "Invalid ALM address");
        alm = _alm;
        emit ALMSet(_alm);
    }
    
    function setPoolManagerFeeBips(uint256 feeBips) external onlyOwner {
        require(feeBips <= 5000, "Max 50% fee"); // 5000 = 50%
        poolManagerFeeBips = feeBips;
    }
    
    // Valantis-compatible deposit function
    function depositLiquidity(
        uint256 amount0,
        uint256 amount1,
        address sender,
        bytes calldata verificationContext,
        bytes calldata depositData
    ) external returns (uint256 amount0Deposited, uint256 amount1Deposited) {
        require(msg.sender == alm, "Only ALM");
        require(amount0 > 0 || amount1 > 0, "Zero deposit");
        
        // Call ALM callback
        ISovereignALM(alm).onDepositLiquidityCallback(amount0, amount1, depositData);
        
        // Check balances after callback
        amount0Deposited = token0.balanceOf(address(this)) - reserve0;
        amount1Deposited = token1.balanceOf(address(this)) - reserve1;
        
        require(amount0Deposited >= amount0 && amount1Deposited >= amount1, "Insufficient tokens");
        
        // Calculate and mint LP tokens
        uint256 liquidity;
        if (totalSupply() == 0) {
            liquidity = sqrt(amount0Deposited * amount1Deposited);
        } else {
            uint256 liquidity0 = (amount0Deposited * totalSupply()) / reserve0;
            uint256 liquidity1 = (amount1Deposited * totalSupply()) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }
        
        require(liquidity > 0, "Insufficient liquidity");
        
        // Mint to address from depositData (typically the vault)
        address provider = abi.decode(depositData, (address));
        _mint(provider, liquidity);
        
        // Update reserves
        reserve0 += amount0Deposited;
        reserve1 += amount1Deposited;
        lastUpdated = block.timestamp;
        
        emit Mint(provider, amount0Deposited, amount1Deposited, liquidity);
        emit DepositLiquidity(amount0Deposited, amount1Deposited);
        
        return (amount0Deposited, amount1Deposited);
    }
    
    // Valantis-compatible withdraw function
    function withdrawLiquidity(
        uint256 amount0,
        uint256 amount1,
        address sender,
        address recipient,
        bytes calldata verificationContext
    ) external {
        require(msg.sender == alm, "Only ALM");
        require(recipient != address(0), "Invalid recipient");
        
        if (amount0 > 0) {
            require(token0.transfer(recipient, amount0), "Token0 transfer failed");
            reserve0 -= amount0;
        }
        
        if (amount1 > 0) {
            require(token1.transfer(recipient, amount1), "Token1 transfer failed");
            reserve1 -= amount1;
        }
        
        emit WithdrawLiquidity(recipient, amount0, amount1);
    }
    
    // ================== DIRECT MINT (for testing/backward compatibility) ==================
    
    function mint(address to) external returns (uint256 liquidity) {
        // Get current balances
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        
        // Calculate amounts being added
        uint256 amount0 = balance0 - reserve0;
        uint256 amount1 = balance1 - reserve1;
        
        require(amount0 > 0 && amount1 > 0, "Must provide both tokens");
        
        // Calculate liquidity
        if (totalSupply() == 0) {
            liquidity = sqrt(amount0 * amount1);
            require(liquidity > 1000, "Initial liquidity too low");
        } else {
            uint256 liquidity0 = (amount0 * totalSupply()) / reserve0;
            uint256 liquidity1 = (amount1 * totalSupply()) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        // Mint LP tokens
        _mint(to, liquidity);
        
        // Update reserves
        reserve0 = balance0;
        reserve1 = balance1;
        lastUpdated = block.timestamp;
        
        emit Mint(msg.sender, amount0, amount1, liquidity);
    }
    
    function burn(address to) external returns (uint256 amount0, uint256 amount1) {
        uint256 liquidity = balanceOf(msg.sender);
        require(liquidity > 0, "No liquidity to burn");
        
        amount0 = (liquidity * reserve0) / totalSupply();
        amount1 = (liquidity * reserve1) / totalSupply();
        
        require(amount0 > 0 && amount1 > 0, "Insufficient amounts");
        
        _burn(msg.sender, liquidity);
        
        reserve0 -= amount0;
        reserve1 -= amount1;
        lastUpdated = block.timestamp;
        
        require(token0.transfer(to, amount0), "Token0 transfer failed");
        require(token1.transfer(to, amount1), "Token1 transfer failed");
        
        emit Burn(msg.sender, amount0, amount1, liquidity);
    }
    
    // ================== SWAP FUNCTIONALITY ==================
    
    function swap(
        bool isZeroToOne,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        address tokenOut,
        bytes calldata swapContext
    ) external returns (uint256 amountInUsed, uint256 amountOut) {
        require(amountIn > 0, "Insufficient input");
        require(recipient != address(0), "Invalid recipient");
        
        // Use ALM for pricing if set
        if (alm != address(0)) {
            ISovereignALM.ALMLiquidityQuoteInput memory input = ISovereignALM.ALMLiquidityQuoteInput({
                isZeroToOne: isZeroToOne,
                amountInMinusFee: amountIn * 997 / 1000, // 0.3% fee
                feeInBips: 30,
                sender: msg.sender,
                recipient: recipient,
                tokenOutSwap: tokenOut
            });
            
            ISovereignALM.ALMLiquidityQuote memory quote = ISovereignALM(alm).getLiquidityQuote(
                input,
                swapContext,
                bytes("") // No verifier data for now
            );
            
            amountOut = quote.amountOut;
            amountInUsed = quote.amountInFilled;
            
            if (quote.isCallbackOnSwap) {
                ISovereignALM(alm).onSwapCallback(isZeroToOne, amountInUsed, amountOut);
            }
        } else {
            // Simple constant product pricing
            (uint256 reserveIn, uint256 reserveOut) = isZeroToOne ? 
                (reserve0, reserve1) : (reserve1, reserve0);
            
            uint256 amountInWithFee = amountIn * 997 / 1000;
            amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
            amountInUsed = amountIn;
        }
        
        require(amountOut >= amountOutMin, "Insufficient output");
        
        // Transfer input token
        IERC20 inputToken = isZeroToOne ? token0 : token1;
        require(inputToken.transferFrom(msg.sender, address(this), amountInUsed), "Input transfer failed");
        
        // Transfer output token
        IERC20 outputToken = isZeroToOne ? token1 : token0;
        require(outputToken.transfer(recipient, amountOut), "Output transfer failed");
        
        // Update reserves
        if (isZeroToOne) {
            reserve0 += amountInUsed;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountInUsed;
            reserve0 -= amountOut;
        }
        
        lastUpdated = block.timestamp;
        
        emit Swap(msg.sender, isZeroToOne ? amountOut : 0, isZeroToOne ? 0 : amountOut, recipient);
    }
    
    // ================== VIEW FUNCTIONS ==================
    
    function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1, uint256 _timestamp) {
        return (reserve0, reserve1, lastUpdated);
    }
    
    function getPoolState() external view returns (
        uint256 _reserve0,
        uint256 _reserve1,
        uint256 _totalLiquidity,
        uint256 _price0To1,
        uint256 _price1To0
    ) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _totalLiquidity = totalSupply();
        
        if (_reserve0 > 0 && _reserve1 > 0) {
            _price0To1 = (_reserve1 * 1e18) / _reserve0;
            _price1To0 = (_reserve0 * 1e18) / _reserve1;
        }
    }
    
    
    // ================== INTERNAL HELPERS ==================
    
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function sync() external {
        reserve0 = token0.balanceOf(address(this));
        reserve1 = token1.balanceOf(address(this));
        lastUpdated = block.timestamp;
    }
}