export interface ArchiveTableItem {
   transactionHash: string; // (partition key)
   logIndexChainId: string; // (sort key)

   msgSender: string; // (GSI, pk)
   eventSig: string; // (GSI, pk)
   timestamp: number; // (GSI, sort key)

   chainId: number;
   contractAddress: string;
   topics: readonly string[];
   data: string;
}

export interface OrderTableItem {
   orderId: string; // (partition key)
   chainId: number; // (sort key)

   maker: string; // (GSI, pk)
   taker: string; // (GSI, pk)
   orderStatus: OrderStatus; // (GSI, pk)
   createdAt: number; // (GSI, sort key)

   depositAmount: string;
   desiredAmount: string;
   timelock: number;
   updatedAt: number;
}

export interface ErrorTableItem {
   functionName: string; // (partition key)
   createdAtIndex: string; // (sort key), ex) '1743164108, 1' or '1743164108, 2'
   errorMsg: string;
   task: string;
}

export enum OrderStatus {
   no = 0,
   createOrder = 1,
   createOrderLzReceive = 2,
   executeOrder = 3,
   executeOrderLzReceive = 4,
   claim = 5,
   claimLzReceive = 6,
   canceled = 7,
   canceledLzReceive = 8,
}
