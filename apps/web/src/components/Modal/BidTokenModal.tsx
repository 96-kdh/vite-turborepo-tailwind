import type { AppKitNetwork } from "@reown/appkit/networks";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, getContract, parseUnits } from "viem";
import { useWriteContract } from "wagmi";

import {
   ChainIdToEndpointId,
   ContractNames,
   SupportChainIds,
   contractAddresses,
   encodePayloadOrderBook,
   lzReceiveOption,
   orderBookWithLzAbi,
} from "@workspace/hardhat";
import { Button } from "@workspace/ui/components/shadcn-ui/button";
import { Card, CardContent } from "@workspace/ui/components/shadcn-ui/card";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@workspace/ui/components/shadcn-ui/dialog";
import { Input } from "@workspace/ui/components/shadcn-ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@workspace/ui/components/shadcn-ui/select";
import { toast } from "@workspace/ui/components/shadcn-ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/shadcn-ui/tooltip";

import { useAppKitWrap } from "@/hooks/useAppKitWrap";
import useMissingFieldHighlight, {
   injectionClassName,
   injectionMissingClassName,
} from "@/hooks/useMissingFieldHighlight";
import { networks, publicClients } from "@/lib";

export const BidTokenModal: React.FC = () => {
   const { chainId, switchNetwork, address, isConnected, open, balance } = useAppKitWrap();
   const { writeContract } = useWriteContract();
   const queryClient = useQueryClient();

   const { removeMissingFieldClassName, missingFieldCheck } = useMissingFieldHighlight();

   const [fromNetwork, setFromNetwork] = useState<string>("");
   const [toNetwork, setToNetwork] = useState<string>("");

   const [_depositAmount, setDepositAmount] = useState<string>("");
   const [_desiredAmount, setDesiredAmount] = useState<string>("");

   const [selectNetworkBalance, setSelectNetworkBalance] = useState<bigint>(0n);

   const maxHandler = useCallback(async () => {
      if (!fromNetwork || !toNetwork) {
         toast.warning("Select a network.", {
            description:
               "First, you need to select the network of the token you want to exchange and the network of the token you want to receive.",
         });
         const el = document.getElementById("receiveTokenNetworkInputId");
         if (el) el.classList.add(injectionMissingClassName);
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
      if (!address || !fromNetwork) return setSelectNetworkBalance(0n);
      if (Number(fromNetwork) === chainId) {
         return setSelectNetworkBalance(balance);
      }

      const cachedBalance = queryClient.getQueryData<bigint>(["balance", Number(fromNetwork), address]);
      if (cachedBalance) return setSelectNetworkBalance(cachedBalance);

      publicClients[Number(fromNetwork) as SupportChainIds]
         .getBalance({ address: address })
         .then((_balance) => {
            setSelectNetworkBalance(_balance);
            queryClient.setQueryData(["balance", Number(fromNetwork), address], _balance);
         })
         .catch(console.error);
   }, [chainId, address, balance, fromNetwork]);

   useEffect(() => {
      setDepositAmount("");
      setDesiredAmount("");
      setDepositAmount("");
      setToNetwork("");
      setFromNetwork("");
   }, []);

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
                              className={`${injectionClassName} flex-1`}
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
                           className={`${injectionClassName} flex-1`}
                           value={_depositAmount}
                           onChange={(e) => setDepositAmount(e.target.value)}
                        />
                     </div>
                     {fromNetwork && address && (
                        <div className="text-muted-foreground -mt-1 flex items-center justify-between text-sm">
                           <span>
                              * balance:{" "}
                              {formatUnits(
                                 selectNetworkBalance,
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
                              id="receiveTokenNetworkInputId"
                              className={`${injectionClassName} flex-1`}
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
                           className={`${injectionClassName} flex-1`}
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
