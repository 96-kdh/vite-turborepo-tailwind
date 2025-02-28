export enum SupportChainIds {
  LOCALHOST = 31337,
  // BSC = 56,
  // BSC_TESTNET = 97,
  // BASE_SEPOLIA = 84532,
  // LINEA_SEPOLIA = 59141,
}

export enum ContractNames {
  Lock = "Lock",
}

export const contractAddresses: {
  [key in SupportChainIds]: { [key in ContractNames]: `0x${string}` };
} = {
  [SupportChainIds.LOCALHOST]: {
    [ContractNames.Lock]: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  },
};
