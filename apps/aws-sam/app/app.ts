import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSHandler } from "aws-lambda";
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { BatchWriteCommand, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { AbiCoder, ZeroAddress } from "ethers";

import {
   AlchemyWebhookPayload,
   ArchiveTableItem,
   EndpointIdToChainId,
   NetworkToChainId,
   OrderStatus,
   OrderTableItem,
   SqsEventMessageBody,
   SupportedEvent,
   SupportedEventSig,
   SupportEndpointIds,
   TableNames,
} from "./vendor/@repo/hardhat/script";
// @추후작업 vendor 로 포팅하는 방식을 더 깔끔한 방식으로 바꾸거나, 불필요한 부분까지 복제되는걸 막는 등 작업
import { CustomResponse, division, docClient, sqsClient } from "./utils";

const coder = AbiCoder.defaultAbiCoder();

// sam local invoke EventProducerFunction --event events/EventProducerFunction.json --env-vars env.local.json
export const eventProducer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
   console.log(process.env.NODE_ENV);

   try {
      if (typeof event.body !== "string") throw new Error("The event body must be a string");

      const promiseTask = [];

      const eventBody: AlchemyWebhookPayload = JSON.parse(event.body);
      const batchEntries = [];
      let batchId = 0;

      const supportedEventSigs = Object.values(SupportedEventSig());

      for (const log of eventBody.event.data.block.logs) {
         const isSupported = supportedEventSigs.includes((log.topics[0] as string).toLowerCase());
         if (!isSupported) continue;

         const chainId = NetworkToChainId[eventBody.event.network] || 0; // Unknown chainId is zero
         // const messageId = coder.encode(
         //    ["uint256", "uint256", "bytes32", "uint256"],
         //    [BigInt(chainId), BigInt(eventBody.event.data.block.number), log.topics[0], BigInt(log.transaction.index)],
         // ); // chainId + blockNumber + eventSig + transactionIndex  // 같은 데이터가 아니라면 무조건 유니크해야하는 속성

         const messageBody: SqsEventMessageBody = {
            blockNumber: eventBody.event.data.block.number,
            chainId: chainId,
            timestamp: eventBody.event.data.block.timestamp,
            log,
         };

         batchEntries.push({
            Id: batchId.toString(),
            MessageBody: JSON.stringify(messageBody),
            MessageGroupId: chainId.toString(),
            // MessageDeduplicationId: messageId,
         });

         batchId++;
      }

      if (batchEntries.length > 0) {
         // batch message limit 10
         const divisionEntries = division(batchEntries, 10);
         for (const entries of divisionEntries) {
            const params = {
               QueueUrl: "http://host.docker.internal:4566/000000000000/eventQueue.fifo",
               Entries: entries,
            };
            const command = new SendMessageBatchCommand(params);
            promiseTask.push(sqsClient.send(command));
            // promiseTask.push(new Promise((resolve) => resolve(sqsClient.send(command))));
         }

         await Promise.all(promiseTask);
      }

      return CustomResponse.Created();
   } catch (err) {
      console.error(err);

      return CustomResponse.InternalError();
   }
};

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
