import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractAddresses, EndpointIds, SupportChainIds } from "../../../../script";
import hre from "hardhat";

const [eidA, eidB] = [EndpointIds.LOCALHOST__A, EndpointIds.LOCALHOST__B];

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const LayerZeroModule = buildModule("LayerZeroModule", function (m) {
   const chainId = hre.network.config.chainId as SupportChainIds;

   if (chainId !== SupportChainIds.LOCALHOST) throw new Error("require localhost network");

   const MockEndpointV2A = m.contract("EndpointV2MockPassiveReceivePayload", [eidA], {
      id: "MockEndpointV2A",
   });
   const MockEndpointV2B = m.contract("EndpointV2MockPassiveReceivePayload", [eidB], {
      id: "MockEndpointV2B",
   });

   const [OrderBookWithLzA, OrderBookWithLzB, MockEndpointA, MockEndpointB] = [
      contractAddresses[chainId].OrderBookWithLzA,
      contractAddresses[chainId].OrderBookWithLzB,
      contractAddresses[chainId].MockEndpointV2A,
      contractAddresses[chainId].MockEndpointV2B,
   ];

   m.call(MockEndpointV2A, "setDestLzEndpoint", [OrderBookWithLzB, MockEndpointB]);
   m.call(MockEndpointV2B, "setDestLzEndpoint", [OrderBookWithLzA, MockEndpointA]);

   return { MockEndpointV2A, eidA, MockEndpointV2B, eidB };
});

export default LayerZeroModule;
