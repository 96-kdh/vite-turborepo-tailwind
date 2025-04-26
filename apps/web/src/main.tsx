import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { WagmiProvider } from "wagmi";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import routes from "~react-pages";

import { Toaster } from "@workspace/ui/components/shadcn-ui";
import "@workspace/ui/styles/globals.css";

import { useWeb3Modal } from "@/hooks/useAppKitWrap";
import { BidContextProvider, QueryClientProvider, ThemeProvider, queryClient, wagmiAdapter } from "@/lib";
import AppLayout from "@/pages/_layout";

import "./index.css";

export function App() {
   useWeb3Modal();

   return <Suspense fallback={<p>Loading...</p>}>{useRoutes(routes)}</Suspense>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
   <React.StrictMode>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
         <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
               <BrowserRouter>
                  <BidContextProvider>
                     <AppLayout>
                        <App />
                        <Toaster richColors />
                     </AppLayout>
                  </BidContextProvider>
               </BrowserRouter>
            </ThemeProvider>
         </QueryClientProvider>
      </WagmiProvider>
   </React.StrictMode>,
);
