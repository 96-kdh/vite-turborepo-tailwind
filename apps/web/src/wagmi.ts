import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, arbitrum, sepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { defineChain } from "@reown/appkit/networks";
import { SupportChainIds } from "@repo/hardhat/script/constants";

// Get projectId from https://cloud.reown.com
export const projectId = "178e3a1df5591e0679afb2c30476cc9e"; // this is a public projectId only to use on localhost

if (!projectId) {
   throw new Error("Project ID is not defined");
}

export const metadata = {
   name: "AppKit",
   description: "AppKit Example",
   url: "https://reown.com", // origin must match your domain & subdomain
   icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

const localhost = defineChain({
   id: SupportChainIds.LOCALHOST,
   caipNetworkId: "eip155:31337",
   chainNamespace: "eip155",
   name: "Custom Network(localhost)",
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
});

const localhost_copy = defineChain({
   id: SupportChainIds.LOCALHOST_COPY,
   caipNetworkId: "eip155:31338",
   chainNamespace: "eip155",
   name: "Custom Network(localhost_copy)",
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
});

// for custom networks visit -> https://docs.reown.com/appkit/react/core/custom-networks
export const networks = [mainnet, arbitrum, sepolia, localhost, localhost_copy] as [AppKitNetwork, ...AppKitNetwork[]];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
   projectId,
   networks,
});

export const config = wagmiAdapter.wagmiConfig;
