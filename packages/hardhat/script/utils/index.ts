import { Options } from "@layerzerolabs/lz-v2-utilities";
import { encodeAbiParameters, keccak256, toHex } from "viem";

export const lzReceiveOption = (GAS_LIMIT: bigint, MSG_VALUE: bigint = 0n) => {
   return Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE).toHex().toString();
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
   }): string => {
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
      return functionSelector + encodedData.slice(2);
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
   }): string => {
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
      return functionSelector + encodedData.slice(2);
   };

   const claim = ({ orderId, sender, srcEid }: { orderId: bigint; sender: `0x${string}`; srcEid: number }): string => {
      const functionSelector = keccak256(toHex("claim")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [{ type: "uint256" }, { type: "address" }, { type: "uint32" }],
         [orderId, sender, srcEid],
      );
      return functionSelector + encodedData.slice(2);
   };

   const canceled = ({
      orderId,
      sender,
      srcEid,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
   }): string => {
      const functionSelector = keccak256(toHex("canceled")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [{ type: "uint256" }, { type: "address" }, { type: "uint32" }],
         [orderId, sender, srcEid],
      );
      return functionSelector + encodedData.slice(2);
   };

   return { createOrder, executeOrder, claim, canceled };
}
