import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { padHex, parseEther, keccak256, encodeAbiParameters, toHex, zeroAddress, encodePacked } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

describe("CrossChainOrderBook Test", function () {
   const eidA = 1;
   const eidB = 2;

   async function deployFixture() {
      const [ownerA, endpointOwner, otherAccount] = await hre.viem.getWalletClients();

      const mockEndpointV2A = await hre.viem.deployContract("EndpointV2Mock", [eidA], {
         client: { wallet: endpointOwner },
      });

      const mockEndpointV2B = await hre.viem.deployContract("EndpointV2Mock", [eidB], {
         client: { wallet: endpointOwner },
      });

      const orderBookA = await hre.viem.deployContract(
         "OrderBookWithLz",
         [mockEndpointV2A.address, ownerA.account.address, eidA],
         {
            client: { wallet: ownerA },
         },
      );

      const orderBookB = await hre.viem.deployContract(
         "OrderBookWithLz",
         [mockEndpointV2B.address, ownerA.account.address, eidB],
         {
            client: { wallet: ownerA },
         },
      );

      await mockEndpointV2A.write.setDestLzEndpoint([orderBookB.address, mockEndpointV2B.address]);
      await mockEndpointV2B.write.setDestLzEndpoint([orderBookA.address, mockEndpointV2A.address]);

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

   describe("Order Management", function () {
      it("should create an order and propagate to destination chain", async function () {
         const { orderBookA, orderBookB, ownerA, publicClient } = await loadFixture(deployFixture);

         console.log(await orderBookA.read.srcOrder([0]));
      });
   });
});
