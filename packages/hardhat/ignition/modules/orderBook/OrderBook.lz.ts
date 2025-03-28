import hre from "hardhat";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { padHex } from "viem";

import { contractAddresses, EndpointIds, ownerAddress, SupportChainIds } from "../../../script";

const OrderBookModule = buildModule("OrderBookModule", function (m) {
   const chainId = hre.network.config.chainId as SupportChainIds;

   const [MockEndpointV2A, MockEndpointV2B, OrderBookA, OrderBookB] = [
      contractAddresses[chainId].MockEndpointV2A,
      contractAddresses[chainId].MockEndpointV2B,
      contractAddresses[chainId].OrderBookWithLzA,
      contractAddresses[chainId].OrderBookWithLzB,
   ];

   if (!MockEndpointV2A || !MockEndpointV2B) throw new Error("mockEndpointV2 is not set");
   if (!ownerAddress[chainId]) throw new Error("ownerAddress is not set");

   const OrderBookWithLzA = m.contract(
      "OrderBookWithLz",
      [MockEndpointV2A, ownerAddress[chainId], EndpointIds.LOCALHOST__A],
      {
         id: "OrderBookWithLzA",
      },
   );
   const OrderBookWithLzB = m.contract(
      "OrderBookWithLz",
      [MockEndpointV2B, ownerAddress[chainId], EndpointIds.LOCALHOST__B],
      {
         id: "OrderBookWithLzB",
      },
   );

   if (chainId === SupportChainIds.LOCALHOST) {
      m.call(OrderBookWithLzA, "setPeer", [EndpointIds.LOCALHOST__B, padHex(OrderBookB, { size: 32 })]);
      m.call(OrderBookWithLzB, "setPeer", [EndpointIds.LOCALHOST__A, padHex(OrderBookA, { size: 32 })]);
   }

   return { OrderBookWithLzA, OrderBookWithLzB };
});

export default OrderBookModule;
