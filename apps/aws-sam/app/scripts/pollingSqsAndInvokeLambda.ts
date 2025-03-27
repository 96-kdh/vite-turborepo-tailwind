import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { LambdaClient, InvokeCommand, InvokeCommandInput } from "@aws-sdk/client-lambda";

const REGION = "us-east-1";
const ENDPOINT = "http://127.0.0.1:4566";
const QUEUE_URL = "http://127.0.0.1:4566/000000000000/eventQueue.fifo";

const sqsClient = new SQSClient({
   region: REGION,
   endpoint: ENDPOINT,
});

async function pollQueue() {
   // eslint-disable-next-line no-constant-condition
   while (true) {
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

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const event: never = {
               Records: messages.map((msg) => ({
                  messageId: msg.MessageId!,
                  receiptHandle: msg.ReceiptHandle!,
                  body: msg.Body!,
                  attributes: {},
                  messageAttributes: {},
                  md5OfBody: msg.MD5OfBody!,
                  eventSource: "aws:sqs",
                  eventSourceARN: QUEUE_URL,
                  awsRegion: REGION,
               })),
            };

            try {
               console.log("Lambda 함수 호출 중...");
               const config = {
                  region: "us-east-1", // 로컬 테스트 시 유효한 리전을 지정 (예: us-east-1)
                  endpoint: "http://127.0.0.1:3001", // 로컬 Lambda 엔드포인트
               };
               const client = new LambdaClient(config);
               const input: InvokeCommandInput = {
                  FunctionName: "EventConsumerFunction",
                  Payload: JSON.stringify(event),
               };
               const command = new InvokeCommand(input);
               await client.send(command);
               console.log("Lambda 함수가 성공적으로 메시지를 처리했습니다.");

               // 처리된 메시지를 SQS에서 삭제합니다.
               for (const msg of messages) {
                  const deleteParams = {
                     QueueUrl: QUEUE_URL,
                     ReceiptHandle: msg.ReceiptHandle!,
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
         console.error("SQS 폴링 중 오류:", error);
      }
   }
}

pollQueue().catch((err) => console.error("폴링 스크립트 치명적 오류:", err));
