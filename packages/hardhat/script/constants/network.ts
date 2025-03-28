import { SupportNetwork } from "../types";

export enum SupportChainIds {
   LOCALHOST = 31337,
   // BSC = 56,
   // BSC_TESTNET = 97,
   // BASE_SEPOLIA = 84532,
   // LINEA_SEPOLIA = 59141,
}

export enum EndpointIds {
   LOCALHOST__A = 1,
   LOCALHOST__B = 2,
}

export const NetworkToChainId: Partial<Record<SupportNetwork, SupportChainIds>> = {
   LOCALHOST: SupportChainIds.LOCALHOST,
   // [Network.ETH_SEPOLIA]: SupportChainIds.LOCALHOST,
};
