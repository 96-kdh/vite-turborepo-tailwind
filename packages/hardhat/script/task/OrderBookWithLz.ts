import { task } from "hardhat/config";
import { isAddress, padHex, parseEther } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

import { beforeTaskAction, encodePayloadViem } from "./utils";
import { contractAddresses, EndpointIds, SupportChainIds } from "../constants";
import { Task } from "./types";

// npx hardhat createOrder --network localhost --ca 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
task(Task.createOrder, "createOrder")
   .addOptionalParam("ca", "contract address", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512")
   .addOptionalParam("depositAmount", "depositAmount", parseEther("1").toString())
   .addOptionalParam("desiredAmount", "desiredAmount", parseEther("2").toString())
   .addParam("dstchainid", "dst chainId")
   .setAction(async ({ ca, depositAmount, desiredAmount, dstchainid }, hre) =>
      beforeTaskAction({ ca, depositAmount, desiredAmount, dstchainid }, hre, async () => {
         if (!isAddress(ca)) throw new Error("not address --ca");

         const chainId = hre.network.config.chainId as SupportChainIds;
         if (!(Number(chainId) in SupportChainIds)) throw new Error("not support chainId");
         if (!(Number(dstchainid) in SupportChainIds)) throw new Error("not support chainId");

         const srcEid = EndpointIds[chainId];
         const dstEid = EndpointIds[dstchainid as SupportChainIds];

         const [owner] = await hre.viem.getWalletClients();
         const OrderBookWithLz = await hre.viem.getContractAt("OrderBookWithLz" as string, ca);
         const { CreateOrder } = encodePayloadViem();

         // LayerZero 실행 옵션
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
         const createPayload = CreateOrder({
            orderId: 0n,
            sender: owner.account.address,
            srcEid,
            depositAmount: BigInt(depositAmount),
            dstEid,
            desiredAmount: BigInt(desiredAmount),
         });

         // 크로스체인 수수료 견적
         const { nativeFee } = (await OrderBookWithLz.read.quote([dstEid, createPayload, options, false])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };

         console.log("nativeFee: ", nativeFee);

         await OrderBookWithLz.write.createOrder([dstEid, BigInt(depositAmount), desiredAmount, options], {
            value: BigInt(depositAmount) + nativeFee,
         });
      }),
   );

// npx hardhat setPeer --network localhost --ca 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --dstchainid 31338
task(Task.setPeer, "setPeer")
   .addParam("ca", "contract address")
   .addParam("dstchainid", "dst chainId")
   .addOptionalParam("autoapprove", "-auto-approve", "false")
   .setAction(async ({ ca, dstchainid, autoapprove }, hre) =>
      beforeTaskAction({ ca, dstchainid, autoapprove }, hre, async () => {
         const chainId = hre.network.config.chainId;
         if (chainId !== SupportChainIds.LOCALHOST && chainId !== SupportChainIds.LOCALHOST_COPY) {
            throw new Error("only run local");
         }
         if (!isAddress(ca)) throw new Error("not address --ca");
         if (!(Number(chainId) in SupportChainIds)) throw new Error("not support chainId");
         if (!(Number(dstchainid) in SupportChainIds)) throw new Error("not support chainId");

         const OrderBookWithLz = await hre.viem.getContractAt("OrderBookWithLz" as string, ca);
         await OrderBookWithLz.write.setPeer([
            EndpointIds[Number(dstchainid) as SupportChainIds],
            padHex(contractAddresses[Number(dstchainid) as SupportChainIds].OrderBookWithLz, { size: 32 }),
         ]);

         console.log("complete OrderBookWithLz setPeer");
      }),
   );
