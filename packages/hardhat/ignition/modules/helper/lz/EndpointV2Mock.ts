import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";

import { ChainIdToEndpointId, SupportChainIds } from "../../../../script";
import "../../index";

const LayerZeroModule = buildModule("LayerZeroModule", function (m) {
   const chainId = hre.network.config.chainId as SupportChainIds;

   if (chainId !== SupportChainIds.LOCALHOST && chainId !== SupportChainIds.LOCALHOST_COPY) {
      throw new Error("require localhost network");
   }

   const MockEndpointV2 = m.contract("EndpointV2MockCustom", [ChainIdToEndpointId[chainId]], {
      id: `MockEndpointV2_${chainId}`,
   });

   return { MockEndpointV2 };
});

export default LayerZeroModule;
