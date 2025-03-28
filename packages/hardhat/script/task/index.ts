import { task } from "hardhat/config";
import { spawn, spawnSync } from "child_process";
import WebSocket from "ws";
import { LambdaClient, InvokeCommand, InvokeCommandInput } from "@aws-sdk/client-lambda";

import { contractAddresses, EndpointIds, SupportChainIds, SupportedEvent, SupportedEventABI } from "../constants";
import { ContractEventPayload, ethers } from "ethers";
import { beforeTaskAction, encodePayloadViem } from "../utils";
import { isAddress, parseEther } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import { AlchemyWebhookPayload } from "../types";

enum Task {
   dev = "dev", // only run local
   mining = "mining", // only run local

   createOrder = "createOrder",
   sendPacket = "sendPacket",
}

// npx hardhat dev
task(Task.dev, "override npx hardhat node task").setAction(async (taskArgs, hre) => {
   const chainId = hre.network.config.chainId as SupportChainIds;

   if (chainId !== SupportChainIds.LOCALHOST) {
      throw new Error("only run local");
   }

   console.log("\n🚀 Hardhat 노드를 실행합니다...");

   const hardhatProcess = spawn("npx", ["hardhat", "node"], {
      stdio: "inherit", // ✅ 부모 프로세스의 stdout/stderr을 그대로 사용
      shell: true, // ✅ 쉘을 통해 실행
   });

   (function nodeHealthChecker() {
      const ws = new WebSocket("ws://localhost:8545");

      ws.on("open", async () => {
         console.log("✅ hardhat node 인식완료, 1s block 생성을 시작합니다.");

         spawnSync("npx", ["hardhat", Task.mining, "--network", "localhost"], {
            stdio: "inherit",
            shell: true,
         });

         console.log("✅ 1s block 생성 완료, ignition 으로 컨트랙트를 배포합니다.");

         spawnSync(
            "npx",
            [
               "hardhat",
               "ignition",
               "deploy",
               "ignition/modules/helper/lz/EndpointV2Mock.passiveReceivePayload.ts",
               "--network",
               "localhost",
            ],
            {
               stdio: "inherit",
               shell: true,
            },
         );

         spawnSync(
            "npx",
            ["hardhat", "ignition", "deploy", "ignition/modules/orderBook/OrderBook.lz.ts", "--network", "localhost"],
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

   await new Promise((resolve) => {
      hardhatProcess.on("close", resolve); // Hardhat 종료될 때까지 대기
   });
});

// npx hardhat mining
task(Task.mining, "run hardhat node mining")
   .addOptionalParam("interval", "mining interval(ms)", "1000")
   .setAction(async ({ interval }, hre) => {
      if (hre.network.config.chainId !== SupportChainIds.LOCALHOST) {
         throw new Error("only run local");
      }

      console.log(`${interval}ms 블록생성 시작`);
      await hre.network.provider.send("evm_setIntervalMining", [Number(interval)]);
   });

// npx hardhat createOrder --ca 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
task(Task.createOrder, "createOrder")
   .addOptionalParam("ca", "contract address", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9")
   .setAction(async ({ ca }, hre) =>
      beforeTaskAction({ ca }, hre, async () => {
         if (!isAddress(ca)) throw new Error("not address --ca");

         const chainId = hre.network.config.chainId as SupportChainIds;
         const [ownerA] = await hre.viem.getWalletClients();

         console.log("ownerA: ", ownerA.account.address);
         console.log("address: ", contractAddresses[chainId].OrderBookWithLzA);

         const OrderBookWithLz = await hre.viem.getContractAt(
            "OrderBookWithLz",
            contractAddresses[chainId].OrderBookWithLzA,
         );

         const depositAmount = parseEther("1");
         const desiredAmount = parseEther("2");

         const { CreateOrder } = encodePayloadViem();

         // LayerZero 실행 옵션
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
         const createPayload = CreateOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: EndpointIds.LOCALHOST__A,
            depositAmount,
            dstEid: EndpointIds.LOCALHOST__B,
            desiredAmount,
         });

         // 크로스체인 수수료 견적
         const { nativeFee } = (await OrderBookWithLz.read.quote([
            EndpointIds.LOCALHOST__B,
            createPayload,
            options,
            false,
         ])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };

         console.log("nativeFee: ", nativeFee);

         await OrderBookWithLz.write.createOrder([EndpointIds.LOCALHOST__B, depositAmount, desiredAmount, options], {
            value: depositAmount + nativeFee,
         });
      }),
   );

// npx hardhat sendPacket --ca 0x5FbDB2315678afecb367f032d93F642f64180aa3
task(Task.sendPacket, "run hardhat node mining")
   .addOptionalParam("ca", "contract address", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
   .setAction(async ({ ca }, hre) =>
      beforeTaskAction({ ca }, hre, async () => {
         if (!isAddress(ca)) throw new Error("not address --ca");

         const EndpointV2Mock = await hre.viem.getContractAt("EndpointV2MockPassiveReceivePayload", ca);
         await EndpointV2Mock.write.releaseQueuedMessages([]);
      }),
   );

async function subscribeEventAll(chainId: SupportChainIds) {
   const provider = new ethers.WebSocketProvider("ws://127.0.0.1:8545");
   const [owner] = await provider.listAccounts();

   const contractAddress = [contractAddresses[chainId].OrderBookWithLzA, contractAddresses[chainId].OrderBookWithLzB];

   for (const address of contractAddress) {
      const contract = new ethers.Contract(address, SupportedEventABI, provider);

      for (const eventName of Object.keys(SupportedEvent)) {
         console.log("eventName: ", eventName, " & contract address: ", address);

         contract.on(eventName, async (...arg) => {
            console.log("event emit name is: ", eventName, " & contract address: ", address);

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
}
