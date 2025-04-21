import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { formatUnits, parseUnits, getContract } from "viem";
import { useWriteContract } from "wagmi";
import { PlusIcon } from "lucide-react";

import useMissingFieldHighlight from "@/hooks/useMissingFieldHighlight";
import { networks, publicClients } from "@/lib";

import {
   ChainIdToEndpointId,
   contractAddresses,
   ContractNames,
   encodePayloadOrderBook,
   lzReceiveOption,
   SupportChainIds,
   orderBookWithLzAbi,
} from "@workspace/hardhat";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@workspace/ui/components/shadcn-ui/dialog";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@workspace/ui/components/shadcn-ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@workspace/ui/components/shadcn-ui/tooltip";
import { Card, CardContent } from "@workspace/ui/components/shadcn-ui/card";
import { Button } from "@workspace/ui/components/shadcn-ui/button";
import { toast } from "@workspace/ui/components/shadcn-ui/sonner";
import { Input } from "@workspace/ui/components/shadcn-ui/input";

export const BidTokenModal: React.FC = () => {
   const { chainId, switchNetwork } = useAppKitNetwork();
   const { address, isConnected } = useAppKitAccount();
   const { open } = useAppKit();

   const { writeContract } = useWriteContract();
   const { removeMissingFieldClassName, missingFieldCheck } = useMissingFieldHighlight();

   const [fromNetwork, setFromNetwork] = useState<string>("");
   const [toNetwork, setToNetwork] = useState<string>("");

   const [_depositAmount, setDepositAmount] = useState<string>("");
   const [_desiredAmount, setDesiredAmount] = useState<string>("");

   const [balance, setBalance] = useState<bigint>(0n);

   const maxHandler = useCallback(async () => {
      if (!fromNetwork || !toNetwork) {
         toast.warning("Select a network.", {
            description:
               "First, you need to select the network of the token you want to exchange and the network of the token you want to receive.",
         });
         return;
      }

      const [fromNetworkId, toNetworkId]: [SupportChainIds, SupportChainIds] = [Number(fromNetwork), Number(toNetwork)];

      const ca = contractAddresses[Number(fromNetwork) as SupportChainIds][ContractNames.OrderBookWithLz];
      const { createOrder, createOrderMockData } = encodePayloadOrderBook();
      const payload = createOrder(
         createOrderMockData(ChainIdToEndpointId[fromNetworkId], ChainIdToEndpointId[toNetworkId]),
      );

      const contract = getContract({
         address: ca,
         abi: orderBookWithLzAbi,
         client: publicClients[fromNetworkId],
      });
      const quoteTask = new Promise((resolve) =>
         resolve(contract.read.quote([ChainIdToEndpointId[toNetworkId], payload, lzReceiveOption(200_000n), false])),
      );
      const balanceTask = new Promise((resolve) =>
         resolve(publicClients[fromNetworkId].getBalance({ address: address as `0x${string}` })),
      );

      const values = (await Promise.all([quoteTask, balanceTask])) as [{ nativeFee: bigint }, bigint];

      // my balance >= native fee
      if (values[1] >= values[0].nativeFee) {
         const maxValue = values[1] - values[0].nativeFee;
         setDepositAmount(formatUnits(maxValue, publicClients[fromNetworkId].chain?.nativeCurrency.decimals || 18));
      }
   }, [fromNetwork, toNetwork]);
   const bidTokenSubmit = useCallback(async () => {
      if (!isConnected || !address) return open();
      else if (fromNetwork && Number(chainId) !== Number(fromNetwork)) {
         const selectedNetwork = networks.filter((network) => Number(network.id) === Number(fromNetwork));
         console.assert(selectedNetwork.length > 0, "selectedNetwork.length is zero error");
         return switchNetwork(selectedNetwork[0] as AppKitNetwork);
      }

      if (!fromNetwork || !toNetwork || !_depositAmount || !_desiredAmount) {
         return missingFieldCheck();
      }

      const [fromNetworkId, toNetworkId]: [SupportChainIds, SupportChainIds] = [Number(fromNetwork), Number(toNetwork)];
      const fromNetworkClient = publicClients[fromNetworkId];

      console.assert(fromNetworkId in SupportChainIds, "fromNetwork must be a SupportChainIds");
      console.assert(toNetworkId in SupportChainIds, "toNetworkId must be a SupportChainIds");

      const [depositAmount, desiredAmount]: [bigint, bigint] = [
         parseUnits(_depositAmount, fromNetworkClient.chain?.nativeCurrency.decimals || 18),
         parseUnits(_desiredAmount, fromNetworkClient.chain?.nativeCurrency.decimals || 18),
      ];

      const ca = contractAddresses[Number(fromNetwork) as SupportChainIds][ContractNames.OrderBookWithLz];
      const { createOrder } = encodePayloadOrderBook();
      const payload = createOrder({
         orderId: 0n,
         sender: address as `0x${string}`,
         srcEid: ChainIdToEndpointId[fromNetworkId],
         depositAmount: depositAmount,
         dstEid: ChainIdToEndpointId[toNetworkId],
         desiredAmount: desiredAmount,
      });

      const option = lzReceiveOption(200_000n);

      const quoteOutput = await fromNetworkClient.readContract({
         address: ca,
         abi: orderBookWithLzAbi,
         functionName: "quote",
         args: [ChainIdToEndpointId[toNetworkId], payload, option, false],
      });

      writeContract({
         address: ca,
         abi: orderBookWithLzAbi,
         functionName: "createOrder",
         args: [ChainIdToEndpointId[toNetworkId], depositAmount, desiredAmount, option],
         value: BigInt(quoteOutput.nativeFee) + depositAmount,
      });
   }, [isConnected, address, chainId, fromNetwork, toNetwork, _depositAmount, _desiredAmount]);
   const bidTokenSubmitText = useMemo(() => {
      if (!isConnected || !address) return "지갑 연결";
      else if (fromNetwork && Number(chainId) !== Number(fromNetwork)) return "네트워크 변경";

      return "주문 제안하기";
   }, [isConnected, address, chainId, fromNetwork]);

   useEffect(() => {
      setDepositAmount("");

      if (!address || !fromNetwork || !isConnected) {
         setBalance(0n);
         return;
      }

      const client = publicClients[Number(fromNetwork) as SupportChainIds];
      client
         .getBalance({ address: address as `0x${string}` })
         .then(setBalance)
         .catch(console.error);
   }, [address, fromNetwork, isConnected]);

   return (
      <Dialog>
         <DialogTrigger asChild>
            <Button
               size="lg"
               className="bg-brandColor text-brandColor-foreground hover:bg-brandColor-300 fixed bottom-6 right-6 flex items-center rounded-full shadow-lg"
            >
               <PlusIcon className="mr-2 h-5 w-5" />
               Bid Token
            </Button>
         </DialogTrigger>

         <DialogContent className="p-0 sm:mx-auto sm:max-w-lg">
            <Card className="w-full border-none">
               <DialogHeader className="px-4">
                  <DialogTitle>주문서 작성</DialogTitle>
                  <DialogDescription>교환할 네트워크와 토큰, 수량을 입력하고 주문을 제안하세요.</DialogDescription>
               </DialogHeader>
               <CardContent className="space-y-6">
                  {/* 교환할 토큰 */}
                  <div className="space-y-2">
                     <label className="text-foreground block text-sm font-medium">교환할 토큰</label>
                     <div className="flex gap-2">
                        <Select value={fromNetwork} onValueChange={setFromNetwork}>
                           <SelectTrigger
                              className="requireValue flex-1"
                              onFocus={removeMissingFieldClassName}
                              value={fromNetwork}
                           >
                              <SelectValue placeholder="네트워크 & 토큰 선택" />
                           </SelectTrigger>
                           <SelectContent>
                              {networks.map((net) => (
                                 <SelectItem
                                    key={net.id}
                                    value={String(net.id)}
                                    disabled={String(net.id) === toNetwork}
                                 >
                                    {net.name} ({net.nativeCurrency.symbol})
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>

                        {/* 수량 입력 + Max 버튼 */}
                        <Input
                           onFocus={removeMissingFieldClassName}
                           type="number"
                           placeholder="수량 입력"
                           className="requireValue flex-1"
                           value={_depositAmount}
                           onChange={(e) => setDepositAmount(e.target.value)}
                        />
                     </div>
                     {fromNetwork && address && (
                        <div className="text-muted-foreground -mt-1 flex items-center justify-between text-sm">
                           <span>
                              * balance:{" "}
                              {formatUnits(
                                 balance,
                                 publicClients[Number(fromNetwork) as SupportChainIds].chain?.nativeCurrency.decimals ||
                                    18,
                              ).toString()}{" "}
                              {publicClients[Number(fromNetwork) as SupportChainIds].chain?.nativeCurrency.symbol}
                           </span>
                           <TooltipProvider>
                              <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Button variant="brand" size="sm" className="h-6 px-2" onClick={maxHandler}>
                                       Max
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                    {!fromNetwork || !toNetwork
                                       ? "네트워크를 먼저 선택해주세요."
                                       : "네트워크 토큰의 잔액 일부가 이 트랜잭션의 네트워크 비용으로 할당되었습니다."}
                                 </TooltipContent>
                              </Tooltip>
                           </TooltipProvider>
                        </div>
                     )}
                  </div>

                  {/* 받을 토큰 */}
                  <div className="space-y-2">
                     <label className="text-foreground block text-sm font-medium">받을 토큰</label>
                     <div className="flex gap-2">
                        <Select value={toNetwork} onValueChange={setToNetwork}>
                           <SelectTrigger
                              className="requireValue flex-1"
                              onFocus={removeMissingFieldClassName}
                              value={toNetwork}
                           >
                              <SelectValue placeholder="네트워크 & 토큰 선택" />
                           </SelectTrigger>
                           <SelectContent>
                              {networks.map((net) => (
                                 <SelectItem
                                    key={net.id}
                                    value={String(net.id)}
                                    disabled={String(net.id) === fromNetwork}
                                 >
                                    {net.name} ({net.nativeCurrency.symbol})
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        <Input
                           onFocus={removeMissingFieldClassName}
                           type="number"
                           placeholder="수량 입력"
                           className="requireValue flex-1"
                           onChange={(e) => setDesiredAmount(e.target.value)}
                        />
                     </div>
                  </div>

                  {/* 주문 제안 버튼 */}
                  <Button
                     onClick={bidTokenSubmit}
                     variant="brand"
                     className="flex w-full items-center justify-center"
                     size="lg"
                     // disabled={true}
                  >
                     <PlusIcon className="mr-2 h-4 w-4" />
                     {bidTokenSubmitText}
                  </Button>
               </CardContent>
            </Card>
         </DialogContent>
      </Dialog>
   );
};
