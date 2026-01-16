// src/CoreWriterOracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CoreWriterOracle is Ownable {
    uint256 public priorityScore; // k_t (0-100)
    uint256 public lastUpdate;
    
    bytes32 public constant BTC_USDC_POOL_ID = 0x1dd8c051c7fc03e6d22c98be140f43f7443f7553826817cda2115ace5ae1b3aa;
    bytes32 public constant ETH_USDC_POOL_ID = 0x3b7a8b2f53613e34d3c8df21673da84ab403788442e775f4103afa8018c99546;
    
    struct PoolMetrics {
        int24 currentTick;
        uint256 lastSwapTimestamp;
        uint256 swapCount24h;
        uint256 cumulativeVolume;
        uint256 stressEvents;
    }
    
    mapping(bytes32 => PoolMetrics) public poolMetrics;
    
    event V4SwapReported(
        bytes32 indexed poolId,
        uint256 volume,
        int24 tickChange,
        bool isStress,
        uint256 newPriorityScore,
        uint256 timestamp
    );
    
    event PriorityScoreUpdated(
        uint256 oldScore,
        uint256 newScore,
        string trigger
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {
        priorityScore = 25;
        lastUpdate = block.timestamp;
        
        poolMetrics[BTC_USDC_POOL_ID] = PoolMetrics({
            currentTick: -302920,
            lastSwapTimestamp: block.timestamp,
            swapCount24h: 0,
            cumulativeVolume: 0,
            stressEvents: 0
        });
        
        poolMetrics[ETH_USDC_POOL_ID] = PoolMetrics({
            currentTick: -332860,
            lastSwapTimestamp: block.timestamp,
            swapCount24h: 0,
            cumulativeVolume: 0,
            stressEvents: 0
        });
    }
    
    /**
     * @notice Report a V4 swap - SIMPLE VERSION THAT WORKS
     */
    function reportV4Swap(
        bytes32 poolId,
        uint256 volume,
        int24 tickChange,
        bool isStress
    ) external {
        require(
            poolId == BTC_USDC_POOL_ID || poolId == ETH_USDC_POOL_ID,
            "Invalid pool"
        );
        
        PoolMetrics storage metrics = poolMetrics[poolId];
        
        metrics.currentTick += tickChange;
        metrics.lastSwapTimestamp = block.timestamp;
        metrics.swapCount24h++;
        metrics.cumulativeVolume += volume;
        
        if (isStress) {
            metrics.stressEvents++;
        }
        
        uint256 oldScore = priorityScore;
        
        // Update priority score
        if (isStress) {
            priorityScore = priorityScore + 15 > 100 ? 100 : priorityScore + 15;
        } else {
            if (volume > 1e18) {
                priorityScore = priorityScore + 5 > 100 ? 100 : priorityScore + 5;
            }
        }
        
        emit V4SwapReported(
            poolId,
            volume,
            tickChange,
            isStress,
            priorityScore,
            block.timestamp
        );
        
        if (oldScore != priorityScore) {
            emit PriorityScoreUpdated(oldScore, priorityScore, isStress ? "Stress Swap" : "Normal Swap");
        }
    }
    
    function getSeniorTrancheRatio() public view returns (uint256) {
        uint256 seniorBps = 8500 - (priorityScore * 35);
        return seniorBps < 5000 ? 5000 : seniorBps;
    }
    
    function getTrancheRatios() external view returns (
        uint256 seniorBps,
        uint256 juniorBps,
        uint256 currentPriorityScore
    ) {
        seniorBps = getSeniorTrancheRatio();
        return (seniorBps, 10000 - seniorBps, priorityScore);
    }
    
    function getAdjustedLTV() external view returns (
        uint256 seniorLTV,
        uint256 juniorLTV,
        uint256 adjustment
    ) {
        uint256 baseSeniorLTV = 6000;
        uint256 baseJuniorLTV = 4000;
        
        adjustment = (priorityScore * 4000) / 10000;
        
        seniorLTV = baseSeniorLTV - adjustment;
        juniorLTV = baseJuniorLTV - adjustment;
        
        if (seniorLTV < 2000) seniorLTV = 2000;
        if (juniorLTV < 2000) juniorLTV = 2000;
        
        return (seniorLTV, juniorLTV, adjustment);
    }
    
    // For demo: manual control
    function setPriorityScore(uint256 newScore, string calldata reason) external onlyOwner {
        uint256 oldScore = priorityScore;
        priorityScore = newScore > 100 ? 100 : newScore;
        emit PriorityScoreUpdated(oldScore, priorityScore, reason);
    }
}