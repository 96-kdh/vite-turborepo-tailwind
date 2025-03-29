import hre from "hardhat";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import { contractAddresses, EndpointIds, ownerAddress, SupportChainIds } from "../../../script";

const OrderBookModule = buildModule("OrderBookModule", function (m) {
   const chainId = hre.network.config.chainId as SupportChainIds;

   const MockEndpointV2 = contractAddresses[chainId].EndpointV2Mock;

   if (!MockEndpointV2) throw new Error("mockEndpointV2 is not set");
   if (!ownerAddress[chainId]) throw new Error("ownerAddress is not set");

   const OrderBookWithLz = m.contract("OrderBookWithLz", [MockEndpointV2, ownerAddress[chainId], EndpointIds[chainId]]);

   // if (chainId === SupportChainIds.LOCALHOST) {
   //    m.call(OrderBookWithLzA, "setPeer", [
   //       EndpointIds[SupportChainIds.LOCALHOST_COPY],
   //       padHex(OrderBookB, { size: 32 }),
   //    ]);
   //    m.call(OrderBookWithLzB, "setPeer", [EndpointIds[SupportChainIds.LOCALHOST], padHex(OrderBookA, { size: 32 })]);
   // }

   return { OrderBookWithLz };
});

export default OrderBookModule;
