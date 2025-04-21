import { useEffect } from "react";
import { createAppKit } from "@reown/appkit/react";
import { zeroAddress, Log } from "viem";
import axios from "axios";

import { generalConfig, publicClients, wagmiAdapter } from "@/lib";
import AppSidebar from "@/components/_layout/SideNavBar";
import AppHeader from "@/components/_layout/Header";

import { SidebarProvider } from "@workspace/ui/components/shadcn-ui/sidebar";
import { Toaster } from "@workspace/ui/components/shadcn-ui/sonner";
import {
   AlchemyWebhookPayload,
   deployedHardhatAddresses,
   orderBookWithLzAbi,
   ownerAddress,
   SupportChainIds,
   SupportedEventSig,
} from "@workspace/hardhat";

// Create modal
const modal = createAppKit({
   ...generalConfig,
   adapters: [wagmiAdapter],
   features: {
      analytics: true, // Optional - defaults to your Cloud configuration
   },
});

const AppLayout = ({ children }: { children: React.ReactNode }) => {
   useEffect(() => {
      const openConnectModalBtn = document.getElementById("open-connect-modal");
      const openNetworkModalBtn = document.getElementById("open-network-modal");

      openConnectModalBtn?.addEventListener("click", () => modal.open());
      openNetworkModalBtn?.addEventListener("click", () => modal.open({ view: "Networks" }));

      // prod 또는 staging 은 알케미 WebHook 을 통한 이벤트 전달이 되는데, hardhat-local 환경은 지원이 안되니 직접 보내는 로직
      if (import.meta.env.VITE_NODE_ENV === "local") {
         const sendEvent = async (logs: Log[], chainId: SupportChainIds) => {
            const promiseTask = [];
            const supportedEventSigs = Object.values(SupportedEventSig());

            for (const log of logs) {
               const isSupported = supportedEventSigs.includes((log.topics[0] as string).toLowerCase());
               if (!isSupported) continue;

               const webhookPayload: AlchemyWebhookPayload = {
                  webhookId: "wh_wclh9c0e3nf3t4wn",
                  id: "whevt_1i58wb1ww2u3jzea",
                  createdAt: "",
                  type: "GRAPHQL",
                  event: {
                     data: {
                        block: {
                           hash: log.blockHash as string,
                           number: Number(log.blockNumber),
                           timestamp: Math.floor(Date.now() / 1000),
                           logs: [
                              {
                                 data: log.data,
                                 topics: log.topics,
                                 index: log.logIndex as number,
                                 account: {
                                    address: log.address,
                                 },
                                 transaction: {
                                    hash: log.transactionHash as string,
                                    nonce: 0,
                                    index: log.transactionIndex as number,
                                    gasPrice: "",
                                    maxFeePerGas: null,
                                    maxPriorityFeePerGas: null,
                                    from: { address: ownerAddress[chainId] },
                                    to: { address: zeroAddress },
                                    gas: 0,
                                    status: 0,
                                    gasUsed: 0,
                                    cumulativeGasUsed: 0,
                                    effectiveGasPrice: "0",
                                    createdContract: null,
                                 },
                              },
                           ],
                        },
                     },
                     sequenceNumber: "",
                     network: chainId === SupportChainIds.LOCALHOST ? "LOCALHOST" : "LOCALHOST_COPY",
                  },
               };
               promiseTask.push(
                  new Promise((resolve) =>
                     resolve(axios.post("http://localhost:3000/event", JSON.stringify(webhookPayload))),
                  ),
               );
            }

            await Promise.all(promiseTask).catch(console.error);
         };

         publicClients[SupportChainIds.LOCALHOST].watchContractEvent({
            address: deployedHardhatAddresses.OrderBookWithLz,
            abi: orderBookWithLzAbi,
            onLogs: (logs: Log[]) => sendEvent(logs, SupportChainIds.LOCALHOST),
         });

         publicClients[SupportChainIds.LOCALHOST_COPY].watchContractEvent({
            address: deployedHardhatAddresses.OrderBookWithLz,
            abi: orderBookWithLzAbi,
            onLogs: (logs: Log[]) => sendEvent(logs, SupportChainIds.LOCALHOST),
         });
      }
   }, []);

   return (
      <div>
         <SidebarProvider>
            <AppSidebar />
            <main className="relative min-h-screen w-full">
               <AppHeader />
               <section className="min-h-[calc(100vh-4rem)] w-full">{children}</section>
            </main>
         </SidebarProvider>
         <Toaster richColors />
      </div>
   );
};

export default AppLayout;
