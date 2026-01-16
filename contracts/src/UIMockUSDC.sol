// src/UIMockUSDC.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UIMockUSDC is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 10000 * 10**6; // 10,000 USDC
    
    constructor() ERC20("UI Mock USDC", "uiUSDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M initial to deployer
    }
    
    function decimals() public pure override returns (uint8) {
        return 6; // Same as real USDC
    }
    
    // Public faucet - anyone can call
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
    
    // Owner can mint more if needed
    function ownerMint(address to, uint256 amount) external {
        // In production, add onlyOwner modifier
        require(msg.sender == tx.origin, "Only EOA can mint");
        require(amount <= 100000 * 10**6, "Too much");
        _mint(to, amount);
    }
}

