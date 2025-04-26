import { useContext } from "react";

import { Button } from "@workspace/ui/components/shadcn-ui";

import BidLayout from "@/components/_layout/order/bid/BidLayout";
import { BidContext, BidPages } from "@/lib";

const Confirm = () => {
   const bidContext = useContext(BidContext);
   // value.state.fromChainId

   return (
      <BidLayout page={BidPages.confirmOrder}>
         <div className="flex h-screen w-full flex-col bg-slate-50 md:h-auto">
            <div className="mx-auto w-full max-w-md rounded-lg bg-white p-4 shadow md:min-h-[600px] md:max-w-md">
               <div className="space-y-4">
                  <div className="grid gap-2">
                     <div className="flex justify-between">
                        <p className="text-sm text-gray-500">From</p>
                        <p className="text-base">
                           {"fromAmount"} {"fromToken"}
                        </p>
                     </div>
                     <div className="flex justify-between">
                        <p className="text-sm text-gray-500">To</p>
                        <p className="text-base">
                           {"toAmount"} {"toToken"}
                        </p>
                     </div>
                     <div className="flex justify-between">
                        <p className="text-sm text-gray-500">Estimated Gas Fee</p>
                        <p className="text-base">{"estimatedGas"}</p>
                     </div>
                  </div>
                  <a href="https://example.com/confirmation" target="_blank" rel="noopener noreferrer">
                     <Button className="w-full">Go to Confirmation</Button>
                  </a>
               </div>
            </div>
         </div>
      </BidLayout>
   );
};

export default Confirm;
