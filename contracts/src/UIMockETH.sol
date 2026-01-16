// src/UIMockETH.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UIMockETH is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 10 * 10**18; // 10 ETH
    
    constructor() ERC20("UI Mock ETH", "uiETH") {
        _mint(msg.sender, 1000 * 10**18); // 1,000 ETH initial
    }
    
    function decimals() public pure override returns (uint8) {
        return 18; // Same as real ETH
    }
    
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
    
    function ownerMint(address to, uint256 amount) external {
        require(msg.sender == tx.origin, "Only EOA can mint");
        require(amount <= 100 * 10**18, "Too much");
        _mint(to, amount);
    }
}