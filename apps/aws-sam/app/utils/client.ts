import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

export const docClient = DynamoDBDocumentClient.from(
   new DynamoDBClient(
      process.env.NODE_ENV === "prod"
         ? { region: "ap-northeast-2" }
         : { region: "localhost", endpoint: "http://127.0.0.1:4566" },
   ),
);

export const sqsClient = new SQSClient(
   process.env.NODE_ENV === "prod"
      ? { region: "ap-northeast-2" }
      : { region: "localhost", endpoint: "http://127.0.0.1:4566" },
);
