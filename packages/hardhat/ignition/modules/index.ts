import hre from "hardhat";
import pc from "picocolors";

import { SupportChainIds } from "../../script";

const originalLog = console.log;
const color = SupportChainIds.LOCALHOST === hre.network.config.chainId ? pc.red : pc.green;
const colorPrefix = color(`[${hre.network.config.chainId}]: `);

console.log = (...args) => {
   originalLog.call(console, colorPrefix, ...args);
};
