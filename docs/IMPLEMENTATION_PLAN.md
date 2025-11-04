# Phase 1 Analytics - 正确实现计划

## 当前状态分析

### 现有问题 ❌
1. 只查询了PaymasterV4 (0xBC56...),忽略了Registry中注册的其他6个Paymaster
2. 每次刷新都重新查询历史区块(9408600-9408800),没有真正的持久化缓存
3. 没有按Paymaster分片缓存
4. 14笔交易全部来自PaymasterV4,其他6个Paymaster可能也有交易

### Registry当前状态 ✅
- 地址: `0x838da93c815a6E45Aa50429529da9106C0621eF0`
- 注册的Paymaster数: **7个**
- PaymasterV4在列表中: **是**

## 实现步骤

### Step 1: 修改useGasAnalytics获取Paymaster列表

```typescript
// src/hooks/useGasAnalytics.ts

const REGISTRY_ABI = [
  "function getActivePaymasters() external view returns (address[])"
];

const PAYMASTER_ABI = [
  "event GasPaymentProcessed(address indexed user, address indexed gasToken, uint256 actualGasCost, uint256 pntAmount)"
];

async function fetchGasAnalytics() {
  // 1. 从Registry获取所有Paymaster
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  const paymasters = await registry.getActivePaymasters();
  
  console.log(`Found ${paymasters.length} Paymasters from Registry`);
  
  // 2. 加载缓存
  const cache = loadEventsCache(); // 按Paymaster地址组织
  
  // 3. 为每个Paymaster查询事件
  for (const pmAddress of paymasters) {
    await queryPaymasterEvents(pmAddress, cache);
  }
  
  // 4. 从缓存计算统计
  const stats = computeStatsFromCache(cache);
  
  return stats;
}
```

### Step 2: 实现分Paymaster缓存

```typescript
interface EventsCache {
  [paymasterAddress: string]: {
    events: Event[];
    queriedRanges: Array<{from: number, to: number, queriedAt: number}>;
  };
}

function loadEventsCache(): EventsCache {
  const cached = localStorage.getItem('analytics_events_by_paymaster');
  return cached ? JSON.parse(cached) : {};
}

function saveEventsCache(cache: EventsCache) {
  localStorage.setItem('analytics_events_by_paymaster', JSON.stringify(cache));
}
```

### Step 3: 智能查询(只查未缓存的区块)

```typescript
async function queryPaymasterEvents(
  paymasterAddress: string,
  cache: EventsCache
) {
  const pmCache = cache[paymasterAddress] || {
    events: [],
    queriedRanges: []
  };
  
  // 找出需要查询的区块范围
  const toQuery = findUnqueriedRanges(
    pmCache.queriedRanges,
    HISTORICAL_FROM_BLOCK,
    HISTORICAL_TO_BLOCK
  );
  
  if (toQuery.length === 0) {
    console.log(`${paymasterAddress}: all blocks cached`);
    return;
  }
  
  // 查询未缓存的区块
  for (const range of toQuery) {
    const events = await queryRange(paymasterAddress, range.from, range.to);
    pmCache.events.push(...events);
    pmCache.queriedRanges.push({
      from: range.from,
      to: range.to,
      queriedAt: Date.now()
    });
  }
  
  cache[paymasterAddress] = pmCache;
  saveEventsCache(cache);
}
```

### Step 4: 从缓存计算统计

```typescript
function computeStatsFromCache(cache: EventsCache): GasAnalytics {
  // 合并所有Paymaster的事件
  const allEvents = Object.values(cache)
    .flatMap(pm => pm.events);
  
  // 计算统计
  const stats = {
    totalOperations: allEvents.length,
    totalGasSponsored: allEvents.reduce((sum, e) => 
      sum + BigInt(e.actualGasCost), 0n
    ),
    // ... 其他统计
    
    // 按Paymaster分组
    byPaymaster: Object.entries(cache).map(([address, data]) => ({
      address,
      operations: data.events.length,
      totalGas: data.events.reduce(...)
    }))
  };
  
  return stats;
}
```

## 预期结果

### 第一次加载
- 查询7个Paymaster的事件(9408600-9408800)
- 可能找到 > 14笔交易(如果其他Paymaster也有交易)
- 全部缓存到localStorage

### 后续刷新
- 检查缓存,发现9408600-9408800已查询
- 只查询新区块(9408800-当前区块)
- 合并到缓存

### 用户查询
- 直接从缓存过滤
- 不查询链上

## 当前任务

**现在需要做的:**
1. ✅ 创建实现计划文档
2. ⏳ 修改useGasAnalytics.ts实现Registry查询
3. ⏳ 测试能否找到所有7个Paymaster的交易
4. ⏳ 验证缓存策略正确性

**预计发现:**
- PaymasterV4: 14笔交易(已知)
- 其他6个Paymaster: ?笔交易(待查询)
- **总计可能 > 14笔**
