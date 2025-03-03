import type { HardhatUserConfig } from "hardhat/config";
import { SolcConfig } from "hardhat/types";

import "@nomicfoundation/hardhat-toolbox-viem";
import "@typechain/hardhat";
import "hardhat-gas-reporter";

import "./script/task";

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
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  mocha: {
    timeout: 10 * 60 * 1000,
  },
};

export default config;
