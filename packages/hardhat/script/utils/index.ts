import { Options } from "@layerzerolabs/lz-v2-utilities";
import { encodeAbiParameters, keccak256, toHex, zeroAddress } from "viem";
import { ChainIdToEndpointId } from "../constants";

export const lzReceiveOption = (GAS_LIMIT: bigint, MSG_VALUE: bigint = 0n): `0x${string}` => {
   return Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE).toHex().toString() as `0x${string}`;
};

export function encodePayloadOrderBook() {
   const createOrder = ({
      orderId,
      sender,
      srcEid,
      depositAmount,
      dstEid,
      desiredAmount,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
      depositAmount: bigint;
      dstEid: number;
      desiredAmount: bigint;
   }): `0x${string}` => {
      const functionSelector = keccak256(toHex("CreateOrder")).slice(0, 10);
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
      return (functionSelector + encodedData.slice(2)) as `0x${string}`;
   };

   const createOrderMockData = (srcEid: number, dstEid: number) => {
      return {
         orderId: 1n,
         sender: zeroAddress,
         srcEid,
         depositAmount: 1n,
         dstEid,
         desiredAmount: 1n,
      };
   };

   const executeOrder = ({
      orderId,
      sender,
      srcEid,
      paymentAmount,
      dstEid,
      desiredAmount,
      timelock,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
      paymentAmount: bigint;
      dstEid: number;
      desiredAmount: bigint;
      timelock: bigint;
   }): `0x${string}` => {
      const functionSelector = keccak256(toHex("executeOrder")).slice(0, 10);
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
         [orderId, sender, srcEid, paymentAmount, dstEid, desiredAmount, timelock],
      );
      return (functionSelector + encodedData.slice(2)) as `0x${string}`;
   };

   const claim = ({
      orderId,
      sender,
      srcEid,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
   }): `0x${string}` => {
      const functionSelector = keccak256(toHex("claim")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [{ type: "uint256" }, { type: "address" }, { type: "uint32" }],
         [orderId, sender, srcEid],
      );
      return (functionSelector + encodedData.slice(2)) as `0x${string}`;
   };

   const canceled = ({
      orderId,
      sender,
      srcEid,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
   }): `0x${string}` => {
      const functionSelector = keccak256(toHex("canceled")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [{ type: "uint256" }, { type: "address" }, { type: "uint32" }],
         [orderId, sender, srcEid],
      );
      return (functionSelector + encodedData.slice(2)) as `0x${string}`;
   };

   return { createOrder, executeOrder, claim, canceled, createOrderMockData };
}
