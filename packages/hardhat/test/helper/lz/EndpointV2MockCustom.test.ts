import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { padHex } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

describe("EndpointV2MockCustom Test", function () {
   const eidA = 1;
   const eidB = 2;

   async function deployFixture() {
      const [ownerA, ownerB, endpointOwner] = await hre.viem.getWalletClients();

      const mockEndpointV2A = await hre.viem.deployContract("EndpointV2MockCustom" as string, [eidA], {
         client: { wallet: endpointOwner },
      });

      const mockEndpointV2B = await hre.viem.deployContract("EndpointV2MockCustom" as string, [eidB], {
         client: { wallet: endpointOwner },
      });

      const myOAppA = await hre.viem.deployContract(
         "MyOApp" as string,
         [mockEndpointV2A.address, ownerA.account.address],
         {
            client: { wallet: ownerA },
         },
      );

      const myOAppB = await hre.viem.deployContract(
         "MyOApp" as string,
         [mockEndpointV2B.address, ownerB.account.address],
         {
            client: { wallet: ownerB },
         },
      );

      // Set up destination LayerZero endpoints for each contract
      await mockEndpointV2A.write.setDestLzEndpoint([myOAppB.address, mockEndpointV2B.address]);
      await mockEndpointV2B.write.setDestLzEndpoint([myOAppA.address, mockEndpointV2A.address]);

      // Set peer connections for the contracts
      await myOAppA.write.setPeer([eidB, padHex(myOAppB.address, { size: 32 })]);
      await myOAppB.write.setPeer([eidA, padHex(myOAppA.address, { size: 32 })]);

      return { myOAppA, myOAppB, ownerA, ownerB, mockEndpointV2A, mockEndpointV2B };
   }

   describe("Message Sending", function () {
      it("should send a message to each destination OApp", async function () {
         const { myOAppA, myOAppB, mockEndpointV2A, mockEndpointV2B } = await loadFixture(deployFixture);

         // Assert initial state of data in both MyOApp instances
         expect(await myOAppA.read.data()).to.equal("Nothing received yet.");
         expect(await myOAppB.read.data()).to.equal("Nothing received yet.");

         // Create LayerZero options for execution
         const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

         // Estimate fees for cross-chain message
         const { nativeFee } = (await myOAppA.read.quote([eidB, "Test message.", options, false])) as {
            nativeFee: bigint;
            lzTokenFee: bigint;
         };

         // Send message from myOAppA to myOAppB
         await myOAppA.write.send([eidB, "Test message.", options], {
            value: nativeFee.toString(),
         });

         // Assert that myOAppB received the message
         expect(await myOAppA.read.data()).to.equal("Nothing received yet.");
         expect(await myOAppA.read.data()).to.equal("Nothing received yet.");
         // expect(await myOAppB.read.data()).to.equal("Test message.");

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
         expect(await myOAppB.read.data()).to.equal("Test message.");
      });
   });
});
