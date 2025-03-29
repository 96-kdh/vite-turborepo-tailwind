import { task } from "hardhat/config";
import { spawnSync } from "child_process";
import WebSocket from "ws";
import { ContractEventPayload, ethers } from "ethers";
import { InvokeCommand, InvokeCommandInput, LambdaClient } from "@aws-sdk/client-lambda";
import { isAddress } from "viem";

import { AlchemyWebhookPayload } from "../types";
import { contractAddresses, JsonRPC, SupportChainIds, SupportedEvent, SupportedEventABI } from "../constants";
import { Task } from "./types";
import { beforeTaskAction } from "./utils";

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

// npx hardhat dev
task(Task.dev, "override npx hardhat node task").setAction(async (taskArgs, hre) => {
   if (
      hre.network.config.chainId !== SupportChainIds.LOCALHOST &&
      hre.network.config.chainId !== SupportChainIds.LOCALHOST_COPY
   ) {
      throw new Error("only run local");
   }

   console.log("\n🚀 실행중인 Hardhat 노드를 찾습니다...");

   const subscribeChainIds = [SupportChainIds.LOCALHOST, SupportChainIds.LOCALHOST_COPY];
   for (const chainId of subscribeChainIds) {
      (function nodeHealthChecker() {
         const ws = new WebSocket(JsonRPC[chainId].replace("http", "ws"));

         ws.on("open", async () => {
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
            console.log("✅ 1s block 생성 완료, ignition 으로 컨트랙트를 배포합니다.");
            spawnSync(
               "npx",
               [
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
               "npx",
               [
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

            subscribeEventAll(chainId);
         });

         ws.on("error", (err: { message: string }) => {
            console.error("❌ hardhat node 인식 실패, ", err.message);
            setTimeout(nodeHealthChecker, 1000);
         });
      })();
   }

   console.log("✅ 각 EndpointV2Mock 의 dst endpoint 를 연결합니다.");
   const EndpointV2MockA = await hre.viem.getContractAt(
      "EndpointV2MockCustom" as string,
      contractAddresses[SupportChainIds.LOCALHOST].EndpointV2Mock,
   );
   await EndpointV2MockA.write.setDestLzEndpoint([
      contractAddresses[SupportChainIds.LOCALHOST_COPY].OrderBookWithLz,
      contractAddresses[SupportChainIds.LOCALHOST_COPY].EndpointV2Mock,
   ]);

   const EndpointV2MockB = await hre.viem.getContractAt(
      "EndpointV2MockCustom" as string,
      contractAddresses[SupportChainIds.LOCALHOST_COPY].EndpointV2Mock,
   );
   await EndpointV2MockB.write.setDestLzEndpoint([
      contractAddresses[SupportChainIds.LOCALHOST].OrderBookWithLz,
      contractAddresses[SupportChainIds.LOCALHOST].EndpointV2Mock,
   ]);
});

// npx hardhat receivePayload --network localhost --ca 0x5FbDB2315678afecb367f032d93F642f64180aa3
task(Task.receivePayload, "run hardhat node mining")
   .addParam("ca", "contract address")
   .setAction(async ({ ca }, hre) =>
      beforeTaskAction({ ca }, hre, async () => {
         if (
            hre.network.config.chainId !== SupportChainIds.LOCALHOST &&
            hre.network.config.chainId !== SupportChainIds.LOCALHOST_COPY
         ) {
            throw new Error("only run local");
         }

         if (!isAddress(ca)) throw new Error("not address --ca");

         const EndpointV2Mock = await hre.viem.getContractAt("EndpointV2MockCustom" as string, ca);
         await EndpointV2Mock.write.receivePayload([]);
      }),
   );

async function subscribeEventAll(chainId: SupportChainIds) {
   const provider = new ethers.WebSocketProvider(JsonRPC[chainId].replace("http", "ws"));
   const [owner] = await provider.listAccounts();

   const address = contractAddresses[chainId].OrderBookWithLz;
   const contract = new ethers.Contract(address, SupportedEventABI, provider);

   for (const eventName of Object.keys(SupportedEvent)) {
      console.log(`[chainId]: ${chainId}, [eventName]: ${eventName}`);

      contract.on(eventName, async (...arg) => {
         console.log(`[chainId]: ${chainId}, [emit eventName]: ${eventName}`);

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
