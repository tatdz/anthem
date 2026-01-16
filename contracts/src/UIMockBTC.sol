// contracts/UIMockBTC.sol  
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UIMockBTC is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1 * 10**8; // 1 BTC
    
    constructor() ERC20("UI Mock BTC", "uiBTC") {
        _mint(msg.sender, 100 * 10**8); // 100 BTC initial
    }
    
    function decimals() public pure override returns (uint8) {
        return 8; // Same as real BTC
    }
    
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
    
    function ownerMint(address to, uint256 amount) external {
        require(msg.sender == tx.origin, "Only EOA can mint");
        require(amount <= 10 * 10**8, "Too much");
        _mint(to, amount);
    }
}