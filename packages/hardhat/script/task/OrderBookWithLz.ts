import { task } from "hardhat/config";
import { isAddress, parseEther } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

import { beforeTaskAction, encodePayloadViem } from "./utils";
import { EndpointIds, SupportChainIds } from "../constants";
import { Task } from "./types";

// npx hardhat createOrder --network localhost --ca 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
task(Task.createOrder, "createOrder")
   .addOptionalParam("ca", "contract address", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9")
   .addOptionalParam("depositAmount", "depositAmount", parseEther("1").toString())
   .addOptionalParam("desiredAmount", "desiredAmount", parseEther("2").toString())
   .setAction(async ({ ca, depositAmount, desiredAmount }, hre) =>
      beforeTaskAction({ ca, depositAmount, desiredAmount }, hre, async () => {
         if (!isAddress(ca)) throw new Error("not address --ca");
         const [owner] = await hre.viem.getWalletClients();

         const OrderBookWithLz = await hre.viem.getContractAt("OrderBookWithLz" as string, ca);

         const { CreateOrder } = encodePayloadViem();

         // LayerZero 실행 옵션
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
         const createPayload = CreateOrder({
            orderId: 0n,
            sender: owner.account.address,
            srcEid: EndpointIds[SupportChainIds.LOCALHOST],
            depositAmount,
            dstEid: EndpointIds[SupportChainIds.LOCALHOST_COPY],
            desiredAmount,
         });

         // 크로스체인 수수료 견적
         const { nativeFee } = (await OrderBookWithLz.read.quote([
            EndpointIds[SupportChainIds.LOCALHOST_COPY],
            createPayload,
            options,
            false,
         ])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };

         console.log("nativeFee: ", nativeFee);

         const createPayload222 = CreateOrder({
            orderId: 100000000000n,
            sender: owner.account.address,
            srcEid: EndpointIds[SupportChainIds.LOCALHOST],
            depositAmount,
            dstEid: EndpointIds[SupportChainIds.LOCALHOST_COPY],
            desiredAmount,
         });

         // 크로스체인 수수료 견적
         const { nativeFee: nativeFee22 } = (await OrderBookWithLz.read.quote([
            EndpointIds[SupportChainIds.LOCALHOST_COPY],
            createPayload222,
            options,
            false,
         ])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };
         console.log("nativeFee22: ", nativeFee22);

         await OrderBookWithLz.write.createOrder(
            [EndpointIds[SupportChainIds.LOCALHOST_COPY], depositAmount, desiredAmount, options],
            {
               value: depositAmount + nativeFee,
            },
         );
      }),
   );
