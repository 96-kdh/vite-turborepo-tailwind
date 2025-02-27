import { createRoot } from "react-dom/client";
import React from "react";
import "@repo/tailwind-config/main.css";
import Action from "./action.js";
import Wallet from "./Wallet.js";
import { config } from "./wagmi.js";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

const App = () => (
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Wallet />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

createRoot(document.getElementById("app")!).render(<App />);
