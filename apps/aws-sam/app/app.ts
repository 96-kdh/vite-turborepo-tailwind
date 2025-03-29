import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSHandler } from "aws-lambda";
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { AbiCoder, ZeroAddress } from "ethers";

import {
   AlchemyWebhookPayload,
   ArchiveTableItem,
   NetworkToChainId,
   OrderStatus,
   OrderTableItem,
   SqsEventMessageBody,
   SupportedEvent,
   SupportedEventSig,
   TableNames,
} from "@repo/hardhat/script";

import { CustomResponse, division, docClient, sqsClient } from "./utils";

export const eventProducer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
   try {
      if (typeof event.body !== "string") throw new Error("The event body must be a string");

      const promiseTask = [];

      const coder = AbiCoder.defaultAbiCoder();
      const eventBody: AlchemyWebhookPayload = JSON.parse(event.body);
      const batchEntries = [];
      let batchId = 0;

      for (const log of eventBody.event.data.block.logs) {
         const chainId = NetworkToChainId[eventBody.event.network] || 0; // Unknown chainId is zero
         const messageId = coder.encode(
            ["uint256", "uint256", "bytes32", "uint256"],
            [BigInt(chainId), BigInt(eventBody.event.data.block.number), log.topics[0], BigInt(log.transaction.index)],
         ); // chainId + blockNumber + eventSig + transactionIndex

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
            MessageDeduplicationId: messageId,
         });

         batchId++;
      }
      console.log("batchMsg length is ", batchId);

      // batch message limit 10
      const divisionEntries = division(batchEntries, 10);
      for (const entries of divisionEntries) {
         const params = {
            QueueUrl: "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/eventQueue.fifo",
            Entries: entries,
         };
         const command = new SendMessageBatchCommand(params);
         promiseTask.push(new Promise((resolve) => resolve(sqsClient.send(command))));
      }

      await Promise.all(promiseTask);

      return CustomResponse.Created();
   } catch (err) {
      console.error(err);

      return CustomResponse.InternalError();
   }
};

export const eventConsumer: SQSHandler = async (event: SQSEvent): Promise<void> => {
   const coder = AbiCoder.defaultAbiCoder();

   const updateTask = [];
   const batchWriteTask = [];
   const batchWriteCommandData = [];

   for (const record of event.Records) {
      const message: SqsEventMessageBody = JSON.parse(record.body);
      const eventSig = message.log.topics[0];

      if (eventSig === SupportedEventSig()[SupportedEvent.CreateSrcOrder]) {
         const [orderId, maker] = [
            String(coder.decode(["uint256"], message.log.topics[1])[0]),
            coder.decode(["address"], message.log.topics[2])[0].toLowerCase(),
         ];
         const [depositAmount, desiredAmount, dstEid] = coder.decode(
            ["uint256", "uint256", "uint32"],
            message.log.data,
         );

         const orderItem: OrderTableItem = {
            orderId: orderId, // (partition key)
            chainId: Number(message.chainId), // (sort key)
            maker: maker, // (GSI, pk)
            taker: ZeroAddress.toLowerCase(), // (GSI, pk)
            orderStatus: OrderStatus.createOrder, // (GSI, pk)
            createdAt: "", // (GSI, sort key)
            depositAmount: String(depositAmount),
            desiredAmount: String(desiredAmount),
            timelock: 0,
            updatedAt: "",
         };
      } else if (eventSig === SupportedEventSig()[SupportedEvent.UpdateSrcOrder]) {
      } else if (eventSig === SupportedEventSig()[SupportedEvent.CloseSrcOrder]) {
      } else if (eventSig === SupportedEventSig()[SupportedEvent.CreateDstOrder]) {
      } else if (eventSig === SupportedEventSig()[SupportedEvent.UpdateDstOrder]) {
      } else if (eventSig === SupportedEventSig()[SupportedEvent.CloseDstOrder]) {
      } else {
         // throw new Error("Unrecognized event sign");
         console.error("Unrecognized event sign", ", eventSig: ", eventSig, "\n message: ", message);
         continue;
      }

      const archiveItem: ArchiveTableItem = {
         transactionHash: message.log.transaction.hash.toLowerCase(),
         logIndexChainId: coder.encode(
            ["uint256", "uint256"],
            [BigInt(message.log.transaction.index), BigInt(message.chainId)],
         ),
         msgSender: message.log.transaction.from.address.toLowerCase(),
         eventSig: eventSig.toLowerCase(),
         timestamp: Number(message.timestamp),
         chainId: Number(message.chainId),
         contractAddress: message.log.account.address.toLowerCase(),
         topics: message.log.topics,
         data: message.log.data,
      };

      batchWriteCommandData.push({
         PutRequest: {
            Item: archiveItem,
         },
      });

      // const [invitee, amount, reward] = [
      //    coder.decode(["address"], message.log.topics[1]),
      //    coder.decode(["address"], message.log.topics[2]),
      // ];
      // const [invitee, amount, reward] = coder.decode(["address", "uint256", "uint256"], message.log.data);
   }

   if (event.Records.length > 0) {
      // batchWrite limit 25
      const sliceBatchWriteCommandData = division(batchWriteCommandData, 25);

      for (const batchWriteData of sliceBatchWriteCommandData) {
         const batchWriteCommand = new BatchWriteCommand({
            RequestItems: {
               [TableNames.Archive]: batchWriteData,
            },
         });

         batchWriteTask.push(new Promise((resolve) => resolve(docClient.send(batchWriteCommand))));
      }
   }
};
