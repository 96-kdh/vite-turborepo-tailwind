import React, { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";

import { networks, publicClients } from "@/lib";

import { Button } from "@workspace/ui/components/shadcn-ui/button";
import {
   Dialog,
   DialogTrigger,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@workspace/ui/components/shadcn-ui/dialog";
import { Card, CardContent } from "@workspace/ui/components/shadcn-ui/card";
import {
   Select,
   SelectTrigger,
   SelectValue,
   SelectContent,
   SelectItem,
} from "@workspace/ui/components/shadcn-ui/select";
import { Input } from "@workspace/ui/components/shadcn-ui/input";
import {
   contractAddresses,
   ContractNames,
   SupportChainIds,
   lzReceiveOption,
   encodePayloadOrderBook,
   ChainIdToEndpointId,
} from "@workspace/hardhat";
import { OrderBookABI } from "@/utils/constant";
import { useCustomWriteContract, useCustomReadContract } from "@/hooks/useContract";

import { abi } from "@workspace/hardhat/artifacts/contracts/orderBook/IOrderBook.sol/IOrderBook.json";
import type { OrderBook } from "@workspace/hardhat/typechain-types/contracts/exchange/OrderBook.sol/OrderBook";
import { useWaitForTransactionReceipt } from "wagmi";

export const BidTokenModal: React.FC = () => {
   const { chainId, switchNetwork } = useAppKitNetwork();
   const { address, isConnected } = useAppKitAccount(); // AppKit hook to get the account information
   const { open } = useAppKit();

   const { write, data: writeData, error: writeError, isSuccess } = useCustomWriteContract<OrderBook, "createOrder">();

   const { data: receipt } = useWaitForTransactionReceipt({
      hash: writeData,
      // confirmations: 2, // Wait for at least 2 confirmation
      timeout: 300000, // Timeout in milliseconds (5 minutes)
      pollingInterval: 1000,
   });

   const [fromNetwork, setFromNetwork] = useState<string>("");
   const [toNetwork, setToNetwork] = useState<string>("");

   const bidOrder = async () => {
      if (!isConnected) return open();
      else if (Number(chainId) !== Number(fromNetwork)) {
         const selectedNetwork = networks.filter((network) => Number(network.id) === Number(fromNetwork));
         console.assert(selectedNetwork.length > 0, "selectedNetwork.length is zero error");
         return switchNetwork(selectedNetwork[0] as AppKitNetwork);
      }

      const fromNetworkId: SupportChainIds = Number(fromNetwork);
      const toNetworkId: SupportChainIds = Number(toNetwork);
      console.assert(fromNetworkId in SupportChainIds, "fromNetwork must be a SupportChainIds");
      console.assert(toNetworkId in SupportChainIds, "toNetworkId must be a SupportChainIds");

      const client = publicClients[fromNetworkId];

      const ca = contractAddresses[Number(fromNetwork) as SupportChainIds][ContractNames.OrderBookWithLz];
      const { createOrder } = encodePayloadOrderBook();
      const payload = createOrder({
         orderId: 0n,
         sender: address as `0x${string}`,
         srcEid: ChainIdToEndpointId[fromNetworkId],
         depositAmount: 10000n,
         dstEid: ChainIdToEndpointId[toNetworkId],
         desiredAmount: 20000n,
      });
      console.log("payload: ", payload);

      // const res = await client.getGasPrice();

      const option = lzReceiveOption(200_000n);
      console.log("option: ", option);

      const abc = await client.readContract({
         address: ca,
         abi: abi,
         functionName: "quote",
         args: [ChainIdToEndpointId[toNetworkId], payload, option, false],
      });

      console.log(abc);

      write({
         address: ca,
         abi: OrderBookABI,
         functionName: "createOrder",
         args: [ChainIdToEndpointId[toNetworkId], 10000n, 20000n, option],
         value: BigInt(abc.nativeFee) + 10000n,
      });
   };

   useEffect(() => {
      console.log("writeData: ", writeData);
      console.log("writeError: ", writeError);
      console.log("isSuccess: ", isSuccess);

      console.log("receipt: ", receipt);
   }, [writeData, writeError, isSuccess, receipt]);

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
                           <SelectTrigger className="flex-1">
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
                        <Input type="number" placeholder="수량 입력" className="flex-1" />
                     </div>
                  </div>

                  {/* 받을 토큰 */}
                  <div className="space-y-2">
                     <label className="text-foreground block text-sm font-medium">받을 토큰</label>
                     <div className="flex gap-2">
                        <Select value={toNetwork} onValueChange={setToNetwork}>
                           <SelectTrigger className="flex-1">
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
                        <Input type="number" placeholder="수량 입력" className="flex-1" />
                     </div>
                  </div>

                  {/* 주문 제안 버튼 */}
                  <Button
                     onClick={bidOrder}
                     variant="brand"
                     className="flex w-full items-center justify-center"
                     size="lg"
                     // disabled={true}
                  >
                     <PlusIcon className="mr-2 h-4 w-4" />
                     주문 제안하기
                  </Button>
               </CardContent>
            </Card>
         </DialogContent>
      </Dialog>
   );
};
