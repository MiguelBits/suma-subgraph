# Subgraph Queries Documentation

## Endpoint

```
https://api.goldsky.com/api/public/project_YOUR_PROJECT_ID/subgraphs/poap-subgraph/1.0.0/gn
```

---

## Entities

### User
| Field | Type | Description |
|-------|------|-------------|
| `id` | ID | Wallet address (lowercase) |
| `totalLiquidityTraded` | BigInt | Sum of all swap amounts (amount0 + amount1) |
| `swaps` | [Swap] | All swaps by this user |

### Swap
| Field | Type | Description |
|-------|------|-------------|
| `id` | ID | Transaction hash + log index |
| `pool` | Pool | Pool where swap occurred |
| `sender` | Bytes | Address that initiated the swap |
| `recipient` | Bytes | Address that received the output |
| `amount0` | BigInt | Amount of token0 swapped |
| `amount1` | BigInt | Amount of token1 swapped |
| `timestamp` | BigInt | Block timestamp |
| `user` | User | User who made the swap |

### Pool
| Field | Type | Description |
|-------|------|-------------|
| `id` | ID | Pool contract address |
| `swaps` | [Swap] | All swaps in this pool |

---

## Queries

### 1. Leaderboard (Top Users by Swap Volume)

```graphql
query GetLeaderboard($first: Int!, $skip: Int!) {
  users(
    first: $first
    skip: $skip
    orderBy: totalLiquidityTraded
    orderDirection: desc
  ) {
    id
    totalLiquidityTraded
  }
}
```

**Variables:**
```json
{
  "first": 100,
  "skip": 0
}
```

---

### 2. Get Single User Stats

```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    totalLiquidityTraded
    swaps(first: 10, orderBy: timestamp, orderDirection: desc) {
      id
      amount0
      amount1
      timestamp
      pool {
        id
      }
    }
  }
}
```

**Variables:**
```json
{
  "userId": "0xYOUR_ADDRESS_HERE"
}
```

> **Note:** User ID must be lowercase address

---

### 3. Get User Rank

First, get the user's `totalLiquidityTraded`, then count users above:

```graphql
query GetUserRank($liquidity: BigInt!) {
  users(where: { totalLiquidityTraded_gt: $liquidity }) {
    id
  }
}
```

**Variables:**
```json
{
  "liquidity": "1000000000000000000"
}
```

**Rank = result.length + 1**

---

### 4. Recent Swaps

```graphql
query GetRecentSwaps($first: Int!) {
  swaps(first: $first, orderBy: timestamp, orderDirection: desc) {
    id
    sender
    recipient
    amount0
    amount1
    timestamp
    pool {
      id
    }
    user {
      id
      totalLiquidityTraded
    }
  }
}
```

**Variables:**
```json
{
  "first": 20
}
```

---

### 5. Pool Statistics

```graphql
query GetPoolStats($poolId: ID!) {
  pool(id: $poolId) {
    id
    swaps(first: 100, orderBy: timestamp, orderDirection: desc) {
      id
      sender
      amount0
      amount1
      timestamp
    }
  }
}
```

**Variables:**
```json
{
  "poolId": "0x172d2ab563afdaace7247a6592ee1be62e791165"
}
```

---

### 6. All Pools Overview

```graphql
query GetAllPools {
  pools(first: 10) {
    id
    swaps(first: 5, orderBy: timestamp, orderDirection: desc) {
      id
      sender
      amount0
      amount1
    }
  }
}
```

---

### 7. User Swap History (Paginated)

```graphql
query GetUserSwapHistory($userId: ID!, $first: Int!, $skip: Int!) {
  user(id: $userId) {
    id
    totalLiquidityTraded
    swaps(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      amount0
      amount1
      timestamp
      pool {
        id
      }
    }
  }
}
```

**Variables:**
```json
{
  "userId": "0xYOUR_ADDRESS_HERE",
  "first": 10,
  "skip": 0
}
```

---

### 8. Swaps by Time Range

```graphql
query GetSwapsByTimeRange($startTime: BigInt!, $endTime: BigInt!) {
  swaps(
    where: { timestamp_gte: $startTime, timestamp_lte: $endTime }
    orderBy: timestamp
    orderDirection: desc
    first: 100
  ) {
    id
    sender
    amount0
    amount1
    timestamp
    pool {
      id
    }
  }
}
```

**Variables:**
```json
{
  "startTime": "1700000000",
  "endTime": "1710000000"
}
```

---

### 9. Top Users in a Specific Pool

```graphql
query GetTopUsersByPool($poolId: ID!, $first: Int!) {
  swaps(
    where: { pool: $poolId }
    first: $first
    orderBy: timestamp
    orderDirection: desc
  ) {
    sender
    amount0
    amount1
    user {
      id
      totalLiquidityTraded
    }
  }
}
```

---

## Tracked Pools (Citrea Mainnet)

| Pool | Address |
|------|---------|
| Pool1 | `0x172d2ab563afdaace7247a6592ee1be62e791165` |
| Pool2 | `0x5d4b518984ae9778479ee2ea782b9925bbf17080` |
| Pool3 | `0xaea5cf09209631b6a3a69d5798034e2efdbe2cc8` |
| Pool4 | `0xb22325fe6e033c6b7cefb7bc69c9650ffdc691f9` |
| Pool5 | `0xa82eee40f1c88d773c93771d5b1fac61db311945` |

---

## Points System Mapping

| Metric | Subgraph Field | Currently Tracked |
|--------|---------------|-------------------|
| Swap Volume | `user.totalLiquidityTraded` | ✅ Yes |
| Liquidity Provided | - | ❌ No (needs Mint events) |
| Referrals | - | ❌ No (off-chain) |

---

## Example: Fetch with JavaScript

```javascript
const SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_YOUR_PROJECT_ID/subgraphs/poap-subgraph/1.0.0/gn";

async function querySubgraph(query, variables = {}) {
  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);
  return data;
}

// Usage
const leaderboard = await querySubgraph(`
  {
    users(first: 100, orderBy: totalLiquidityTraded, orderDirection: desc) {
      id
      totalLiquidityTraded
    }
  }
`);
```
