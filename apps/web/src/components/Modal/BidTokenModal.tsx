import React, { useState } from "react";
import { PlusIcon } from "lucide-react";

import { networks } from "@/lib";

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
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";

export const BidTokenModal: React.FC = () => {
   const { chainId, switchNetwork } = useAppKitNetwork();
   const { isConnected } = useAppKitAccount(); // AppKit hook to get the address and check if the user is connected
   const { open } = useAppKit();

   const [fromNetwork, setFromNetwork] = useState<string>("");
   const [toNetwork, setToNetwork] = useState<string>("");

   const bidOrder = () => {
      if (!isConnected) return open();
      else if (Number(chainId) !== Number(fromNetwork)) {
         const selectedNetwork = networks.filter((network) => Number(network.id) === Number(fromNetwork));
         console.assert(selectedNetwork.length > 0, "selectedNetwork.length is zero error");
         return switchNetwork(selectedNetwork[0] as AppKitNetwork);
      }

      console.log(fromNetwork);
   };

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
            <Card className="w-full">
               <DialogHeader className="px-2.5">
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
