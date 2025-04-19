import { useContractRead, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import type { TypedContractMethod } from "@workspace/hardhat/typechain-types/common";
import { useEffect } from "react";
import { useAppKitNetwork } from "@reown/appkit/react";
import { AlchemyWebhookPayload, SupportChainIds, SupportedEventSig } from "@workspace/hardhat";
import { zeroAddress } from "viem";
import axios from "axios";

// 1) 문자열 키만 뽑아내기 (Symbol 키 제외)
type StringKeys<T> = Extract<keyof T, string>;

// 2) TypedContractMethod<[Args], Ret, Mode> 에서 Args 튜플만 꺼내는 헬퍼
type ExtractArgs<M> = M extends TypedContractMethod<infer A, any, any> ? A : never;

// ── Read Hook ──
export function useCustomReadContract<TContract, FN extends StringKeys<TContract>>(config: {
   address: `0x${string}`;
   abi: any[];
   functionName: FN;
   args: ExtractArgs<TContract[FN]>;
}) {
   return useContractRead({
      address: config.address,
      abi: config.abi,
      functionName: config.functionName,
      args: config.args as unknown[],
   });
}

// 후크가 반환할 형태를 미리 정의합니다.
export interface UseCustomWriteContractResult<TContract, FN extends StringKeys<TContract>> {
   write: (config: {
      address: `0x${string}`;
      abi: any[];
      functionName: FN;
      args: ExtractArgs<TContract[FN]>;
      value?: bigint;
   }) => void;
   isPending: boolean;
   isSuccess: boolean;
   isError: boolean;
   error: Error | null;
   data?: `0x${string}`;
}

// ── Write Hook ──
export function useCustomWriteContract<TContract, FN extends StringKeys<TContract>>(): UseCustomWriteContractResult<
   TContract,
   FN
> {
   const { writeContract, isPending, isSuccess, isError, error, data } = useWriteContract();
   const { chainId } = useAppKitNetwork();

   const { data: receipt } = useWaitForTransactionReceipt({
      hash: data,
      // confirmations: 2, // Wait for at least 2 confirmation
      timeout: 300000, // Timeout in milliseconds (5 minutes)
      pollingInterval: 1000,
   });

   function write(config: {
      address: `0x${string}`;
      abi: any[];
      functionName: FN;
      args: ExtractArgs<TContract[FN]>;
      value?: bigint;
   }) {
      writeContract({
         address: config.address,
         abi: config.abi,
         functionName: config.functionName,
         args: config.args as unknown[],
         value: config.value,
      });
   }

   useEffect(() => {
      if (!receipt || !isSuccess) return;
      if (chainId === SupportChainIds.LOCALHOST || chainId === SupportChainIds.LOCALHOST_COPY) {
         const promiseTask = [];
         const supportedEventSigs = Object.values(SupportedEventSig());

         for (const log of receipt.logs) {
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
                        hash: log.blockHash,
                        number: Number(log.blockNumber),
                        timestamp: Math.floor(Date.now() / 1000),
                        logs: [
                           {
                              data: log.data,
                              topics: log.topics,
                              index: log.logIndex,
                              account: {
                                 address: log.address,
                              },
                              transaction: {
                                 hash: log.transactionHash,
                                 nonce: 0,
                                 index: log.transactionIndex,
                                 gasPrice: "",
                                 maxFeePerGas: null,
                                 maxPriorityFeePerGas: null,
                                 from: { address: receipt.from },
                                 to: { address: receipt.to || zeroAddress },
                                 gas: 0,
                                 status: 0,
                                 gasUsed: Number(receipt.gasUsed),
                                 cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
                                 effectiveGasPrice: receipt.effectiveGasPrice.toString(),
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

         Promise.all(promiseTask).catch(console.error);
      }
   }, [receipt, isSuccess, chainId]);

   return { write, isPending, isSuccess, isError, error, data };
}
