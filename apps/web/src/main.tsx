import { createRoot } from "react-dom/client";
import React from "react";
import "@repo/tailwind-config/main.css";
import Action from "./action.js";
import Wallet from "./Wallet.js";
import { metadata, networks, projectId, wagmiAdapter } from "./wagmi.js";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";

import "./App.css";

const queryClient = new QueryClient();

const generalConfig = {
  projectId,
  networks,
  metadata,
  themeMode: "light" as const,
  themeVariables: {
    "--w3m-accent": "#000000",
  },
};

// Create modal
createAppKit({
  adapters: [wagmiAdapter],
  ...generalConfig,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

const App = () => (
  <React.StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Wallet />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

createRoot(document.getElementById("app")!).render(<App />);
