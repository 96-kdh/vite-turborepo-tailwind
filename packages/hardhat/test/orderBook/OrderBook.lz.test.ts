import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { padHex, parseEther, keccak256, encodeAbiParameters, toHex, zeroAddress } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import {
   IOrderBook,
   MessagingFeeStructOutput,
} from "../../typechain-types/contracts/orderBook/OrderBook.lz.sol/OrderBookWithLz";
import OrderStructOutput = IOrderBook.OrderStructOutput;
import { encodePayloadOrderBook } from "../../script";

// -------------------------------------------------------------------
// Test Flows
// -------------------------------------------------------------------
describe("OrderBookWithLz - Cross-Chain Order Book", function () {
   // LayerZero Mock Endpoint IDs (Ethereum ↔ BNB)
   const eidA = 1; // Chain A (e.g., Ethereum)
   const eidB = 2; // Chain B (e.g., BNB)

   // deployFixture simulates deployment on two chains.
   async function deployFixture() {
      // Get wallet clients (signers)
      const [ownerA, endpointOwner, otherAccount] = await hre.viem.getWalletClients();

      // Deploy LayerZero Mock Endpoint contracts on Chain A and Chain B.
      const mockEndpointV2A = await hre.viem.deployContract("EndpointV2Mock" as string, [eidA], {
         client: { wallet: endpointOwner },
      });
      const mockEndpointV2B = await hre.viem.deployContract("EndpointV2Mock" as string, [eidB], {
         client: { wallet: endpointOwner },
      });

      const orderBookA = await hre.viem.deployContract(
         "OrderBookWithLz" as string,
         [mockEndpointV2A.address, ownerA.account.address, eidA],
         { client: { wallet: ownerA } },
      );
      const orderBookB = await hre.viem.deployContract(
         "OrderBookWithLz" as string,
         [mockEndpointV2B.address, ownerA.account.address, eidB],
         { client: { wallet: ownerA } },
      );

      // Set LayerZero Endpoint connections.
      await mockEndpointV2A.write.setDestLzEndpoint([orderBookB.address, mockEndpointV2B.address]);
      await mockEndpointV2B.write.setDestLzEndpoint([orderBookA.address, mockEndpointV2A.address]);

      // Set peer connections.
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
   async function deployFixturePassiveReceivePayload() {
      // Get wallet clients (signers)
      const [ownerA, endpointOwner, otherAccount] = await hre.viem.getWalletClients();

      // Deploy LayerZero Mock Endpoint contracts on Chain A and Chain B.
      const mockEndpointV2A = await hre.viem.deployContract("EndpointV2MockPassiveReceivePayload" as string, [eidA], {
         client: { wallet: endpointOwner },
      });
      const mockEndpointV2B = await hre.viem.deployContract("EndpointV2MockPassiveReceivePayload" as string, [eidB], {
         client: { wallet: endpointOwner },
      });

      const orderBookA = await hre.viem.deployContract(
         "OrderBookWithLz" as string,
         [mockEndpointV2A.address, ownerA.account.address, eidA],
         { client: { wallet: ownerA } },
      );
      const orderBookB = await hre.viem.deployContract(
         "OrderBookWithLz" as string,
         [mockEndpointV2B.address, ownerA.account.address, eidB],
         { client: { wallet: ownerA } },
      );

      // Set LayerZero Endpoint connections.
      await mockEndpointV2A.write.setDestLzEndpoint([orderBookB.address, mockEndpointV2B.address]);
      await mockEndpointV2B.write.setDestLzEndpoint([orderBookA.address, mockEndpointV2A.address]);

      // Set peer connections.
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
   async function deployFixtureCustomReceivePayload() {
      // Get wallet clients (signers)
      const [ownerA, endpointOwner, otherAccount] = await hre.viem.getWalletClients();

      // Deploy LayerZero Mock Endpoint contracts on Chain A and Chain B.
      const mockEndpointV2A = await hre.viem.deployContract("EndpointV2MockCustom" as string, [eidA], {
         client: { wallet: endpointOwner },
      });
      const mockEndpointV2B = await hre.viem.deployContract("EndpointV2MockCustom" as string, [eidB], {
         client: { wallet: endpointOwner },
      });

      const orderBookA = await hre.viem.deployContract(
         "OrderBookWithLz" as string,
         [mockEndpointV2A.address, ownerA.account.address, eidA],
         { client: { wallet: ownerA } },
      );
      const orderBookB = await hre.viem.deployContract(
         "OrderBookWithLz" as string,
         [mockEndpointV2B.address, ownerA.account.address, eidB],
         { client: { wallet: ownerA } },
      );

      // Set LayerZero Endpoint connections.
      await mockEndpointV2A.write.setDestLzEndpoint([orderBookB.address, mockEndpointV2B.address]);
      await mockEndpointV2B.write.setDestLzEndpoint([orderBookA.address, mockEndpointV2A.address]);

      // Set peer connections.
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

   // Get our payload encoding functions.
   const { createOrder, executeOrder, claim, canceled } = encodePayloadOrderBook();

   // -------------------------------------------------------------------
   // Flow 1: createOrder -> executeOrder -> claim
   // -------------------------------------------------------------------
   describe("Flow 1: createOrder -> executeOrder -> claim", function () {
      it("should complete a successful swap", async function () {
         const { orderBookA, orderBookB, ownerA } = await loadFixture(deployFixture);
         const depositAmount = parseEther("1"); // 1 native token (e.g., ETH)
         const desiredAmount = parseEther("2"); // 2 native tokens (e.g., BNB)
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

         // 1. Create Order on Chain A
         const createPayload = createOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
            depositAmount,
            dstEid: eidB,
            desiredAmount,
         });
         const feeRes = (await orderBookA.read.quote([
            eidB,
            createPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const fee = feeRes.nativeFee;

         await orderBookA.write.createOrder([eidB, depositAmount, desiredAmount, options], {
            value: depositAmount + fee,
         });

         // Verify srcOrder on Chain A.
         const srcOrder0 = (await orderBookA.read.getOrder([0n])) as OrderStructOutput;
         expect(srcOrder0.maker.toLowerCase()).to.equal(ownerA.account.address.toLowerCase());
         expect(srcOrder0.depositAmount).to.equal(depositAmount);
         expect(srcOrder0.desiredAmount).to.equal(desiredAmount);
         expect(srcOrder0.taker).to.equal(zeroAddress);
         expect(srcOrder0.timelock).to.equal(0n);
         expect(srcOrder0.status).to.equal(1); // OrderStatus.createOrder

         // (Assume the LayerZero mock automatically propagates the message)
         // Verify dstOrder on Chain B.
         const dstOrder0 = (await orderBookB.read.getOrder([0n, eidA])) as OrderStructOutput;
         expect(dstOrder0.maker.toLowerCase()).to.equal(ownerA.account.address.toLowerCase());
         expect(dstOrder0.depositAmount).to.equal(depositAmount);
         expect(dstOrder0.desiredAmount).to.equal(desiredAmount);
         expect(dstOrder0.taker).to.equal(zeroAddress);
         expect(dstOrder0.timelock).to.equal(0n);
         expect(dstOrder0.status).to.equal(2); // OrderStatus.createOrderLzReceive

         // 2. Execute Order on Chain B
         const timelock = 7200n; // timelock at least 2 hours from now
         const execPayload = executeOrder({
            orderId: 0n,
            sender: ownerA.account.address, // accountA acts as taker
            srcEid: eidB,
            paymentAmount: desiredAmount,
            dstEid: eidB,
            desiredAmount: depositAmount,
            timelock,
         });
         const feeExecRes = (await orderBookB.read.quote([
            eidA,
            execPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const feeExec = feeExecRes.nativeFee;
         await orderBookB.write.executeOrder([0n, eidA, desiredAmount, depositAmount, timelock, options], {
            value: desiredAmount + feeExec,
         });

         // Verify dstOrder on Chain B has been updated.
         const dstOrderAfterExec = (await orderBookB.read.getOrder([0n, eidA])) as OrderStructOutput;
         expect(dstOrderAfterExec.taker.toLowerCase()).to.equal(ownerA.account.address.toLowerCase());
         // expect(dstOrderAfterExec.timelock).to.equal(timelock);
         expect(dstOrderAfterExec.status).to.equal(3); // OrderStatus.executeOrder

         // Assume cross-chain propagation back to Chain A updates srcOrder.
         const srcOrderAfterExec = (await orderBookA.read.getOrder([0])) as OrderStructOutput;
         expect(srcOrderAfterExec.taker.toLowerCase()).to.equal(ownerA.account.address.toLowerCase());
         // expect(srcOrderAfterExec.timelock).to.equal(timelock);
         expect(srcOrderAfterExec.status).to.equal(4); // OrderStatus.executeOrderLzReceive

         // 3. Claim on Chain A (maker claims taker's deposit)
         const claimPayload = claim({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
         });
         const feeClaimRes = (await orderBookA.read.quote([
            eidB,
            claimPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const feeClaim = feeClaimRes.nativeFee;
         await orderBookA.write.claim([0n, eidB, options], { value: feeClaim });
         const srcOrderAfterClaim = (await orderBookA.read.getOrder([0])) as OrderStructOutput;
         expect(srcOrderAfterClaim.status).to.equal(5); // OrderStatus.claim
      });
   });

   // -------------------------------------------------------------------
   // Flow 2: createOrder -> cancelOrder
   // -------------------------------------------------------------------
   describe("Flow 2: createOrder -> cancelOrder", function () {
      it("should allow accountA to cancel and refund the order", async function () {
         const { orderBookA, ownerA } = await loadFixture(deployFixture);
         const depositAmount = parseEther("1");
         const desiredAmount = parseEther("2");
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

         const createPayload = createOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
            depositAmount,
            dstEid: eidB,
            desiredAmount,
         });
         const feeRes = (await orderBookA.read.quote([
            eidB,
            createPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const fee = feeRes.nativeFee;
         await orderBookA.write.createOrder([eidB, depositAmount, desiredAmount, options], {
            value: depositAmount + fee,
         });
         const srcOrder0 = (await orderBookA.read.getOrder([0])) as OrderStructOutput;
         expect(srcOrder0.status).to.equal(1); // createOrder

         // Cancel the order.
         const cancelPayload = canceled({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
         });
         const feeCancelRes = (await orderBookA.read.quote([
            eidB,
            cancelPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const feeCancel = feeCancelRes.nativeFee;
         await orderBookA.write.cancelOrder([0n, eidB, options], { value: feeCancel });
         const srcOrderAfterCancel = (await orderBookA.read.getOrder([0])) as OrderStructOutput;
         expect(srcOrderAfterCancel.status).to.equal(7); // OrderStatus.canceled
      });
   });

   // -------------------------------------------------------------------
   // Flow 3: createOrder -> cancelOrder -> executeOrder (should revert)
   // -------------------------------------------------------------------
   describe("Flow 3: createOrder -> cancelOrder -> executeOrder (should revert)", function () {
      it("should revert execution if the order has been canceled", async function () {
         const { orderBookA, orderBookB, ownerA } = await loadFixture(deployFixture);
         const depositAmount = parseEther("1");
         const desiredAmount = parseEther("2");
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

         const createPayload = createOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
            depositAmount,
            dstEid: eidB,
            desiredAmount,
         });
         const feeRes = (await orderBookA.read.quote([
            eidB,
            createPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const fee = feeRes.nativeFee;
         await orderBookA.write.createOrder([eidB, depositAmount, desiredAmount, options], {
            value: depositAmount + fee,
         });

         // Cancel the order.
         const cancelPayload = canceled({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
         });
         const feeCancelRes = (await orderBookA.read.quote([
            eidB,
            cancelPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const feeCancel = feeCancelRes.nativeFee;
         await orderBookA.write.cancelOrder([0n, eidB, options], { value: feeCancel });

         // Attempt to execute the order on Chain B, which should revert.
         const timelock = 7200n;
         const execPayload = executeOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidB,
            paymentAmount: desiredAmount,
            dstEid: eidB,
            desiredAmount: depositAmount,
            timelock,
         });
         const feeExecRes = (await orderBookB.read.quote([
            eidA,
            execPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const feeExec = feeExecRes.nativeFee;

         await expect(
            orderBookB.write.executeOrder([0n, eidA, desiredAmount, depositAmount, timelock, options], {
               value: desiredAmount + feeExec,
            }),
         ).to.be.rejectedWith("Order status must be 2(OrderStatus.createOrderLzReceive)");
      });
   });

   // -------------------------------------------------------------------
   // Flow 4: createOrder -> delayed executeOrder -> emergencyRefundDstOrder
   // -------------------------------------------------------------------
   describe("Flow 4: createOrder -> delayed executeOrder -> emergencyRefundDstOrder, with deployFixturePassiveReceivePayload", function () {
      it("should allow emergency refund when execution is delayed and timelock expired", async function () {
         const { orderBookA, orderBookB, ownerA, mockEndpointV2A } = await loadFixture(
            deployFixturePassiveReceivePayload,
         );
         const depositAmount = parseEther("1");
         const desiredAmount = parseEther("2");
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

         const createPayload = createOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
            depositAmount,
            dstEid: eidB,
            desiredAmount,
         });
         const feeRes = (await orderBookA.read.quote([
            eidB,
            createPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const fee = feeRes.nativeFee;
         await orderBookA.write.createOrder([eidB, depositAmount, desiredAmount, options], {
            value: depositAmount + fee,
         });
         await mockEndpointV2A.write.releaseQueuedMessages([]);

         // Assume propagation to Chain B occurs.
         const dstOrder0 = (await orderBookB.read.getOrder([0n, eidA])) as OrderStructOutput;
         expect(dstOrder0.status).to.equal(2); // createOrderLzReceive

         const timelock = 3600n; // 2h
         const execPayload = executeOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidB,
            paymentAmount: desiredAmount,
            dstEid: eidB,
            desiredAmount: depositAmount,
            timelock,
         });
         const feeExecRes = (await orderBookB.read.quote([
            eidA,
            execPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const feeExec = feeExecRes.nativeFee;
         await orderBookB.write.executeOrder([0n, eidA, desiredAmount, depositAmount, timelock, options], {
            value: desiredAmount + feeExec,
         });

         // As the owner, call emergencyRefundDstOrder on Chain B.
         await expect(orderBookB.write.emergencyRefundDstOrder([0n, eidA])).to.be.rejectedWith("Not yet expired");

         const currentTime = await time.latest();
         await time.increaseTo(BigInt(currentTime) + timelock);
         await orderBookB.write.emergencyRefundDstOrder([0n, eidA]);

         const dstOrderAfterRefund = (await orderBookB.read.getOrder([0n, eidA])) as OrderStructOutput;
         expect(dstOrderAfterRefund.status).to.equal(8); // canceledLzReceive
      });
   });

   describe("Flow 5: createOrder -> delayed executeOrder -> executeOrder, with deployFixtureCustomReceivePayload", function () {
      it("should allow emergency refund when execution is delayed and timelock expired", async function () {
         const { orderBookA, orderBookB, ownerA, mockEndpointV2A, mockEndpointV2B } = await loadFixture(
            deployFixtureCustomReceivePayload,
         );
         const depositAmount = parseEther("1");
         const desiredAmount = parseEther("2");
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

         const createPayload = createOrder({
            orderId: 0n,
            sender: ownerA.account.address,
            srcEid: eidA,
            depositAmount,
            dstEid: eidB,
            desiredAmount,
         });
         const feeRes = (await orderBookA.read.quote([
            eidB,
            createPayload,
            options,
            false,
         ])) as MessagingFeeStructOutput;
         const fee = feeRes.nativeFee;
         await orderBookA.write.createOrder([eidB, depositAmount, desiredAmount, options], {
            value: depositAmount + fee,
         });

         // Assume propagation to Chain B occurs.
         let dstOrder0 = (await orderBookB.read.getOrder([0n, eidA])) as OrderStructOutput;
         expect(dstOrder0.status).to.equal(0); // not receive

         const { origin, endpoint, receiver, payloadHash, message, gas, msgValue, guid } =
            (await mockEndpointV2A.read.lastQueueMessage([])) as {
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

         await mockEndpointV2B.write.receivePayload([origin, receiver, payloadHash, message, gas, msgValue, guid]);
         // Assume propagation to Chain B occurs.
         dstOrder0 = (await orderBookB.read.getOrder([0n, eidA])) as OrderStructOutput;
         expect(dstOrder0.status).to.equal(2); // createOrderLzReceive
      });
   });
});
