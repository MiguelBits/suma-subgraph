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

  // Set user field to sender's address
  let senderId = event.params.sender.toHex();
  swap.user = senderId;

  // User entity logic (optional, if you track user stats)
  let sender = User.load(senderId);
  if (!sender) {
    sender = new User(senderId);
    sender.totalLiquidityTraded = BigInt.zero();
  }
  sender.totalLiquidityTraded = sender.totalLiquidityTraded.plus(event.params.amount0.abs()).plus(event.params.amount1.abs());
  sender.save();

  swap.save();
}