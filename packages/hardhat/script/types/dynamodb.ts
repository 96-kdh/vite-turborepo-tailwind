export interface ArchiveTableItem {
   msgSender: string; // (partition key)
   encodedCompositeKey: string; // (sort key)

   chainId: number; // (LSI, sort key)
   timestamp: number; // (LSI, sort key)

   transactionHash: string;
   eventSig: string;
   contractAddress: string;
   topics: readonly string[];
   data: string;
}

export interface OrderTableItem {
   orderStatus: OrderStatus; // (partition key)
   encodedCompositeKey: string; // (sort key)

   chainId: number; // (LSI, sort key)
   dstChainId: number; // (LSI, sort key)
   maker: string; // (LSI, sort key)
   createdAt: number; // (LSI, sort key)

   orderId: string;
   taker: string;
   depositAmount: string;
   desiredAmount: string;

   updatedAt: number;
   blockNumber: number;
}

export enum OrderStatus {
   // no = 0,
   optimisticOrder = 0,

   createOrder = 1,
   createOrderReceive = 2,
   executeOrder = 3,
   executeOrderReceive = 4,
   claim = 5,
   claimReceive = 6,
   canceled = 7,
   canceledReceive = 8,
}
