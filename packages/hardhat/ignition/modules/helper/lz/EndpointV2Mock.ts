import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { EndpointIds, SupportChainIds } from "../../../../script";
import hre from "hardhat";

const LayerZeroModule = buildModule("LayerZeroModule", function (m) {
   const chainId = hre.network.config.chainId as SupportChainIds;

   if (chainId !== SupportChainIds.LOCALHOST && chainId !== SupportChainIds.LOCALHOST_COPY) {
      throw new Error("require localhost network");
   }

   const MockEndpointV2 = m.contract("EndpointV2MockCustom", [EndpointIds[chainId]]);

   return { MockEndpointV2 };
});

export default LayerZeroModule;
