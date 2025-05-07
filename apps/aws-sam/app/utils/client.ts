import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { lowercaseMiddleware } from "./middleware";

export const docClient = DynamoDBDocumentClient.from(
   new DynamoDBClient(
      process.env.NODE_ENV === "prod"
         ? { region: "ap-northeast-2" }
         : {
              region: "us-east-1",
              endpoint:
                 process.env.IS_DOCKER === "true" ? "http://localstack:4566" : "http://host.docker.internal:4566",
           },
   ),
);

// 미들웨어 스택에 추가
docClient.middlewareStack.add(lowercaseMiddleware, {
   step: "initialize", // 요청 초기 단계에서 실행
   name: "lowercaseMiddleware", // 미들웨어의 고유 이름
   priority: "high", // 같은 단계의 다른 미들웨어보다 먼저 실행
});

export const sqsClient = new SQSClient(
   process.env.NODE_ENV === "prod"
      ? { region: "ap-northeast-2" }
      : {
           region: "us-east-1",
           endpoint: process.env.IS_DOCKER === "true" ? "http://localstack:4566" : "http://host.docker.internal:4566",
           useQueueUrlAsEndpoint: false,
           customUserAgent: "event-producer-local",
           credentials: {
              accessKeyId: "test",
              secretAccessKey: "test",
           },
        },
);

export const rdsClient = new RDSDataClient({});
