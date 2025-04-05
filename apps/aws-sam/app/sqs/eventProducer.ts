import { AbiCoder } from "ethers";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import {
   AlchemyWebhookPayload,
   NetworkToChainId,
   SqsEventMessageBody,
   SupportedEventSig,
} from "../vendor/@repo/hardhat/script";
// @추후작업 vendor 로 포팅하는 방식을 더 깔끔한 방식으로 바꾸거나, 불필요한 부분까지 복제되는걸 막는 등 작업
import { CustomResponse, division, sqsClient } from "../utils";
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";

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
