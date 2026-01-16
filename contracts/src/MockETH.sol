// src/MockETH.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockETH is ERC20 {
    constructor() ERC20("Mock Ether", "mETH") {
        _mint(msg.sender, 10000 * 10**18); // 10,000 ETH (18 decimals like real ETH)
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}