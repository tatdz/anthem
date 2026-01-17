// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MockL1Read {
    // Essential structs for Anthem
    struct AccountMarginSummary {
        int64 accountValue;
        uint64 marginUsed;
        uint64 ntlPos;
        int64 rawUsd;
    }
    
    struct Bbo {
        uint64 bid;
        uint64 ask;
    }
    
    // Helper function to get oracle price (non-pure since we need to call external)
    function _getOraclePx(uint32 index) internal pure returns (uint64) {
        if (index == 0) return 50000 * 1e6; // BTC $50,000
        if (index == 1) return 3500 * 1e6;  // ETH $3,500
        return 1 * 1e6; // Default $1
    }
    
    // The two functions Anthem actually needs
    function accountMarginSummary(uint32 perp_dex_index, address user) 
        external pure returns (AccountMarginSummary memory) 
    {
        // Simulate Hyperliquid margin data based on perp index
        if (perp_dex_index == 0) { // BTC
            return AccountMarginSummary({
                accountValue: 1_000_000,
                marginUsed: 750_000,      // 75% usage = high stress
                ntlPos: 5_000,
                rawUsd: -50_000           // $50k loss
            });
        } else { // ETH
            return AccountMarginSummary({
                accountValue: 500_000,
                marginUsed: 400_000,      // 80% usage = very high stress
                ntlPos: 10_000,
                rawUsd: -25_000           // $25k loss
            });
        }
    }
    
    function oraclePx(uint32 index) external pure returns (uint64) {
        return _getOraclePx(index);
    }
    
    function bbo(uint32 asset) external pure returns (Bbo memory) {
        uint64 price = _getOraclePx(asset);
        return Bbo({
            bid: price * 999 / 1000,  // 0.1% spread
            ask: price * 1001 / 1000
        });
    }
    
    // For completeness (not used by Anthem but shows understanding)
    function l1BlockNumber() external view returns (uint64) {
        return uint64(block.number);
    }
}