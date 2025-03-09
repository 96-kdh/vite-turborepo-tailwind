import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { padHex, parseEther, keccak256, encodeAbiParameters, toHex, zeroAddress, encodePacked } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

describe("CrossChainOrderBook Test", function () {
   // LayerZero Mock Endpoint IDs (Ethereum ↔ BNB)
   const eidA = 1; // Ethereum
   const eidB = 2; // BNB

   async function deployFixture() {
      // Get wallet clients (signers)
      const [ownerA, endpointOwner, otherAccount] = await hre.viem.getWalletClients();

      // ✅ LayerZero Mock Endpoint 배포 (A 체인, B 체인)
      const mockEndpointV2A = await hre.viem.deployContract("EndpointV2Mock", [eidA], {
         client: { wallet: endpointOwner },
      });

      const mockEndpointV2B = await hre.viem.deployContract("EndpointV2Mock", [eidB], {
         client: { wallet: endpointOwner },
      });

      // ✅ CrossChainOrderBook 배포 (Ethereum, BNB)
      const orderBookA = await hre.viem.deployContract(
         "MyOAppOrderBook",
         [mockEndpointV2A.address, ownerA.account.address, eidA],
         {
            client: { wallet: ownerA },
         },
      );

      const orderBookB = await hre.viem.deployContract(
         "MyOAppOrderBook",
         [mockEndpointV2B.address, ownerA.account.address, eidB],
         {
            client: { wallet: ownerA },
         },
      );

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
         otherAccount,
      };
   }

   const encodePayloadViem = (
      orderId: bigint,
      sender: `0x${string}`,
      srcEid: number,
      depositAmount: bigint,
      dstEid: number,
      desiredAmount: bigint,
   ) => {
      // Step 1: Function selector
      const functionSelector = keccak256(toHex("CreateOrder")).slice(0, 10);

      // Step 2: ABI Encoding
      const encodedData = encodeAbiParameters(
         [
            { type: "uint256" },
            { type: "address" },
            { type: "uint32" },
            { type: "uint256" },
            { type: "uint32" },
            { type: "uint256" },
         ],
         [orderId, sender, srcEid, depositAmount, dstEid, desiredAmount],
      );

      // Step 3: 최종적으로 encodePacked와 동일한 데이터 반환
      return functionSelector + encodedData.slice(2);
   };

   const encodePayloadViem2 = (
      orderId: bigint,
      sender: `0x${string}`,
      srcEid: number,
      depositAmount: bigint,
      dstEid: number,
      desiredAmount: bigint,
      timelock: bigint,
   ) => {
      // Step 1: Function selector
      const functionSelector = keccak256(toHex("executeOrder")).slice(0, 10);

      // Step 2: ABI Encoding
      const encodedData = encodeAbiParameters(
         [
            { type: "uint256" },
            { type: "address" },
            { type: "uint32" },
            { type: "uint256" },
            { type: "uint32" },
            { type: "uint256" },
            { type: "uint256" },
         ],
         [orderId, sender, srcEid, depositAmount, dstEid, desiredAmount, timelock],
      );

      // Step 3: 최종적으로 encodePacked와 동일한 데이터 반환
      return functionSelector + encodedData.slice(2);
   };

   describe("Order Management", function () {
      it("should create an order and propagate to destination chain", async function () {
         const { orderBookA, orderBookB, ownerA, publicClient } = await loadFixture(deployFixture);

         const depositAmount = parseEther("1"); // 1 ETH
         const desiredAmount = parseEther("2"); // 2 BNB

         // LayerZero 실행 옵션
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
         const payload = encodePayloadViem(BigInt(0), ownerA.account.address, eidA, depositAmount, eidB, desiredAmount);

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

         await orderBookA.write.createOrder([eidB, depositAmount, desiredAmount, options], {
            value: depositAmount + nativeFee, // 1 ETH + fee
         });

         expect(
            await publicClient.getBalance({
               address: orderBookA.address,
            }),
         ).to.be.equal(depositAmount);

         let [_maker, _taker, _depositAmount, _desiredAmount, _timelock, _executed] = await orderBookA.read.srcOrder([
            0,
         ]);

         expect(_maker.toLowerCase()).to.be.equal(ownerA.account.address.toLowerCase());
         expect(_depositAmount).to.be.equal(depositAmount);
         expect(_desiredAmount).to.be.equal(desiredAmount);
         expect(_taker).to.be.equal(zeroAddress);
         expect(_timelock).to.be.equal(0n);
         expect(_executed).to.be.equal(false);

         const dstOrderId = keccak256(encodePacked(["uint256", "uint32"], [0n, eidA]));

         [_maker, _taker, _depositAmount, _desiredAmount, _timelock, _executed] = await orderBookB.read.dstOrder([
            dstOrderId,
         ]);
         expect(_maker.toLowerCase()).to.be.equal(ownerA.account.address.toLowerCase());
         expect(_depositAmount).to.be.equal(depositAmount);
         expect(_desiredAmount).to.be.equal(desiredAmount);
         expect(_taker).to.be.equal(zeroAddress);
         expect(_timelock).to.be.equal(0n);
         expect(_executed).to.be.equal(false);
      });

      it("should execute the generated order and propagate to destination chain", async function () {
         const { orderBookA, orderBookB, ownerA, publicClient, otherAccount } = await loadFixture(deployFixture);

         const depositAmount = parseEther("1"); // 1 ETH
         const desiredAmount = parseEther("2"); // 2 BNB

         const orderId = 0n;
         const dstOrderId = keccak256(encodePacked(["uint256", "uint32"], [0n, eidA]));

         // LayerZero 실행 옵션
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
         let payload = encodePayloadViem(orderId, ownerA.account.address, eidA, depositAmount, eidB, desiredAmount);

         // 크로스체인 수수료 견적
         let { nativeFee } = (await orderBookA.read.quote([eidB, payload, options, false])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };

         await orderBookA.write.createOrder([eidB, depositAmount, desiredAmount, options], {
            value: depositAmount + nativeFee, // 1 ETH + fee
         });

         payload = encodePayloadViem2(orderId, ownerA.account.address, eidB, desiredAmount, eidB, depositAmount, 1000n);
         const getQuote = (await orderBookB.read.quote([eidA, payload, options, false])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };
         nativeFee = getQuote.nativeFee;

         expect(
            await publicClient.getBalance({
               address: orderBookA.address,
            }),
         ).to.be.equal(depositAmount);
         expect(
            await publicClient.getBalance({
               address: orderBookB.address,
            }),
         ).to.be.equal(0n);

         await orderBookB.write.executeOrder([orderId, eidA, desiredAmount, depositAmount, 1000n, options], {
            value: desiredAmount + nativeFee,
         });

         const [_maker, _taker, _depositAmount, _desiredAmount, _timelock, _executed] = await orderBookB.read.dstOrder([
            dstOrderId,
         ]);

         expect(_maker.toLowerCase()).to.be.equal(ownerA.account.address.toLowerCase());
         expect(_depositAmount).to.be.equal(depositAmount);
         expect(_desiredAmount).to.be.equal(desiredAmount);
         expect(_taker.toLowerCase()).to.be.equal(ownerA.account.address.toLowerCase());
         expect(_timelock).to.be.equal(1000n);
         expect(_executed).to.be.equal(true);

         expect(
            await publicClient.getBalance({
               address: orderBookA.address,
            }),
         ).to.be.equal(0n);
         expect(
            await publicClient.getBalance({
               address: orderBookB.address,
            }),
         ).to.be.equal(desiredAmount);

         await orderBookB.write.claim([orderId, eidA]);

         expect(
            await publicClient.getBalance({
               address: orderBookB.address,
            }),
         ).to.be.equal(0n);
      });
   });
});
