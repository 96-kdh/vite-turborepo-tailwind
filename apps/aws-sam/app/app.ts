import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSHandler } from "aws-lambda";
import { AlchemyWebhookPayload } from "@repo/hardhat/script/types";
import { docClient, sqsClient } from "./utils";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

// http://localhost:4000/event post
export const eventWebHook = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
   try {
      if (typeof event.body !== "string") throw new Error("The event body must be a string");

      console.log("run eventWebHook");

      const messageBody = event.body;
      const params = {
         QueueUrl: "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/eventQueue.fifo",
         MessageBody: messageBody,
         MessageGroupId: "default", // 여러 그룹이 있다면 적절한 그룹 ID 지정
         MessageDeduplicationId: "randomUUID()", // 중복 제거를 위한 고유 ID
      };
      const command = new SendMessageCommand(params);
      await sqsClient.send(command);

      console.log("end eventWebHook");

      return {
         statusCode: 200,
         headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
         },
         body: JSON.stringify({
            message: "ok",
         }),
      };
   } catch (err) {
      console.log(err);
      return {
         statusCode: 500,
         headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
         },
         body: JSON.stringify({
            message: "some error happened",
         }),
      };
   }
};

export const sqsHandler: SQSHandler = async (event: SQSEvent): Promise<void> => {
   console.log("run sqsHandler");

   for (const record of event.Records) {
      try {
         // SQS 메시지 본문은 문자열이므로, JSON 파싱 (필요한 경우)
         const message: AlchemyWebhookPayload = JSON.parse(record.body);
         console.log("수신된 메시지:", message);

         const item = {
            transactionHash: message.event.data.block.logs[0].transaction.hash,
            logIndexChainId: "0x22222",
            msgSender: message.event.data.block.logs[0].account.address,
            eventSig: message.event.data.block.logs[0].topics[0],
            timestamp: message.event.data.block.timestamp,
            chainId: 123333,
            contractAddress: message.event.data.block.logs[0].account.address,
            topics: message.event.data.block.logs[0].topics,
            data: message.event.data.block.logs[0].data,
         };

         console.log("item: ", item);

         const command = new PutCommand({
            TableName: "Archive",
            Item: item,
         });
         await docClient.send(command);

         // 여기에 DynamoDB 등에 데이터를 저장하는 로직을 추가할 수 있습니다.
         // 예: await ddbDocClient.send(new PutCommand({ TableName: process.env.DYNAMODB_TABLE, Item: message }));
      } catch (error) {
         console.error("메시지 처리 오류 (messageId:", record.messageId, "):", error);
         // 오류가 발생하면 throw를 하지 않으면 해당 메시지는 재처리되지 않습니다.
         // 재처리가 필요하다면 throw error; 를 사용하세요.
      }
   }

   console.log("end sqsHandler");
};
