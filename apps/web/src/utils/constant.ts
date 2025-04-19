import { abi } from "@workspace/hardhat/artifacts/contracts/orderBook/OrderBook.lz.sol/OrderBookWithLz.json";
import {
   OrderBook,
   OrderBookInterface,
} from "@workspace/hardhat/typechain-types/contracts/exchange/OrderBook.sol/OrderBook";
import { Abi } from "viem";

export const OrderBookABI = abi;
