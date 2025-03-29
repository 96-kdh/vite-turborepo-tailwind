import { SupportNetworks } from "../types";

export enum SupportChainIds {
   LOCALHOST = 31337,
   LOCALHOST_COPY = 31338,
   // BSC = 56,
   // BSC_TESTNET = 97,
   // BASE_SEPOLIA = 84532,
   // LINEA_SEPOLIA = 59141,
}

export const EndpointIds: { [key in SupportChainIds]: number } = {
   [SupportChainIds.LOCALHOST]: 1,
   [SupportChainIds.LOCALHOST_COPY]: 2,
};

export const NetworkToChainId: Partial<Record<SupportNetworks, SupportChainIds>> = {
   LOCALHOST: SupportChainIds.LOCALHOST,
   LOCALHOST_COPY: SupportChainIds.LOCALHOST_COPY,
   // [Network.ETH_SEPOLIA]: SupportChainIds.LOCALHOST,
};

export const JsonRPC: { [key in SupportChainIds]: string } = {
   [SupportChainIds.LOCALHOST]: "http://127.0.0.1:8545",
   [SupportChainIds.LOCALHOST_COPY]: "http://127.0.0.1:8546",
};
