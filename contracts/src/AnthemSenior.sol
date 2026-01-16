// src/AnthemSenior.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AnthemSenior is ERC4626, Ownable {
    using SafeERC20 for IERC20;
    
    address public vault; // Informational only
    uint256 public constant MAX_DEPOSIT = 100_000 * 1e6; // 100,000 USDC
    
    event SeniorDeposited(address indexed user, uint256 assets, uint256 shares);
    event SeniorWithdrawn(address indexed user, uint256 assets, uint256 shares);
    
    constructor(IERC20 asset_) 
        ERC4626(asset_)
        ERC20("Anthem Senior Tranche", "sANTHEM") 
        Ownable(msg.sender)
    {}
    
    // Informational only - tracks which vault uses this token
function setVault(address _vault) external {
    vault = _vault;
}
    
    // Standard ERC4626 - anyone can deposit
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        require(assets <= MAX_DEPOSIT, "Exceeds max deposit");
        require(assets > 0, "Must deposit > 0");
        
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        uint256 shares = assets; // 1:1
        _mint(receiver, shares);
        
        emit SeniorDeposited(receiver, assets, shares);
        return shares;
    }
    
    // Standard ERC4626 functions...
    function mint(uint256 shares, address receiver) public override returns (uint256) {
        require(shares <= MAX_DEPOSIT, "Exceeds max deposit");
        require(shares > 0, "Must mint > 0");
        
        uint256 assets = shares; // 1:1
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        
        emit SeniorDeposited(receiver, assets, shares);
        return assets;
    }
    
    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
        require(shares > 0, "Must redeem > 0");
        uint256 assets = super.redeem(shares, receiver, owner);
        emit SeniorWithdrawn(owner, assets, shares);
        return assets;
    }
    
    function withdraw(uint256 assets, address receiver, address owner) public override returns (uint256) {
        require(assets > 0, "Must withdraw > 0");
        uint256 shares = super.withdraw(assets, receiver, owner);
        emit SeniorWithdrawn(owner, assets, shares);
        return shares;
    }
    
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }
    
    // 1:1 pricing
    function previewMint(uint256 shares) public view virtual override returns (uint256) { return shares; }
    function previewRedeem(uint256 shares) public view virtual override returns (uint256) { return shares; }
    function previewDeposit(uint256 assets) public view virtual override returns (uint256) { return assets; }
    function previewWithdraw(uint256 assets) public view virtual override returns (uint256) { return assets; }
    
    function decimals() public view virtual override returns (uint8) {
        return 6; // Match USDC
    }
}