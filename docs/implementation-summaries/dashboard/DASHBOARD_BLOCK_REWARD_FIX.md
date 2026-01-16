# Dashboard Block Reward Display Fix

**Date**: January 16, 2026  
**Status**: ✅ Complete  
**Category**: Dashboard Enhancement

## Problem Statement

The dashboard was displaying incorrect block reward values:
- **Dashboard showed**: 34.65 KAS
- **Expected (kaspa.stream)**: ~3.46 KAS
- **Discrepancy**: ~10x too high

## Root Cause

The `getBlockRewardFromNode()` function was summing ALL coinbase transaction outputs, which includes:
- Block subsidy (emission-based reward) ~3.46 KAS
- Transaction fees ~31 KAS
- **Total coinbase**: ~34.65 KAS ❌

The dashboard should display only the **block subsidy** (emission-based reward), not the total coinbase payout.

## Solution Implemented

### 1. API-First Approach with Fallback

Implemented a three-tier strategy:

```javascript
// Primary: kaspa.org API (most accurate)
async function getBlockRewardFromAPI() {
    const response = await axios.get('https://api.kaspa.org/info/blockreward');
    return parseFloat(response.data.blockreward); // Returns KAS directly
}

// Fallback: Calculated from DAA score
function calculateBlockReward(daaScore) {
    // Deterministic calculation based on emission schedule
    // Accounts for Chromatic phase, Deflationary phase, and Crescendo hardfork
}
```

### 2. Updated getBlockRewardFromNode()

**Before** (incorrect):
```javascript
// Summed all coinbase outputs (subsidy + fees)
let totalRewardSompi = 0;
for (const output of coinbase.outputs) {
    totalRewardSompi += parseInt(output.amount || 0);
}
return totalRewardSompi / 100000000; // ❌ Returns 34+ KAS
```

**After** (correct):
```javascript
// Try API first, fallback to calculated subsidy
const apiResult = await getBlockRewardFromAPI();
if (apiResult) return apiResult; // ✓ Returns 3.46 KAS

// Fallback to calculated value
const blockReward = calculateBlockReward(daaScore);
return blockReward; // ✓ Returns ~3.46 KAS
```

### 3. Added Optional Detailed Endpoint

For users who want to see the fee breakdown:

```bash
GET /api/kaspa/block/reward-details
```

Returns:
```json
{
  "daaScore": 331709695,
  "blockSubsidy": 3.46,
  "totalCoinbase": 34.65,
  "transactionFees": 31.19,
  "note": "blockSubsidy is the emission-based reward. totalCoinbase includes transaction fees."
}
```

## Technical Details

### Kaspa Block Reward Components

| Component | Value | Description |
|-----------|-------|-------------|
| Block Subsidy | ~3.46 KAS | Emission-based reward (what users expect) |
| Transaction Fees | ~31 KAS | Variable per block |
| Total Coinbase | ~34.65 KAS | What the old code returned |

### API Reference

**kaspa.org Block Reward API**:
```bash
curl https://api.kaspa.org/info/blockreward
# Returns: {"blockreward": 3.46478289}
```

The API returns the value directly in KAS (not sompi).

### Emission Schedule

Kaspa's block reward follows a complex schedule:

1. **Chromatic Phase** (DAA 0 - 15,778,800): Fixed rewards per phase
2. **Deflationary Phase** (DAA 15,778,800+): Continuous decay (halves yearly)
3. **Post-Crescendo** (DAA 110,165,000+): 10x block rate, reward/10 per block

The emission is **time-based**, not DAA-based. After Crescendo, blocks come 10x faster but total emission per second stays the same.

## Files Modified

### services/dashboard/server.js

1. **Added `getBlockRewardFromAPI()`** - Fetches from kaspa.org API
2. **Updated `getBlockRewardFromNode()`** - Uses API first, calculates as fallback
3. **Added `getTotalCoinbaseFromNode()`** - Optional function for detailed analysis
4. **Added `/api/kaspa/block/reward-details`** - New endpoint for fee breakdown

## Testing Results

### Before Fix
```bash
curl http://localhost:8080/api/kaspa/network/enhanced | jq '.currentBlockReward'
# Output: 34.65 ❌
```

### After Fix
```bash
curl http://localhost:8080/api/kaspa/network/enhanced | jq '.currentBlockReward'
# Output: 3.46478289 ✓
```

### Verification Against Reference
```bash
curl https://api.kaspa.org/info/blockreward
# Output: {"blockreward": 3.46478289} ✓
```

### Detailed Endpoint Test
```bash
curl http://localhost:8080/api/kaspa/block/reward-details | jq
# Shows breakdown: subsidy vs fees ✓
```

## Comparison with kaspa.stream

| Metric | kaspa.stream | Dashboard (Before) | Dashboard (After) |
|--------|--------------|-------------------|-------------------|
| Block Reward | 3.46 KAS | 34.65 KAS ❌ | 3.46 KAS ✓ |
| Source | API | Coinbase sum | API + calculated |
| Accuracy | Reference | Wrong | Correct |

## Key Learnings

1. **Coinbase ≠ Block Reward**: In Kaspa, the coinbase transaction output includes both subsidy and fees
2. **Display Subsidy Only**: Users expect "Block Reward" to mean the emission-based subsidy
3. **API is Authoritative**: kaspa.org API provides the most accurate current value
4. **Calculation is Complex**: Post-Crescendo math requires careful handling of time vs DAA
5. **Fallback Strategy**: Always have a calculated fallback when external APIs fail

## DAA Score Clarification

**User Question**: "The DAA value shown in the dashboard also seems to be incorrect. Shouldn't it just be the block height?"

**Answer**: The DAA Score IS Kaspa's equivalent of "block height":

- **DAA Score**: Difficulty Adjustment Algorithm score (blue score of virtual selected parent)
- **Blue Score**: Number of blue blocks in the selected chain from genesis
- **Block Height**: Traditional term; in Kaspa's DAG, DAA Score serves this purpose

Current DAA is ~331M+ after Crescendo hardfork. This is correct.

## Deployment

The dashboard service runs locally via npm, so restart is required:

```bash
# Kill existing process
DASHBOARD_PID=$(lsof -ti:8080 2>/dev/null)
if [ -n "$DASHBOARD_PID" ]; then 
    kill $DASHBOARD_PID
    sleep 2
fi

# Restart dashboard
cd services/dashboard
npm start
```

## Related Documentation

- [Dashboard Self-Contained Network Stats](./DASHBOARD_SELF_CONTAINED_NETWORK_STATS.md)
- [Dashboard Blocks/Hour Fix](./DASHBOARD_BLOCKS_HOUR_FIX.md)
- [Kaspa Emission Schedule](https://kaspa.org/emission)

## Future Enhancements

1. **Cache API responses** to reduce external calls
2. **Improve calculation accuracy** to match API values more closely
3. **Add fee statistics** to show average fees over time
4. **Display emission chart** showing historical block rewards

## Conclusion

The block reward display now correctly shows the emission-based subsidy (~3.46 KAS) instead of the total coinbase payout (~34.65 KAS), matching the reference value from kaspa.stream and kaspa.org API.
