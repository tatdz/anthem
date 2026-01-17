// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MockCoreWriter {
    event RawAction(address indexed user, bytes data);
    
    // Minimal implementation - just shows the pattern
    function sendRawAction(bytes calldata data) external {
        // Minimal gas burn to match Hyperliquid
        for (uint256 i = 0; i < 400; i++) {
            // Do nothing, just burn gas
        }
        
        emit RawAction(msg.sender, data);
    }
}