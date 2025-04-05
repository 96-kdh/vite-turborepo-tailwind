import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

import { lowercaseMiddleware } from "./middleware";

export const docClient = DynamoDBDocumentClient.from(
   new DynamoDBClient(
      process.env.NODE_ENV === "prod"
         ? { region: "ap-northeast-2" }
         : { region: "ap-northeast-2", endpoint: "http://host.docker.internal:4566" },
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
           region: "ap-northeast-2",
           endpoint: "http://host.docker.internal:4566",
           useQueueUrlAsEndpoint: false,
           customUserAgent: "event-producer-local",
           credentials: {
              accessKeyId: "test",
              secretAccessKey: "test",
           },
        },
);
