import { AbiCoder, ZeroAddress } from "ethers";
import { BatchWriteCommand, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { SQSEvent, SQSHandler } from "aws-lambda";

import { division, docClient } from "../utils";
import {
   ArchiveTableItem,
   EndpointIdToChainId,
   OrderStatus,
   OrderTableItem,
   SqsEventMessageBody,
   SupportedEvent,
   SupportedEventSig,
   SupportEndpointIds,
   TableNames,
} from "../../../../packages/hardhat/script";

const coder = AbiCoder.defaultAbiCoder();

function genOrderItemBySqsMsg(message: SqsEventMessageBody): OrderTableItem | null {
   const [orderId, maker] = [
      String(coder.decode(["uint256"], message.log.topics[1])[0]),
      String(coder.decode(["address"], message.log.topics[2])[0]),
   ];
   const taker = message.log.topics[3] ? String(coder.decode(["address"], message.log.topics[3])[0]) : ZeroAddress;

   const eventSig = message.log.topics[0].toLowerCase();

   // not indexed log data parse
   let depositAmount: string, desiredAmount: string, orderStatus: OrderStatus;
   switch (eventSig) {
      case SupportedEventSig()[SupportedEvent.CreateSrcOrder]:
      case SupportedEventSig()[SupportedEvent.CreateDstOrder]: {
         [depositAmount, desiredAmount] = coder
            .decode(["uint256", "uint256", "uint32"], message.log.data)
            .map((v) => String(v));
         orderStatus =
            eventSig === SupportedEventSig()[SupportedEvent.CreateSrcOrder]
               ? OrderStatus.createOrder
               : OrderStatus.createOrderReceive;
         break;
      }
      case SupportedEventSig()[SupportedEvent.UpdateDstOrder]:
      case SupportedEventSig()[SupportedEvent.UpdateSrcOrder]: {
         const [_depositAmount, _desiredAmount, _orderStatus] = coder.decode(
            ["uint256", "uint256", "uint8", "uint32"],
            message.log.data,
         );
         [depositAmount, desiredAmount, orderStatus] = [
            String(_depositAmount),
            String(_desiredAmount),
            Number(_orderStatus),
         ];
         break;
      }
      default:
         return null;
   }

   let chainId: number, dstChainId: number;

   // parse chainId
   switch (eventSig) {
      case SupportedEventSig()[SupportedEvent.CreateSrcOrder]:
      case SupportedEventSig()[SupportedEvent.UpdateSrcOrder]: {
         chainId = message.chainId;
         const [dstEid] = coder.decode(["uint32"], "0x" + message.log.data.slice(-64)).map((v) => Number(v));
         dstChainId = EndpointIdToChainId[dstEid as SupportEndpointIds];
         break;
      }
      case SupportedEventSig()[SupportedEvent.CreateDstOrder]:
      case SupportedEventSig()[SupportedEvent.UpdateDstOrder]: {
         dstChainId = message.chainId;
         const [dstEid] = coder.decode(["uint32"], "0x" + message.log.data.slice(-64)).map((v) => Number(v));
         chainId = EndpointIdToChainId[dstEid as SupportEndpointIds];
         break;
      }
      default:
         return null;
   }

   return {
      orderId,
      chainId,
      maker,
      taker,
      depositAmount,
      desiredAmount,
      orderStatus,
      createdAt: message.timestamp,
      updatedAt: message.timestamp,
      blockNumber: message.blockNumber,
      dstChainId,
   };
}

function genOrderTableUpdateCommand(item: OrderTableItem) {
   const params: UpdateCommandInput = {
      TableName: TableNames.OrderTable,
      Key: {
         orderId: item.orderId,
         chainId: item.chainId,
      },
      UpdateExpression: `
      SET maker = :maker,
          taker = :taker,
          orderStatus = :orderStatus,
          createdAt = :createdAt,
          depositAmount = :depositAmount,
          desiredAmount = :desiredAmount,
          updatedAt = :updatedAt,
          blockNumber = :blockNumber,
          dstChainId = :dstChainId
    `,
      ConditionExpression: "attribute_not_exists(orderStatus) OR orderStatus < :orderStatus",
      ExpressionAttributeValues: {
         ":maker": item.maker,
         ":taker": item.taker,
         ":orderStatus": item.orderStatus,
         ":createdAt": item.createdAt,
         ":depositAmount": item.depositAmount,
         ":desiredAmount": item.desiredAmount,
         ":updatedAt": item.updatedAt,
         ":blockNumber": item.blockNumber,
         ":dstChainId": item.dstChainId,
      },
   };
   return new UpdateCommand(params);
}

// sam local invoke EventConsumerFunction --event events/EventConsumerFunction.json --env-vars env.local.json
export const eventConsumer: SQSHandler = async (event: SQSEvent): Promise<void> => {
   console.log("eventConsumer process.env.NODE_ENV: ", process.env.NODE_ENV);

   const archiveTableBatchWriteCommandData = [];
   const archiveTableBatchWriteTask = [];

   const orderTableUpdateTask = [];
   const orderItems = [];

   for (const record of event.Records) {
      const message: SqsEventMessageBody = JSON.parse(record.body);
      const eventSig = message.log.topics[0].toLowerCase();

      const orderItem = genOrderItemBySqsMsg(message);
      orderItems.push(orderItem);
      if (!orderItem) {
         console.error("Unrecognized event sign", ", eventSig: ", eventSig, "\n message: ", message);
         continue;
      }

      const command = genOrderTableUpdateCommand(orderItem);
      orderTableUpdateTask.push(docClient.send(command));

      const archiveItem: ArchiveTableItem = {
         transactionHash: message.log.transaction.hash,
         logIndexChainId: coder.encode(
            ["uint256", "uint256"],
            [BigInt(message.log.transaction.index), BigInt(message.chainId)],
         ),
         msgSender: message.log.transaction.from.address,
         eventSig: eventSig,
         timestamp: Number(message.timestamp),
         chainId: Number(message.chainId),
         contractAddress: message.log.account.address,
         topics: message.log.topics,
         data: message.log.data,
      };

      archiveTableBatchWriteCommandData.push({
         PutRequest: {
            Item: archiveItem,
         },
      });
   }

   // batchWrite limit 25
   const sliceBatchWriteCommandData = division(archiveTableBatchWriteCommandData, 25);
   for (const batchWriteData of sliceBatchWriteCommandData) {
      const batchWriteCommand = new BatchWriteCommand({
         RequestItems: {
            [TableNames.Archive]: batchWriteData,
         },
      });

      archiveTableBatchWriteTask.push(docClient.send(batchWriteCommand));
   }

   const results = await Promise.allSettled([...orderTableUpdateTask, ...archiveTableBatchWriteTask]);
   for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
         console.error("status is rejected, ", result);
         console.log("error item is: ", i < orderTableUpdateTask.length ? orderItems[i] : archiveTableBatchWriteTask);
         console.log(`results length is ${results.length}, error index is ${i}`);
      }
   }
};
