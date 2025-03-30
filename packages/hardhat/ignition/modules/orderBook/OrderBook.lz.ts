import hre from "hardhat";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import { contractAddresses, EndpointIds, ownerAddress, SupportChainIds } from "../../../script";
import "../index";

const OrderBookModule = buildModule("OrderBookModule", function (m) {
   const chainId = hre.network.config.chainId as SupportChainIds;

   const MockEndpointV2 = contractAddresses[chainId].EndpointV2Mock;

   if (!MockEndpointV2) throw new Error("mockEndpointV2 is not set");
   if (!ownerAddress[chainId]) throw new Error("ownerAddress is not set");

   const OrderBookWithLz = m.contract(
      "OrderBookWithLz",
      [MockEndpointV2, ownerAddress[chainId], EndpointIds[chainId]],
      {
         id: `OrderBookWithLz_${chainId}`,
      },
   );

   return { OrderBookWithLz };
});

export default OrderBookModule;
