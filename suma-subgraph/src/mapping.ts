import { Swap as SwapEvent } from "../generated/Pool1/PoolABI";
import { PoolABI } from "../generated/Pool1/PoolABI";
import { ERC20 } from "../generated/Pool1/ERC20";
import { Swap as SwapEntity, Pool, User, Token } from "../generated/schema";
import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";

// Constants for decimal conversion
let ZERO_BD = BigDecimal.fromString("0");
let ONE_BI = BigInt.fromI32(1);

// Helper function to convert BigInt exponent to BigDecimal divisor
function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

// Convert BigInt to BigDecimal with decimal normalization
function convertTokenToDecimal(tokenAmount: BigInt, decimals: i32): BigDecimal {
  if (decimals == 0) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(decimals));
}

// Fetch token info from contract or return defaults
function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let symbolResult = contract.try_symbol();
  if (!symbolResult.reverted) {
    return symbolResult.value;
  }
  return "UNKNOWN";
}

function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let nameResult = contract.try_name();
  if (!nameResult.reverted) {
    return nameResult.value;
  }
  return "Unknown Token";
}

function fetchTokenDecimals(tokenAddress: Address): i32 {
  let contract = ERC20.bind(tokenAddress);
  let decimalsResult = contract.try_decimals();
  if (!decimalsResult.reverted) {
    return decimalsResult.value;
  }
  // Default to 18 decimals if call fails
  return 18;
}

// Get or create Token entity
function getOrCreateToken(tokenAddress: Address): Token {
  let tokenId = tokenAddress.toHex();
  let token = Token.load(tokenId);
  
  if (token === null) {
    token = new Token(tokenId);
    token.symbol = fetchTokenSymbol(tokenAddress);
    token.name = fetchTokenName(tokenAddress);
    token.decimals = fetchTokenDecimals(tokenAddress);
    token.save();
  }
  
  return token;
}

// Get or create Pool entity with token info
function getOrCreatePool(poolAddress: Address): Pool {
  let poolId = poolAddress.toHex();
  let pool = Pool.load(poolId);
  
  if (pool === null) {
    pool = new Pool(poolId);
    
    // Fetch token addresses from pool contract
    let poolContract = PoolABI.bind(poolAddress);
    
    let token0Address = poolContract.token0();
    let token1Address = poolContract.token1();
    
    // Create or get token entities
    let token0 = getOrCreateToken(token0Address);
    let token1 = getOrCreateToken(token1Address);
    
    pool.token0 = token0.id;
    pool.token1 = token1.id;
    pool.save();
  }
  
  return pool;
}

export function handleSwap(event: SwapEvent): void {
  // Get or create pool with token info
  let pool = getOrCreatePool(event.address);
  
  // Load tokens to get decimals
  let token0 = Token.load(pool.token0)!;
  let token1 = Token.load(pool.token1)!;
  
  // Normalize amounts by token decimals
  let amount0Abs = event.params.amount0.abs();
  let amount1Abs = event.params.amount1.abs();
  
  let amount0Normalized = convertTokenToDecimal(amount0Abs, token0.decimals);
  let amount1Normalized = convertTokenToDecimal(amount1Abs, token1.decimals);

  // Create swap entity
  let swap = new SwapEntity(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  swap.pool = pool.id;
  swap.sender = event.params.sender;
  swap.recipient = event.params.recipient;
  swap.amount0 = event.params.amount0;
  swap.amount1 = event.params.amount1;
  swap.amount0Normalized = amount0Normalized;
  swap.amount1Normalized = amount1Normalized;
  swap.timestamp = event.block.timestamp;

  // Set user field to transaction origin (actual wallet that initiated the tx)
  let userId = event.transaction.from.toHex();
  swap.user = userId;

  // User entity logic (tracks actual user stats)
  let user = User.load(userId);
  if (!user) {
    user = new User(userId);
    user.totalLiquidityTraded = ZERO_BD;
    user.swapCount = BigInt.zero();
  }
  
  // Add normalized amounts to total (both tokens contribute equally regardless of decimals)
  user.totalLiquidityTraded = user.totalLiquidityTraded.plus(amount0Normalized).plus(amount1Normalized);
  user.swapCount = user.swapCount.plus(ONE_BI);
  user.save();

  swap.save();
}
