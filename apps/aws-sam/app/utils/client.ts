import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

export const docClient = DynamoDBDocumentClient.from(
   new DynamoDBClient(
      process.env.NODE_ENV === "prod"
         ? { region: "ap-northeast-2" }
         : { region: "us-east-1", endpoint: "http://host.docker.internal:4566" },
   ),
);

export const sqsClient = new SQSClient(
   process.env.NODE_ENV === "prod"
      ? { region: "ap-northeast-2" }
      : { region: "us-east-1", endpoint: "http://host.docker.internal:4566", useQueueUrlAsEndpoint: true },
);
