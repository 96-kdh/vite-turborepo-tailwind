import { SupportChainIds } from "../constants";
import { SupportNetworks } from "./network";

export interface AlchemyWebhookPayload {
   webhookId: string; // "wh_wclh9c0e3nf3t4wn",
   id: string; // "whevt_1i58wb1ww2u3jzea",
   createdAt: string; //"2025-03-20T12:57:02.661Z",
   type: string; // "GRAPHQL",
   event: AlchemyWebhookPayloadEvent;
}

export interface AlchemyWebhookPayloadEvent {
   data: {
      block: AlchemyWebhookPayloadEventBlockData;
   };
   sequenceNumber: string;
   network: SupportNetworks;
}

export interface SqsEventMessageBody {
   blockNumber: number;
   timestamp: number;
   chainId: SupportChainIds | 0;
   log: AlchemyWebhookPayloadEventLogData;
}

export interface AlchemyWebhookPayloadEventBlockData {
   hash: string;
   number: number;
   timestamp: number;
   logs: AlchemyWebhookPayloadEventLogData[];
}

interface AlchemyWebhookPayloadEventLogData {
   data: string;
   topics: readonly string[];
   index: number;
   account: { address: string }; // emitted event contract address
   transaction: {
      hash: string;
      nonce: number;
      index: number;
      gasPrice: string;
      maxFeePerGas: null;
      maxPriorityFeePerGas: null;
      gas: number;
      status: number;
      gasUsed: number;
      cumulativeGasUsed: number;
      effectiveGasPrice: string;
      createdContract: null;
      from: { address: string }; // msg sender
      to: { address: string }; // execute contract address
   };
}
