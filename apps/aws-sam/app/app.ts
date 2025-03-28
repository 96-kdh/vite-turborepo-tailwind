import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSHandler } from "aws-lambda";
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { AbiCoder } from "ethers";

import {
   AlchemyWebhookPayload,
   NetworkToChainId,
   SqsEventMessageBody,
   TableNames,
   ArchiveTableItem,
   OrderTableItem,
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

      const logIndexChainId = coder.encode(
         ["uint256", "uint256"],
         [BigInt(message.log.transaction.index), BigInt(message.chainId)],
      );

      // const [invitee, amount, reward] = [
      //    coder.decode(["address"], message.log.topics[1]),
      //    coder.decode(["address"], message.log.topics[2]),
      // ];
      // const [invitee, amount, reward] = coder.decode(["address", "uint256", "uint256"], message.log.data);

      const archiveItem: ArchiveTableItem = {
         transactionHash: message.log.transaction.hash,
         logIndexChainId: logIndexChainId,
         msgSender: message.log.transaction.from.address,
         eventSig: message.log.topics[0],
         timestamp: message.timestamp,
         chainId: message.chainId,
         contractAddress: message.log.account.address,
         topics: message.log.topics,
         data: message.log.data,
      };

      batchWriteCommandData.push({
         PutRequest: {
            Item: archiveItem,
         },
      });
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
