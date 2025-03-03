import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { padHex, parseEther, keccak256, encodeAbiParameters, toHex, zeroAddress } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

describe("CrossChainOrderBook Test", function () {
   // LayerZero Mock Endpoint IDs (Ethereum ↔ BNB)
   const eidA = 31337; // Ethereum
   const eidB = 2; // BNB

   async function deployFixture() {
      // Get wallet clients (signers)
      const [ownerA, endpointOwner] = await hre.viem.getWalletClients();

      // ✅ LayerZero Mock Endpoint 배포 (A 체인, B 체인)
      const mockEndpointV2A = await hre.viem.deployContract("EndpointV2Mock", [eidA], {
         client: { wallet: endpointOwner },
      });

      const mockEndpointV2B = await hre.viem.deployContract("EndpointV2Mock", [eidB], {
         client: { wallet: endpointOwner },
      });

      // ✅ CrossChainOrderBook 배포 (Ethereum, BNB)
      const orderBookA = await hre.viem.deployContract("OrderBook", [mockEndpointV2A.address, ownerA.account.address], {
         client: { wallet: ownerA },
      });

      const orderBookB = await hre.viem.deployContract("OrderBook", [mockEndpointV2B.address, ownerA.account.address], {
         client: { wallet: ownerA },
      });

      // ✅ LayerZero Endpoint 연결 설정
      await mockEndpointV2A.write.setDestLzEndpoint([orderBookB.address, mockEndpointV2B.address]);
      await mockEndpointV2B.write.setDestLzEndpoint([orderBookA.address, mockEndpointV2A.address]);

      // ✅ Peer 설정
      await orderBookA.write.setPeer([eidB, padHex(orderBookB.address, { size: 32 })]);
      await orderBookB.write.setPeer([eidA, padHex(orderBookA.address, { size: 32 })]);

      const publicClient = await hre.viem.getPublicClient();

      return {
         orderBookA,
         orderBookB,
         ownerA,
         mockEndpointV2A,
         mockEndpointV2B,
         publicClient,
      };
   }

   const encodePayloadViem = (
      orderId: bigint,
      sender: `0x${string}`,
      sendAmount: bigint,
      chainId: number,
      receiveAmount: bigint,
      receiveChainId: number,
   ) => {
      // Step 1: Function selector
      const functionSelector = keccak256(toHex("CreateOrder")).slice(0, 10);

      // Step 2: ABI Encoding
      const encodedData = encodeAbiParameters(
         [
            { type: "uint256" },
            { type: "address" },
            { type: "uint256" },
            { type: "uint32" },
            { type: "uint256" },
            { type: "uint32" },
         ],
         [orderId, sender, sendAmount, chainId, receiveAmount, receiveChainId],
      );

      // Step 3: 최종적으로 encodePacked와 동일한 데이터 반환
      return functionSelector + encodedData.slice(2);
   };

   describe("Order Management", function () {
      it("should create an order and propagate to destination chain", async function () {
         const { orderBookA, orderBookB, ownerA, publicClient } = await loadFixture(deployFixture);

         const orderAmountGive = parseEther("1"); // 1 ETH
         const orderAmountReceive = parseEther("2"); // 2 BNB

         // LayerZero 실행 옵션
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
         const payload = encodePayloadViem(
            BigInt(0),
            ownerA.account.address,
            orderAmountGive,
            eidA,
            orderAmountReceive,
            eidB,
         );

         // 크로스체인 수수료 견적
         const { nativeFee } = (await orderBookA.read.quote([eidB, payload, options, false])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };

         expect(
            await publicClient.getBalance({
               address: orderBookA.address,
            }),
         ).to.be.equal(0n);

         await orderBookA.write.createOrder([orderAmountGive, eidB, orderAmountReceive, options], {
            value: orderAmountGive + nativeFee, // 1 ETH + fee
         });

         expect(
            await publicClient.getBalance({
               address: orderBookA.address,
            }),
         ).to.be.equal(orderAmountGive);

         let [maker, sendAmount, sendChainId, receiveAmount, receiveChainId, taker, isFilled] =
            await orderBookA.read.orders([0]);

         expect(maker.toLowerCase()).to.be.equal(ownerA.account.address.toLowerCase());
         expect(sendAmount).to.be.equal(orderAmountGive);
         expect(sendChainId).to.be.equal(eidA);
         expect(receiveChainId).to.be.equal(eidB);
         expect(receiveAmount).to.be.equal(receiveAmount);
         expect(taker).to.be.equal(zeroAddress);
         expect(isFilled).to.be.equal(false);

         [maker, sendAmount, sendChainId, receiveAmount, receiveChainId, taker, isFilled] =
            await orderBookB.read.orders([0]);
         expect(maker.toLowerCase()).to.be.equal(ownerA.account.address.toLowerCase());
         expect(sendAmount).to.be.equal(orderAmountGive);
         expect(sendChainId).to.be.equal(eidA);
         expect(receiveChainId).to.be.equal(eidB);
         expect(receiveAmount).to.be.equal(receiveAmount);
         expect(taker).to.be.equal(zeroAddress);
         expect(isFilled).to.be.equal(false);
      });
   });
});
