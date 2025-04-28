import { CircleCheck } from "lucide-react";
import { useContext, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { decodeEventLog, formatUnits } from "viem";
import { useTransaction, useTransactionReceipt } from "wagmi";

import {
   EndpointIdToChainId,
   SupportChainIds,
   SupportEndpointIds,
   SupportedEvent,
   SupportedEventSig,
   orderBookWithLzAbi,
} from "@workspace/hardhat";
import { Button, Skeleton } from "@workspace/ui/components/shadcn-ui";

import CopyOrExternalLink from "@/components/Tooltip/CopyOrExternalLink";
import BidLayout from "@/components/_layout/order/bid/BidLayout";
import { BidContext, BidPages, publicClients } from "@/lib";

const Confirm = () => {
   const { txHash } = useParams();
   const navigate = useNavigate();
   const bidContext = useContext(BidContext);

   if (!txHash) {
      navigate("/order/bid");
      return;
   }

   const { data: receipt, isPending } = useTransactionReceipt({ hash: txHash as `0x${string}` });
   const { data: tx } = useTransaction({ hash: txHash as `0x${string}` });

   const client = useMemo(() => {
      if (!tx || !(tx.chainId in SupportChainIds)) return null;
      return publicClients[tx.chainId as SupportChainIds];
   }, [tx]);

   useEffect(() => {
      return () => {
         bidContext.setState({
            fromChain: null,
            fromAmount: "",
            toChain: null,
            toAmount: "",
         });
      };
   }, []);

   if (isPending || !receipt) {
      return (
         <BidLayout page={BidPages.confirmOrder}>
            <div className="flex h-full flex-1 flex-col">
               <div className="grid flex-1 content-evenly justify-items-start py-12">
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-4 flex-1" />
                  </div>
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="h-4 w-16" />
                     <Skeleton className="w-21 h-4" />
                  </div>
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="h-4 w-16" />
                     <Skeleton className="w-21 h-4" />
                  </div>
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="w-21 h-4" />
                     <Skeleton className="h-4 w-36" />
                  </div>
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="w-21 h-4" />
                     <Skeleton className="h-4 w-36" />
                  </div>
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="h-4 w-36" />
                     <Skeleton className="w-42 h-4" />
                  </div>
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="h-4 w-16" />
                     <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="max-w-120 flex w-full flex-row justify-between gap-24">
                     <Skeleton className="w-42 h-4" />
                     <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="max-w-120 flex w-full flex-col rounded border-4 p-1.5">
                     <div className="max-w-120 flex w-full flex-row justify-between">
                        <Skeleton className="w-42 h-16" />
                        <Skeleton className="h-16 w-24" />
                     </div>
                  </div>
               </div>
            </div>
         </BidLayout>
      );
   }

   return (
      <BidLayout page={BidPages.confirmOrder}>
         <div className="flex h-full flex-1 flex-col">
            <div className="grid flex-1 content-evenly justify-items-start py-12">
               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">Transaction Hash</span>
                  <CopyOrExternalLink
                     text={receipt.transactionHash}
                     link={client?.chain?.blockExplorers?.default.url}
                     type="tx"
                  />
               </div>
               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <div
                     className={`border-1 rounded-xs flex items-center gap-1 px-1 py-0.5 ${receipt.status === "success" ? "border-green-400" : "border-red-400"}`}
                  >
                     <CircleCheck
                        className={receipt.status === "success" ? "text-green-400" : "text-red-400"}
                        size={16}
                     />
                     <span className={`text-sm ${receipt.status === "success" ? "text-green-400" : "text-red-400"}`}>
                        {receipt.status}
                     </span>
                  </div>
               </div>
               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">Block</span>
                  <CopyOrExternalLink
                     text={String(receipt.blockNumber)}
                     link={client?.chain?.blockExplorers?.default.url}
                     type="block"
                  />
               </div>
               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">From</span>
                  <CopyOrExternalLink
                     text={receipt.from}
                     link={client?.chain?.blockExplorers?.default.url}
                     type="address"
                  />
               </div>

               {receipt.to && (
                  <div className="max-w-120 flex w-full flex-row justify-between">
                     <span className="text-muted-foreground">Interacted With (To)</span>
                     <CopyOrExternalLink
                        text={receipt.to}
                        link={client?.chain?.blockExplorers?.default.url}
                        type="address"
                     />
                  </div>
               )}

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">Value</span>
                  {tx ? (
                     <span className="text-foreground">
                        {formatUnits(tx.value, client?.chain?.nativeCurrency.decimals || 18)}{" "}
                        <span className="text-muted-foreground text-xs">
                           {client?.chain?.nativeCurrency.symbol || ""}
                        </span>
                     </span>
                  ) : (
                     <Skeleton className="h-4 flex-1" />
                  )}
               </div>
               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">Transaction Fee</span>
                  <span className="text-foreground">
                     {formatUnits(
                        BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice),
                        client?.chain?.nativeCurrency.decimals || 18,
                     )}{" "}
                     <span className="text-muted-foreground text-xs">{client?.chain?.nativeCurrency.symbol || ""}</span>
                  </span>
               </div>

               {receipt.logs.map((log) => {
                  const eventSig = log.topics[0];
                  if (!eventSig) return <></>;

                  // case SupportedEventSig()[SupportedEvent.CreateDstOrder].toLowerCase():
                  // case SupportedEventSig()[SupportedEvent.UpdateSrcOrder].toLowerCase():
                  // case SupportedEventSig()[SupportedEvent.UpdateDstOrder].toLowerCase():
                  switch (eventSig.toLowerCase()) {
                     case SupportedEventSig()[SupportedEvent.CreateSrcOrder].toLowerCase(): {
                        const result = decodeEventLog({
                           abi: orderBookWithLzAbi,
                           eventName: "CreateSrcOrder",
                           data: log.data,
                           topics: log.topics,
                        });
                        const { depositAmount, desiredAmount, dstEid } = result.args;
                        const dstChainId = EndpointIdToChainId[dstEid as SupportEndpointIds];
                        const dstClient = publicClients[dstChainId];

                        return (
                           <div className="max-w-120 flex w-full flex-col rounded border-4 p-1.5">
                              <div className="max-w-120 flex w-full flex-row justify-between">
                                 <span className="text-muted-foreground">Event Name</span>
                                 <span className="text-foreground">CreateOrder</span>
                              </div>

                              <div className="max-w-120 flex w-full flex-row justify-between">
                                 <span className="text-muted-foreground">You are deposit</span>
                                 <span className="text-foreground">
                                    {formatUnits(depositAmount, client?.chain?.nativeCurrency.decimals || 18)}{" "}
                                    <span className="text-muted-foreground text-xs">
                                       {client?.chain?.nativeCurrency.symbol || ""}
                                    </span>
                                 </span>
                              </div>

                              <div className="max-w-120 flex w-full flex-row justify-between">
                                 <span className="text-muted-foreground">You will receive</span>
                                 <span className="text-foreground">
                                    {formatUnits(desiredAmount, dstClient?.chain?.nativeCurrency.decimals || 18)}{" "}
                                    <span className="text-muted-foreground text-xs">
                                       {dstClient?.chain?.nativeCurrency.symbol || ""}
                                    </span>
                                 </span>
                              </div>
                           </div>
                        );
                     }
                     default:
                        return <></>;
                  }
               })}
            </div>

            <Button size="lg" variant="brand" className="max-w-160 w-full" onClick={() => navigate("/order")}>
               {"confirm"}
            </Button>
         </div>
      </BidLayout>
   );
};

export default Confirm;
