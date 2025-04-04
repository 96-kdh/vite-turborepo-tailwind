import { task } from "hardhat/config";
import { spawnSync } from "child_process";
import { ethers } from "ethers";
import { InvokeCommand, InvokeCommandInput, LambdaClient } from "@aws-sdk/client-lambda";
import { Chain, createPublicClient, http, isAddress, TransactionReceipt, TransactionType, zeroAddress } from "viem";
import * as fs from "fs";
import * as path from "path";
import pc from "picocolors";
import { getTransactionReceipt } from "viem/actions";
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";

import { AlchemyWebhookPayload } from "../types";
import { contractAddresses, JsonRPC, SupportChainIds, SupportedEvent, SupportedEventSig } from "../constants";
import { Task } from "./types";
import { beforeTaskAction } from "./utils";

// npx hardhat dev
task(Task.dev, "override npx hardhat node task").setAction(async (taskArgs, hre) => {
   if (
      hre.network.config.chainId !== SupportChainIds.LOCALHOST &&
      hre.network.config.chainId !== SupportChainIds.LOCALHOST_COPY
   ) {
      throw new Error("only run local");
   }

   console.log("🚀 실행중인 Hardhat 노드를 찾습니다...");

   const subscribeChainIds = [SupportChainIds.LOCALHOST, SupportChainIds.LOCALHOST_COPY];
   const originalLog = console.log;

   for await (const chainId of subscribeChainIds) {
      const color = SupportChainIds.LOCALHOST === chainId ? pc.red : pc.green;
      const colorPrefix = color(`[${chainId}]: `);

      console.log = (...args) => {
         originalLog.call(console, colorPrefix, ...args);
      };

      await (async function nodeHealthChecker() {
         const provider = new ethers.JsonRpcProvider(JsonRPC[chainId]);

         // eslint-disable-next-line no-constant-condition
         while (true) {
            try {
               await provider.getBlockNumber();
               break;
            } catch (error) {
               console.error("블록 번호 가져오기 실패, 1초 후 재시도합니다.");
               await new Promise((resolve) => setTimeout(resolve, 1000));
            }
         }

         console.log("✅ hardhat node 인식완료, 1s block 생성을 시작합니다.");
         spawnSync(
            "npx",
            [
               "hardhat",
               Task.mining,
               "--network",
               chainId === SupportChainIds.LOCALHOST ? "localhost" : "localhost_copy",
            ],
            {
               stdio: "inherit",
               shell: true,
            },
         );

         const folderPath = path.resolve(`ignition/deployments/chain-${chainId}`);
         if (fs.existsSync(folderPath)) fs.rmSync(folderPath, { recursive: true, force: true });

         console.log("✅ 1s block 생성 완료, ignition 으로 컨트랙트를 배포합니다.");
         spawnSync(
            "echo",
            [
               "y",
               " | ",
               "npx",
               "hardhat",
               "ignition",
               "deploy",
               "ignition/modules/helper/lz/EndpointV2Mock.ts",
               "--network",
               chainId === SupportChainIds.LOCALHOST ? "localhost" : "localhost_copy",
            ],
            {
               stdio: "inherit",
               shell: true,
            },
         );
         spawnSync(
            "echo",
            [
               "y",
               " | ",
               "npx",
               "hardhat",
               "ignition",
               "deploy",
               "ignition/modules/orderBook/OrderBook.lz.ts",
               "--network",
               chainId === SupportChainIds.LOCALHOST ? "localhost" : "localhost_copy",
            ],
            {
               stdio: "inherit",
               shell: true,
            },
         );
         console.log("✅ ignition 으로 컨트랙트 배포를 마쳤습니다.");

         spawnSync(
            "npx",
            [
               "hardhat",
               "setDestLzEndpoint",
               "--network",
               chainId === SupportChainIds.LOCALHOST ? "localhost" : "localhost_copy",
               "--ca",
               contractAddresses[chainId as SupportChainIds].EndpointV2Mock,
               "--dstchainid",
               chainId === SupportChainIds.LOCALHOST
                  ? String(SupportChainIds.LOCALHOST_COPY)
                  : String(SupportChainIds.LOCALHOST),
            ],
            {
               stdio: "inherit",
               shell: true,
            },
         );

         spawnSync(
            "npx",
            [
               "hardhat",
               "setPeer",
               "--network",
               chainId === SupportChainIds.LOCALHOST ? "localhost" : "localhost_copy",
               "--ca",
               contractAddresses[chainId as SupportChainIds].OrderBookWithLz,
               "--dstchainid",
               chainId === SupportChainIds.LOCALHOST
                  ? String(SupportChainIds.LOCALHOST_COPY)
                  : String(SupportChainIds.LOCALHOST),
               "--autoapprove",
               "true",
            ],
            {
               stdio: "inherit",
               shell: true,
            },
         );
      })();
   }

   // spawnSync("npx", ["hardhat", "pollingQueue"], {
   //    stdio: "inherit",
   //    shell: true,
   // });
});

// npx hardhat mining
task(Task.mining, "run hardhat node mining")
   .addOptionalParam("interval", "mining interval(ms)", "1000")
   .setAction(async ({ interval }, hre) => {
      if (
         hre.network.config.chainId !== SupportChainIds.LOCALHOST &&
         hre.network.config.chainId !== SupportChainIds.LOCALHOST_COPY
      ) {
         throw new Error("only run local");
      }

      console.log(`${interval}ms 블록생성 시작`);
      await hre.network.provider.send("evm_setIntervalMining", [Number(interval)]);
   });

// npx hardhat receivePayload --network localhost --dstchainid 31338
task(Task.receivePayload, "run Receive Payload (for layerZero endpoint mock contract)")
   .addParam("dstchainid", "dst chainId")
   .setAction(async ({ dstchainid }, hre) =>
      beforeTaskAction({ dstchainid }, hre, async () => {
         if (
            hre.network.config.chainId !== SupportChainIds.LOCALHOST &&
            hre.network.config.chainId !== SupportChainIds.LOCALHOST_COPY
         ) {
            throw new Error("only run local");
         }

         const chainId = hre.network.config.chainId as SupportChainIds;
         if (!(Number(chainId) in SupportChainIds)) throw new Error("not support chainId");
         if (!(Number(dstchainid) in SupportChainIds)) throw new Error("not support chainId");

         const srcEndpointV2Mock = await hre.viem.getContractAt(
            "EndpointV2MockCustom" as string,
            contractAddresses[chainId].EndpointV2Mock,
         );

         const dstClient = createPublicClient({
            chain: {
               id: Number(dstchainid),
               name: "CustomLocal",
            } as Chain,
            transport: http(JsonRPC[Number(dstchainid) as SupportChainIds]),
         });

         const { origin, endpoint, receiver, payloadHash, message, gas, msgValue, guid } =
            (await dstClient.readContract({
               address: contractAddresses[Number(dstchainid) as SupportChainIds].EndpointV2Mock,
               abi: srcEndpointV2Mock.abi,
               functionName: "lastQueueMessage",
            })) as {
               origin: {
                  srcEid: number;
                  sender: string;
                  nonce: bigint;
               };
               endpoint: string;
               receiver: string;
               payloadHash: string;
               message: string;
               gas: bigint;
               msgValue: bigint;
               guid: string;
            };

         const txHash = await srcEndpointV2Mock.write.receivePayload([
            origin,
            receiver,
            payloadHash,
            message,
            gas,
            msgValue,
            guid,
         ]);

         if (chainId === SupportChainIds.LOCALHOST || chainId === SupportChainIds.LOCALHOST_COPY) {
            const client = await hre.viem.getPublicClient();
            const receipt = await getTransactionReceipt(client, {
               hash: txHash,
            });

            await sendEventToLocalhost(chainId, receipt);
         }
      }),
   );

// npx hardhat setDestLzEndpoint --network localhost --ca 0x5FbDB2315678afecb367f032d93F642f64180aa3 --dstchainid 31338
task(Task.setDestLzEndpoint, "for layerZero endpoint mock contract")
   .addParam("ca", "contract address")
   .addParam("dstchainid", "dst chainId")
   .setAction(async ({ ca, dstchainid }, hre) => {
      const chainId = hre.network.config.chainId;
      if (chainId !== SupportChainIds.LOCALHOST && chainId !== SupportChainIds.LOCALHOST_COPY) {
         throw new Error("only run local");
      }
      if (!isAddress(ca)) throw new Error("not address --ca");
      if (!(Number(chainId) in SupportChainIds)) throw new Error("not support chainId");
      if (!(Number(dstchainid) in SupportChainIds)) throw new Error("not support chainId");

      console.log("✅ 각 EndpointV2Mock 의 dst endpoint 를 연결합니다.");

      const EndpointV2Mock = await hre.viem.getContractAt("EndpointV2MockCustom" as string, ca);
      await EndpointV2Mock.write.setDestLzEndpoint([
         contractAddresses[Number(dstchainid) as SupportChainIds].OrderBookWithLz,
         contractAddresses[Number(dstchainid) as SupportChainIds].EndpointV2Mock,
      ]);
   });

// npx hardhat pollingQueue
task(Task.pollingQueue, "for localstack queue polling").setAction(async (taskArgs, hre) => {
   const chainId = hre.network.config.chainId;
   if (chainId !== SupportChainIds.LOCALHOST && chainId !== SupportChainIds.LOCALHOST_COPY) {
      throw new Error("only run local");
   }

   const REGION = "us-east-1";
   const ENDPOINT = "http://127.0.0.1:4566";
   const QUEUE_URL = "http://127.0.0.1:4566/000000000000/eventQueue.fifo";

   const sqsClient = new SQSClient({
      region: REGION,
      endpoint: ENDPOINT,
   });

   (async function pollingQueue() {
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
   })().catch((err) => console.error("폴링 스크립트 치명적 오류:", err));

   // task 종료 후 프로세스가 종료되지 않도록 무한 대기
   await new Promise(() => {});
});

export async function sendEventToLocalhost(
   chainId: SupportChainIds,
   receipt: TransactionReceipt<bigint, number, "success" | "reverted", TransactionType>,
) {
   if (chainId !== SupportChainIds.LOCALHOST && chainId !== SupportChainIds.LOCALHOST_COPY) {
      return;
   }

   const config = {
      region: "us-east-1", // 로컬 테스트 시 유효한 리전을 지정 (예: us-east-1)
      endpoint: "http://127.0.0.1:3001", // 로컬 Lambda 엔드포인트
   };
   const client = new LambdaClient(config);
   const promiseTask = [];

   const supportedEventSigs = Object.values(SupportedEventSig());
   for (const log of receipt.logs) {
      const isSupported = supportedEventSigs.includes((log.topics[0] as string).toLowerCase());
      if (!isSupported) continue;

      const data: AlchemyWebhookPayload = {
         webhookId: "wh_wclh9c0e3nf3t4wn",
         id: "whevt_1i58wb1ww2u3jzea",
         createdAt: "2025-03-20T12:57:02.661Z",
         type: "GRAPHQL",
         event: {
            data: {
               block: {
                  hash: log.blockHash,
                  number: Number(log.blockNumber),
                  timestamp: Math.floor(Date.now() / 1000),
                  logs: [
                     {
                        data: log.data,
                        topics: log.topics,
                        index: log.logIndex,
                        account: {
                           address: log.address,
                        },
                        transaction: {
                           hash: log.transactionHash,
                           nonce: 0,
                           index: log.transactionIndex,
                           gasPrice: "",
                           maxFeePerGas: null,
                           maxPriorityFeePerGas: null,
                           from: { address: receipt.from },
                           to: { address: receipt.to || zeroAddress },
                           gas: 0,
                           status: 0,
                           gasUsed: Number(receipt.gasUsed),
                           cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
                           effectiveGasPrice: receipt.effectiveGasPrice.toString(),
                           createdContract: null,
                        },
                     },
                  ],
               },
            },
            sequenceNumber: "",
            network: "LOCALHOST",
         },
      };

      const input: InvokeCommandInput = {
         FunctionName: "EventProducerFunction",
         Payload: JSON.stringify({
            body: JSON.stringify(data),
         }),
      };
      const command = new InvokeCommand(input);

      promiseTask.push(new Promise((resolve) => resolve(client.send(command))));
   }

   console.log("promiseTask length: ", promiseTask.length);
   if (promiseTask.length > 0) {
      try {
         await Promise.all(promiseTask);
         console.log("send sqs message complete");
      } catch (e) {
         console.log(e);
      }
   }
}
