export enum TableNames {
   Archive = "Archive",
   Order = "Order",
}

export interface ArchiveTableItem {
   transactionHash: string; // (partition key)
   logIndexChainId: string; // (sort key)

   msgSender: string; // (GSI, pk)
   eventSig: string; // (GSI, pk)
   timestamp: number; // (GSI, sort key)

   chainId: number;
   contractAddress: string;
   topics: string[];
   data: string;
}

export interface OrderTableItem {
   orderId: string; // (partition key)
   chainId: number; // (sort key)

   maker: string; // (GSI, pk)
   taker: string; // (GSI, pk)
   orderStatus: string; // (GSI, pk)
   createdAt: number; // (GSI, sort key)

   depositAmount: string;
   desiredAmount: string;
   timelock: number;
   updatedAt: number;
   transactionHashes: string[];
}
