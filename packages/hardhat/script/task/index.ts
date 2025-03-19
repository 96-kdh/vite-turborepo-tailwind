import { task } from "hardhat/config";
import { spawn, spawnSync } from "child_process";
import WebSocket from "ws";

import { contractAddresses, EndpointIds, SupportChainIds } from "../constants";
import { ethers } from "ethers";
import { beforeTaskAction, encodePayloadViem } from "../utils";
import { parseEther } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

enum Task {
   dev = "dev", // only run local
   mining = "mining", // only run local

   subscribe = "subscribe",
   createOrder = "createOrder",
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

         const provider = new ethers.WebSocketProvider("ws://127.0.0.1:8545");
         const abi = [
            "event UpdateSrcOrder(uint256 indexed orderId, address indexed maker, address taker, uint256 depositAmount, uint256 desiredAmount, uint256 timelock, uint8 orderStatus)",
            "event UpdateDstOrder(bytes32 indexed orderId, address indexed maker, address taker, uint256 depositAmount, uint256 desiredAmount, uint256 timelock, uint8 orderStatus)",
         ];

         const contractAddress = contractAddresses[chainId].OrderBookWithLzA;
         const contract = new ethers.Contract(contractAddress, abi, provider);

         contract.on(
            "UpdateSrcOrder",
            (
               orderId: bigint,
               maker: `0x${string}`,
               taker: `0x${string}`,
               depositAmount: bigint,
               desiredAmount: bigint,
               timelock: bigint,
               orderStatus: bigint,
            ) => {
               console.log("UpdateSrcOrder event emitted");
               console.log("orderId: ", orderId);
               console.log("maker: ", maker);
               console.log("taker: ", taker);
               console.log("depositAmount: ", depositAmount);
               console.log("desiredAmount: ", desiredAmount);
               console.log("timelock: ", timelock);
               console.log("orderStatus: ", orderStatus);
            },
         );

         contract.on(
            "UpdateDstOrder",
            (
               orderId: `0x${string}`,
               maker: `0x${string}`,
               taker: `0x${string}`,
               depositAmount: bigint,
               desiredAmount: bigint,
               timelock: bigint,
               orderStatus: bigint,
            ) => {
               console.log("UpdateDstOrder event emitted");
               console.log("orderId: ", orderId);
               console.log("maker: ", maker);
               console.log("taker: ", taker);
               console.log("depositAmount: ", depositAmount);
               console.log("desiredAmount: ", desiredAmount);
               console.log("timelock: ", timelock);
               console.log("orderStatus: ", orderStatus);
            },
         );
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

// npx hardhat createOrder
task(Task.createOrder, "createOrder").setAction(async (taskArgs, hre) =>
   beforeTaskAction(taskArgs, hre, async () => {
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
