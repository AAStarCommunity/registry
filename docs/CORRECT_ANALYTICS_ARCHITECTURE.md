# 正确的Analytics查询架构

## 核心理念

### 查询层级
```
SuperPaymaster Registry (链上注册中心)
    ↓ 查询: getActivePaymasters()
    ├─ Paymaster 1 (地址)
    │   └─ GasPaymentProcessed 事件
    ├─ Paymaster 2 (地址)  
    │   └─ GasPaymentProcessed 事件
    └─ ... 更多Paymaster
```

## 1. 数据获取策略

### 1.1 从Registry获取Paymaster列表

```javascript
const REGISTRY_ADDRESS = '0x838da93c815a6E45Aa50429529da9106C0621eF0';
const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

// 获取所有活跃的Paymaster
const paymasters = await registry.getActivePaymasters();
// 结果: ['0x9091...', '0xBC56...', ... 共7个]
```

### 1.2 分块查询每个Paymaster的事件

```javascript
for (const paymasterAddress of paymasters) {
  const contract = new ethers.Contract(paymasterAddress, PAYMASTER_ABI, provider);
  
  // 分10个区块一块查询(Alchemy免费层限制)
  for (let start = fromBlock; start <= toBlock; start += 10) {
    const end = Math.min(start + 9, toBlock);
    const events = await contract.queryFilter(
      contract.filters.GasPaymentProcessed(),
      start,
      end
    );
    
    // 每个事件立即缓存
    events.forEach(event => cacheEvent(event));
    
    await sleep(200); // 避免速率限制
  }
}
```

## 2. 缓存策略(核心)

### 2.1 localStorage结构

```javascript
// 缓存key结构
const CACHE_KEYS = {
  PAYMASTERS: 'analytics_paymasters',           // Paymaster列表
  EVENTS: 'analytics_events',                   // 所有事件(按区块组织)
  BLOCK_RANGES: 'analytics_queried_blocks',     // 已查询的区块范围
  STATS: 'analytics_computed_stats',            // 预计算的统计数据
  LAST_SYNC: 'analytics_last_sync_time'         // 最后同步时间
};

// 事件缓存结构(按区块号分片)
{
  "9408600": [
    {
      "paymasterAddress": "0xBC56...",
      "transactionHash": "0x711a...",
      "blockNumber": 9408600,
      "user": "0x8135...",
      "gasToken": "0xD14E...",
      "actualGasCost": "80800000000000",
      "pntAmount": "18543600000000000000",
      "timestamp": 1728912000
    },
    ... more events in this block
  ],
  "9408601": [...],
  ...
}

// 已查询区块范围(避免重复查询)
{
  "0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445": {
    "queriedRanges": [
      {"from": 9408600, "to": 9408800, "queriedAt": 1728912345}
    ]
  },
  ... other paymasters
}
```

### 2.2 缓存更新逻辑

```javascript
function shouldQueryBlock(paymasterAddress, blockNumber) {
  const ranges = getQueriedRanges(paymasterAddress);
  
  // 检查这个区块是否已经查询过
  return !ranges.some(range => 
    blockNumber >= range.from && blockNumber <= range.to
  );
}

function cacheEvent(event, paymasterAddress) {
  const blockKey = event.blockNumber.toString();
  const cache = loadFromCache(CACHE_KEYS.EVENTS) || {};
  
  if (!cache[blockKey]) {
    cache[blockKey] = [];
  }
  
  // 检查是否已存在(按txHash去重)
  const exists = cache[blockKey].some(e => 
    e.transactionHash === event.transactionHash
  );
  
  if (!exists) {
    cache[blockKey].push({
      paymasterAddress,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      user: event.args.user,
      gasToken: event.args.gasToken,
      actualGasCost: event.args.actualGasCost.toString(),
      pntAmount: event.args.pntAmount.toString(),
      timestamp: await getBlockTimestamp(event.blockNumber)
    });
    
    saveToCache(CACHE_KEYS.EVENTS, cache);
  }
}
```

## 3. 统计数据计算

### 3.1 从缓存计算(不从链上查)

```javascript
function computeStatistics() {
  const eventsCache = loadFromCache(CACHE_KEYS.EVENTS) || {};
  
  // 展平所有事件
  const allEvents = Object.values(eventsCache).flat();
  
  // 计算总量
  const stats = {
    totalOperations: allEvents.length,
    totalGasSponsored: allEvents.reduce((sum, e) => 
      sum + BigInt(e.actualGasCost), 0n
    ),
    totalPntPaid: allEvents.reduce((sum, e) => 
      sum + BigInt(e.pntAmount), 0n
    ),
    uniqueUsers: new Set(allEvents.map(e => e.user.toLowerCase())).size,
    
    // 按Paymaster分组
    byPaymaster: groupBy(allEvents, 'paymasterAddress'),
    
    // 按用户分组
    byUser: groupBy(allEvents, 'user'),
    
    // 按日期分组
    byDate: groupByDate(allEvents)
  };
  
  // 缓存计算结果
  saveToCache(CACHE_KEYS.STATS, stats);
  
  return stats;
}
```

### 3.2 按用户查询(从缓存过滤)

```javascript
function getUserTransactions(userAddress) {
  const eventsCache = loadFromCache(CACHE_KEYS.EVENTS) || {};
  const allEvents = Object.values(eventsCache).flat();
  
  // 直接从缓存过滤
  return allEvents.filter(e => 
    e.user.toLowerCase() === userAddress.toLowerCase()
  );
}
```

## 4. 增量同步策略

### 4.1 定期同步新区块

```javascript
async function syncNewBlocks() {
  const paymasters = loadFromCache(CACHE_KEYS.PAYMASTERS);
  const currentBlock = await provider.getBlockNumber();
  
  for (const pm of paymasters) {
    const lastQueriedBlock = getLastQueriedBlock(pm.address);
    const fromBlock = lastQueriedBlock + 1;
    const toBlock = currentBlock;
    
    // 只查询未查询的区块
    if (fromBlock <= toBlock) {
      await queryAndCacheEvents(pm.address, fromBlock, toBlock);
    }
  }
  
  // 重新计算统计
  computeStatistics();
}

// 每5分钟同步一次
setInterval(syncNewBlocks, 5 * 60 * 1000);
```

## 5. 未来KV同步接口

### 5.1 数据结构设计

```typescript
// KV存储键值对
interface KVStore {
  // Paymaster列表
  'paymasters:list': string[];  // 所有Paymaster地址
  
  // 事件存储(按区块分片)
  `events:block:{blockNumber}`: Event[];
  
  // 已查询范围
  `queried:paymaster:{address}`: QueriedRange[];
  
  // 预计算统计
  'stats:global': GlobalStats;
  'stats:paymaster:{address}': PaymasterStats;
  'stats:user:{address}': UserStats;
}

// 同步接口
interface SyncAPI {
  // 上传本地缓存到KV
  uploadCache(): Promise<void>;
  
  // 从KV下载到本地
  downloadCache(): Promise<void>;
  
  // 增量同步(只同步差异)
  incrementalSync(): Promise<void>;
}
```

### 5.2 同步流程

```javascript
async function syncWithKV() {
  // 1. 获取KV最后同步时间
  const kvLastSync = await kv.get('analytics:last_sync');
  const localLastSync = loadFromCache(CACHE_KEYS.LAST_SYNC);
  
  if (localLastSync > kvLastSync) {
    // 本地更新,上传到KV
    await uploadLocalCacheToKV();
  } else if (kvLastSync > localLastSync) {
    // KV更新,下载到本地
    await downloadKVCacheToLocal();
  }
  
  // 2. 同步后重新计算统计
  computeStatistics();
}
```

## 6. 实现优先级

### Phase 1 (当前)
- [x] 查询单个PaymasterV4的事件 ✅
- [x] 基础localStorage缓存 ✅
- [ ] **从Registry获取所有Paymaster** ← 下一步
- [ ] **为每个Paymaster分块查询事件**
- [ ] **完善缓存策略(永久缓存已查询区块)**

### Phase 2 (优化)
- [ ] 实现增量同步(只查新区块)
- [ ] 按用户地址从缓存过滤
- [ ] 预计算统计数据并缓存

### Phase 3 (KV同步)
- [ ] 设计KV同步接口
- [ ] 实现上传/下载逻辑
- [ ] 冲突解决策略

## 7. 当前实现的问题

### 当前代码的错误:
1. ❌ 只查询了PaymasterV4,忽略了其他6个Paymaster
2. ❌ 缓存策略不对:每次刷新会重新查询历史区块
3. ❌ 没有从Registry获取Paymaster列表
4. ❌ 统计数据计算逻辑混乱

### 需要修改:
1. ✅ 先从Registry.getActivePaymasters()获取所有Paymaster
2. ✅ 为每个Paymaster分别缓存查询范围
3. ✅ 永久缓存已查询的区块,不重复查询
4. ✅ 所有统计数据从缓存计算,不从链上查询

---

**下一步行动:**
1. 修改`useGasAnalytics.ts`先查询Registry
2. 实现多Paymaster并行查询
3. 完善缓存策略(按Paymaster分片)
4. 从缓存计算统计而不是从事件计算
