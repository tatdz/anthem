// src/MockUSDC.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1,000,000 USDC (6 decimals like real USDC)
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
