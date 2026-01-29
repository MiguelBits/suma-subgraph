import { Swap as SwapEvent } from "../generated/SumaBtcPool/PoolABI";
import { Swap as SwapEntity, Pool, User } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleSwap(event: SwapEvent): void {
  let pool = Pool.load(event.address.toHex());
  if (!pool) {
    pool = new Pool(event.address.toHex());
    pool.save();
  }

  let swap = new SwapEntity(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  swap.pool = pool.id;
  swap.sender = event.params.sender;
  swap.recipient = event.params.recipient;
  swap.amount0 = event.params.amount0;
  swap.amount1 = event.params.amount1;
  swap.timestamp = event.block.timestamp;

  // Set user field to recipient (actual user receiving the swap)
  let userId = event.params.recipient.toHex();
  swap.user = userId;

  // User entity logic (tracks actual user stats)
  let user = User.load(userId);
  if (!user) {
    user = new User(userId);
    user.totalLiquidityTraded = BigInt.zero();
    user.swapCount = BigInt.zero();
  }
  user.totalLiquidityTraded = user.totalLiquidityTraded.plus(event.params.amount0.abs()).plus(event.params.amount1.abs());
  user.swapCount = user.swapCount.plus(BigInt.fromI32(1));
  user.save();

  swap.save();
}