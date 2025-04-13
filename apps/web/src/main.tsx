import { createRoot } from "react-dom/client";
import React, { useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { BrowserRouter } from "react-router-dom";

import { metadata, networks, projectId, wagmiAdapter } from "./wagmi";
import App from "./pages/App";




import "./App.css";
import "@workspace/ui/styles/globals.css"

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
const modal = createAppKit({
   adapters: [wagmiAdapter],
   ...generalConfig,
   features: {
      analytics: true, // Optional - defaults to your Cloud configuration
   },
});

const Main = () => {
   useEffect(() => {
      const openConnectModalBtn = document.getElementById("open-connect-modal");
      const openNetworkModalBtn = document.getElementById("open-network-modal");

      openConnectModalBtn?.addEventListener("click", () => modal.open());
      openNetworkModalBtn?.addEventListener("click", () => modal.open({ view: "Networks" }));
   }, []);

   return (
      <React.StrictMode>
         <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
               <BrowserRouter>
                  <App />
               </BrowserRouter>
            </QueryClientProvider>
         </WagmiProvider>
      </React.StrictMode>
   );
};

createRoot(document.getElementById("app")!).render(<Main />);
