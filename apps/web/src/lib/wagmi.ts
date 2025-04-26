import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, arbitrum, sepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { defineChain } from "@reown/appkit/networks";
export { WagmiProvider } from "wagmi";
import { Chain, createPublicClient, http, PublicClient } from "viem";

import { JsonRPC, SupportChainIds } from "@workspace/hardhat/script/constants";

// Get projectId from https://cloud.reown.com
const projectId = "178e3a1df5591e0679afb2c30476cc9e"; // this is a public projectId only to use on localhost

if (!projectId) {
   throw new Error("Project ID is not defined");
}

const metadata = {
   name: "AppKit",
   description: "AppKit Example",
   url: "https://reown.com", // origin must match your domain & subdomain
   icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// for custom networks visit -> https://docs.reown.com/appkit/react/core/custom-networks
export const networks = [mainnet, arbitrum, sepolia] as [AppKitNetwork, ...AppKitNetwork[]];

if (import.meta.env.VITE_NODE_ENV === "local") {
   networks.push(
      defineChain({
         id: SupportChainIds.LOCALHOST,
         caipNetworkId: "eip155:31337",
         chainNamespace: "eip155",
         name: "localhost:8545",
         nativeCurrency: {
            decimals: 18,
            name: "Ether",
            symbol: "ETH",
         },
         rpcUrls: {
            default: {
               http: ["http://127.0.0.1:8545/"],
               webSocket: ["ws://127.0.0.1:8545/"],
            },
         },
      }),
   );

   networks.push(
      defineChain({
         id: SupportChainIds.LOCALHOST_COPY,
         caipNetworkId: "eip155:31338",
         chainNamespace: "eip155",
         name: "localhost:8546",
         nativeCurrency: {
            decimals: 18,
            name: "Ether",
            symbol: "ETH",
         },
         rpcUrls: {
            default: {
               http: ["http://127.0.0.1:8546/"],
               webSocket: ["ws://127.0.0.1:8546/"],
            },
         },
      }),
   );
}

export const publicClients: Record<SupportChainIds, PublicClient> = networks.reduce(
   (clients, network) => {
      clients[network.id as SupportChainIds] = createPublicClient({
         chain: {
            ...network,
            id: Number(network.id),
            name: network.name,
         } as Chain,
         transport: http(network.rpcUrls.default.http[0] || JsonRPC[Number(network.id) as SupportChainIds]),
      });
      return clients;
   },
   {} as Record<SupportChainIds, PublicClient>,
);

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
   projectId,
   networks,
});

export const generalConfig = {
   projectId,
   networks,
   metadata,
   themeMode: "light" as const,
   themeVariables: {
      "--w3m-accent": "#000000",
   },
};
