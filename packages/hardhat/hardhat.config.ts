import type { HardhatUserConfig } from "hardhat/config";
import { SolcConfig } from "hardhat/types";

import "@nomicfoundation/hardhat-toolbox-viem";
import "@typechain/hardhat";
import "hardhat-gas-reporter";

import "./script/task";
import { JsonRPC, SupportChainIds } from "./script";

const CompilerSettings = {
   optimizer: {
      enabled: true,
      runs: 200,
   },
};

const CompilerVersions = ["0.8.28"];

const compilers: SolcConfig[] = CompilerVersions.map((item) => {
   return {
      version: item,
      settings: CompilerSettings,
   };
});

const config: HardhatUserConfig = {
   solidity: {
      compilers,
   },
   networks: {
      localhost: {
         url: JsonRPC[SupportChainIds.LOCALHOST],
         chainId: SupportChainIds.LOCALHOST,
      },
      localhost_copy: {
         url: JsonRPC[SupportChainIds.LOCALHOST_COPY],
         chainId: SupportChainIds.LOCALHOST_COPY,
      },
   },
   mocha: {
      timeout: 10 * 60 * 1000,
   },
};

export default config;
