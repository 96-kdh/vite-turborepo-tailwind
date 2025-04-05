import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const REGION = "ap-northeast-2";
// const ENDPOINT = "http://localstack:4566";
// const QUEUE_URL = "http://localstack:4566/000000000000/eventQueue.fifo";
// Lambda가 사용하는 엔드포인트와 동일하게 host.docker.internal 사용
const ENDPOINT = "http://host.docker.internal:4566";
const QUEUE_URL = "http://host.docker.internal:4566/000000000000/eventQueue.fifo";

const dummyCredentials = {
   accessKeyId: "test",
   secretAccessKey: "test",
};

// only run dev
// (프로덕션의 sqs 에서는 message 가 들어오면 자동으로 lambda 를 트리거 하나, dev 환경에서는 그렇지 않기 때문에 수동으로 polling 을 돌리기 위함)
(async function () {
   const sqsClient = new SQSClient({
      region: REGION,
      endpoint: ENDPOINT,
      useQueueUrlAsEndpoint: false,
      customUserAgent: "event-producer-local",
      credentials: dummyCredentials,
   });

   const lambdaConfig = {
      region: "ap-northeast-2",
      endpoint: "http://host.docker.internal:3001", // 로컬 Lambda 엔드포인트
      credentials: dummyCredentials,
   };
   const lambdaClient = new LambdaClient(lambdaConfig);

   await (async function tick() {
      try {
         console.log("폴링 시작...");
         const receiveParams = {
            QueueUrl: QUEUE_URL,
            MaxNumberOfMessages: 10, // 한 번에 최대 10개 메시지 수신
            WaitTimeSeconds: 20, // 긴 폴링: 최대 20초 동안 대기
         };

         const receiveCommand = new ReceiveMessageCommand(receiveParams);
         const response = await sqsClient.send(receiveCommand);
         const messages = response.Messages;

         if (messages && messages.length > 0) {
            console.log(`메시지 ${messages.length}건 수신됨.`);

            const event = {
               Records: messages.map((msg) => ({
                  messageId: msg.MessageId,
                  receiptHandle: msg.ReceiptHandle,
                  body: msg.Body,
                  attributes: {},
                  messageAttributes: {},
                  md5OfBody: msg.MD5OfBody,
                  eventSource: "aws:sqs",
                  eventSourceARN: QUEUE_URL,
                  awsRegion: REGION,
               })),
            };

            try {
               console.log("Lambda 함수 호출 중...");

               const input = {
                  FunctionName: "EventConsumerFunction",
                  Payload: JSON.stringify(event),
               };
               const command = new InvokeCommand(input);
               await lambdaClient.send(command);
               console.log("Lambda 함수가 성공적으로 메시지를 처리했습니다.");

               // 처리된 메시지를 SQS에서 삭제합니다.
               for (const msg of messages) {
                  const deleteParams = {
                     QueueUrl: QUEUE_URL,
                     ReceiptHandle: msg.ReceiptHandle,
                  };
                  const deleteCommand = new DeleteMessageCommand(deleteParams);
                  await sqsClient.send(deleteCommand);
                  console.log(`메시지 ${msg.MessageId} 삭제됨.`);
               }
            } catch (lambdaError) {
               console.error("Lambda 처리 중 오류 발생:", lambdaError);
               // 실패 시, 메시지를 삭제하지 않음으로써 재처리 가능하도록 합니다.
            }
         } else {
            console.log("메시지 없음. 다시 폴링합니다...");
         }
      } catch (error) {
         if (error.Code === "AWS.SimpleQueueService.NonExistentQueue") {
            console.error("sqs 생성 전 .. 5s 재시도");
            setTimeout(tick, 5000);
         } else {
            console.error("SQS 폴링 중 오류:", error);
            process.exit(1);
         }
      }

      setTimeout(tick, 1000);
   })();
})();
