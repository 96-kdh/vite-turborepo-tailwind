import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSHandler } from "aws-lambda";
import { AlchemyWebhookPayload } from "@repo/hardhat/script/types";
import { sqsClient } from "./utils";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

// http://localhost:4000/event post
export const eventWebHook = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
   try {
      if (typeof event.body !== "string") throw new Error("The event body must be a string");

      const messageBody = event.body;
      const params = {
         QueueUrl: "queueUrl",
         MessageBody: messageBody,
         MessageGroupId: "default", // 여러 그룹이 있다면 적절한 그룹 ID 지정
         MessageDeduplicationId: "randomUUID()", // 중복 제거를 위한 고유 ID
      };
      const command = new SendMessageCommand(params);
      await sqsClient.send(command);

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
   for (const record of event.Records) {
      try {
         // SQS 메시지 본문은 문자열이므로, JSON 파싱 (필요한 경우)
         const message = JSON.parse(record.body);
         console.log("수신된 메시지:", message);

         // 여기에 DynamoDB 등에 데이터를 저장하는 로직을 추가할 수 있습니다.
         // 예: await ddbDocClient.send(new PutCommand({ TableName: process.env.DYNAMODB_TABLE, Item: message }));
      } catch (error) {
         console.error("메시지 처리 오류 (messageId:", record.messageId, "):", error);
         // 오류가 발생하면 throw를 하지 않으면 해당 메시지는 재처리되지 않습니다.
         // 재처리가 필요하다면 throw error; 를 사용하세요.
      }
   }
};
