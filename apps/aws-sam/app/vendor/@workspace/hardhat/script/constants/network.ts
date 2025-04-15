import { SupportNetworks } from "../types";

export enum SupportChainIds {
   LOCALHOST = 31337,
   LOCALHOST_COPY = 31338,
}

export enum SupportEndpointIds {
   LOCALHOST = 1,
   LOCALHOST_COPY = 2,
}

export const ChainIdToEndpointId: { [key in SupportChainIds]: SupportEndpointIds } = {
   [SupportChainIds.LOCALHOST]: SupportEndpointIds.LOCALHOST,
   [SupportChainIds.LOCALHOST_COPY]: SupportEndpointIds.LOCALHOST_COPY,
};

export const EndpointIdToChainId: { [key in SupportEndpointIds]: SupportChainIds } = {
   [SupportEndpointIds.LOCALHOST]: SupportChainIds.LOCALHOST,
   [SupportEndpointIds.LOCALHOST_COPY]: SupportChainIds.LOCALHOST_COPY,
};

export const NetworkToChainId: Partial<Record<SupportNetworks, SupportChainIds>> = {
   LOCALHOST: SupportChainIds.LOCALHOST,
   LOCALHOST_COPY: SupportChainIds.LOCALHOST_COPY,
};

export const JsonRPC: { [key in SupportChainIds]: string } = {
   [SupportChainIds.LOCALHOST]: "http://127.0.0.1:8545",
   [SupportChainIds.LOCALHOST_COPY]: "http://127.0.0.1:8546",
};
