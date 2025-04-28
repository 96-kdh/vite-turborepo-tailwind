// @ts-ignore
import { OpenOptions } from "@reown/appkit/dist/types/src/client";
import { AppKitNetwork } from "@reown/appkit/networks";
import { createAppKit, useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Log, zeroAddress } from "viem";

import {
   AlchemyWebhookPayload,
   SupportChainIds,
   SupportedEventSig,
   deployedHardhatAddresses,
   orderBookWithLzAbi,
   ownerAddress,
} from "@workspace/hardhat";

import { generalConfig, publicClients, wagmiAdapter } from "@/lib";

interface AppKitWrapReturnTypes {
   balance: bigint;
   address: `0x${string}` | undefined;
   chainId: SupportChainIds | number;
   isConnected: boolean;
   open: (options?: OpenOptions) => Promise<void>;
   switchNetwork: (network: AppKitNetwork) => void;
}

export const defaultChainId = SupportChainIds.LOCALHOST;

export const useAppKitWrap = (): AppKitWrapReturnTypes => {
   const { chainId: injectionChainId, switchNetwork } = useAppKitNetwork();
   const { address: injectionAddress, isConnected } = useAppKitAccount();
   const { open } = useAppKit();

   const [balance, setBalance] = useState<bigint>(0n);

   const chainId = useMemo(() => (injectionChainId ? Number(injectionChainId) : defaultChainId), [injectionChainId]);
   const address = useMemo(
      () => (injectionAddress ? (injectionAddress as `0x${string}`) : undefined),
      [injectionAddress],
   );
   const client = useMemo(
      () => (chainId in SupportChainIds ? publicClients[chainId as SupportChainIds] : undefined),
      [chainId],
   );

   const { data, isSuccess } = useQuery<bigint, Error>({
      queryKey: ["balance", chainId, address],
      queryFn: async () => {
         return address && client ? await client.getBalance({ address }) : 0n;
      },
      staleTime: 1000 * 60, // 1분 동안은 신선한 데이터로 간주
      gcTime: 1000 * 60 * 5, // 5분 동안 캐시 보관
   });

   useEffect(() => {
      if (!address) setBalance(0n);
      else if (isSuccess) setBalance(BigInt(data));
   }, [address, data, isSuccess]);

   return { balance, address, chainId, switchNetwork, isConnected, open };
};

// Create modal
const modal = createAppKit({
   ...generalConfig,
   adapters: [wagmiAdapter],
   features: {
      analytics: true, // Optional - defaults to your Cloud configuration
   },
});

export const useWeb3Modal = () => {
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
                     resolve(axios.post("http://localhost:3001/event", JSON.stringify(webhookPayload))),
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
};
