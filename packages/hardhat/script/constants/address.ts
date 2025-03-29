import { SupportChainIds } from "./network";

export enum ContractNames {
   EndpointV2Mock = "EndpointV2Mock",
   OrderBookWithLz = "OrderBookWithLz",
}

const deployedHardhatAddresses: { [key in ContractNames]: `0x${string}` } = {
   [ContractNames.EndpointV2Mock]: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
   [ContractNames.OrderBookWithLz]: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
};

export const contractAddresses: {
   [key in SupportChainIds]: { [key in ContractNames]: `0x${string}` };
} = {
   [SupportChainIds.LOCALHOST]: deployedHardhatAddresses,
   [SupportChainIds.LOCALHOST_COPY]: deployedHardhatAddresses,
};

export const ownerAddress: {
   [key in SupportChainIds]: `0x${string}`;
} = {
   [SupportChainIds.LOCALHOST]: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
   [SupportChainIds.LOCALHOST_COPY]: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
};
