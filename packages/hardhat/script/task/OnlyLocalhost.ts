import { task } from "hardhat/config";
import { spawnSync } from "child_process";
import { ContractEventPayload, ethers } from "ethers";
import { InvokeCommand, InvokeCommandInput, LambdaClient } from "@aws-sdk/client-lambda";
import { Chain, createPublicClient, encodePacked, http, isAddress, keccak256 } from "viem";
import { readContract } from "viem/actions";
import * as fs from "fs";
import * as path from "path";
import pc from "picocolors";

import { AlchemyWebhookPayload } from "../types";
import {
   contractAddresses,
   EndpointIds,
   JsonRPC,
   SupportChainIds,
   SupportedEvent,
   SupportedEventABI,
} from "../constants";
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

         await subscribeEventAll(chainId);
      })();
   }

   // task 종료 후 프로세스가 종료되지 않도록 무한 대기
   await new Promise(() => {});
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

         //
         const OrderBookWithLz = await hre.viem.getContractAt(
            "OrderBookWithLz" as string,
            contractAddresses[chainId].OrderBookWithLz,
         );
         const dstOrderId = keccak256(
            encodePacked(["uint256", "uint32"], [0n, EndpointIds[Number(dstchainid) as SupportChainIds]]),
         );
         const beforeData = await OrderBookWithLz.read.dstOrder([dstOrderId]);
         console.log("beforeData: ", beforeData);

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

         await srcEndpointV2Mock.write.receivePayload([origin, receiver, payloadHash, message, gas, msgValue, guid]);

         const afterData = await OrderBookWithLz.read.dstOrder([dstOrderId]);
         console.log("afterData: ", afterData);
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

async function subscribeEventAll(chainId: SupportChainIds) {
   const provider = new ethers.WebSocketProvider(JsonRPC[chainId].replace("http", "ws"));
   const [owner] = await provider.listAccounts();

   const address = contractAddresses[chainId].OrderBookWithLz;
   const contract = new ethers.Contract(address, SupportedEventABI, provider);

   for await (const eventName of Object.keys(SupportedEvent)) {
      console.log(`[${eventName}] event subscribe .. `);

      await contract.on(eventName, async (...arg) => {
         console.log(`[${eventName}] event emit .. `);

         const event: ContractEventPayload = arg[arg.length - 1];
         const data: AlchemyWebhookPayload = {
            webhookId: "wh_wclh9c0e3nf3t4wn",
            id: "whevt_1i58wb1ww2u3jzea",
            createdAt: "2025-03-20T12:57:02.661Z",
            type: "GRAPHQL",
            event: {
               data: {
                  block: {
                     hash: event.log.blockHash,
                     number: event.log.blockNumber,
                     timestamp: Math.floor(Date.now() / 1000),
                     logs: [
                        {
                           data: event.log.data,
                           topics: event.log.topics,
                           index: event.log.index,
                           account: {
                              address: event.log.address,
                           },
                           transaction: {
                              hash: event.log.transactionHash,
                              nonce: 0,
                              index: event.log.transactionIndex,
                              gasPrice: "",
                              maxFeePerGas: null,
                              maxPriorityFeePerGas: null,
                              from: { address: owner.address },
                              to: { address: address },
                              gas: 0,
                              status: 0,
                              gasUsed: 0,
                              cumulativeGasUsed: 0,
                              effectiveGasPrice: "",
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

         const config = {
            region: "us-east-1", // 로컬 테스트 시 유효한 리전을 지정 (예: us-east-1)
            endpoint: "http://127.0.0.1:3001", // 로컬 Lambda 엔드포인트
         };
         const client = new LambdaClient(config);
         const input: InvokeCommandInput = {
            FunctionName: "EventProducerFunction",
            Payload: JSON.stringify({
               body: JSON.stringify(data),
            }),
         };
         const command = new InvokeCommand(input);
         client.send(command).then(console.log).catch(console.error);
      });
   }
}
