// src/MockBTC.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockBTC is ERC20 {
    constructor() ERC20("Mock Bitcoin", "mBTC") {
        _mint(msg.sender, 1000 * 10**8); // 1000 BTC (8 decimals like real BTC)
    }
    
    function decimals() public pure override returns (uint8) {
        return 8;
    }
}