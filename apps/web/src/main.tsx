import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { BrowserRouter, useRoutes } from "react-router-dom";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import routes from "~react-pages";

import { queryClient, wagmiAdapter, QueryClientProvider, ThemeProvider } from "@/lib";
import AppLayout from "@/pages/_layout";

import "./index.css";
import "@workspace/ui/styles/globals.css";

export function App() {
   return <Suspense fallback={<p>Loading...</p>}>{useRoutes(routes)}</Suspense>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
   <React.StrictMode>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
         <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
               <BrowserRouter>
                  <AppLayout>
                     <App />
                  </AppLayout>
               </BrowserRouter>
            </ThemeProvider>
         </QueryClientProvider>
      </WagmiProvider>
   </React.StrictMode>,
);
