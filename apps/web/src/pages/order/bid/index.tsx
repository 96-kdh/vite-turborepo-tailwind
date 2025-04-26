import type { AppKitNetwork } from "@reown/appkit/networks";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { formatUnits, getContract } from "viem";

import {
   ChainIdToEndpointId,
   ContractNames,
   SupportChainIds,
   contractAddresses,
   encodePayloadOrderBook,
   lzReceiveOption,
   orderBookWithLzAbi,
} from "@workspace/hardhat";
import {
   Button,
   Input,
   Label,
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@workspace/ui/components/shadcn-ui";
import { toast } from "@workspace/ui/components/shadcn-ui/sonner";

import SelectTokenModal from "@/components/Modal/SelectTokenModal";
import BidLayout from "@/components/_layout/order/bid/BidLayout";
import { useAppKitWrap } from "@/hooks/useAppKitWrap";
import useMissingFieldHighlight, { injectionClassName } from "@/hooks/useMissingFieldHighlight";
import { BidContext, BidNetwork, BidPages, publicClients } from "@/lib";

const WriteOrder = () => {
   const navigate = useNavigate();
   const bidContext = useContext(BidContext);
   const queryClient = useQueryClient();

   const { chainId, address, balance } = useAppKitWrap();
   const { removeMissingFieldClassName, missingFieldCheck } = useMissingFieldHighlight();

   const [selectNetworkBalance, setSelectNetworkBalance] = useState<bigint>(0n);

   const maxHandler = useCallback(async () => {
      const fromNetwork = bidContext.state.fromChain?.id;
      const toNetwork = bidContext.state.toChain?.id;

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
         bidContext.setState({
            ...bidContext.state,
            fromAmount: formatUnits(maxValue, publicClients[fromNetworkId].chain?.nativeCurrency.decimals || 18),
         });
      }
   }, [bidContext.state.fromChain?.id, bidContext.state.toChain?.id]);

   const selectTokenHandler = useCallback(
      (network: AppKitNetwork, key: "fromChain" | "toChain") => {
         console.assert(network.id in SupportChainIds, "not supported network id");

         const otherKey = key === "fromChain" ? "toChain" : "fromChain";
         const otherState = bidContext.state[otherKey]?.id === network.id ? null : bidContext.state[otherKey];
         bidContext.setState({
            ...bidContext.state,
            [key]: {
               id: Number(network.id) as SupportChainIds,
               name: network.name,
               symbol: network.nativeCurrency.symbol,
               decimals: network.nativeCurrency.decimals,
            },
            [otherKey]: otherState,
         });
      },
      [bidContext],
   );
   const selectedValues = useMemo(() => {
      const array: BidNetwork[] = [];
      if (bidContext.state.fromChain) array.push(bidContext.state.fromChain);
      if (bidContext.state.toChain) array.push(bidContext.state.toChain);

      return array;
   }, [bidContext.state.fromChain, bidContext.state.toChain]);

   useEffect(() => {
      if (!address || !bidContext.state.fromChain?.id) return setSelectNetworkBalance(0n);
      if (Number(bidContext.state.fromChain.id) === chainId) {
         return setSelectNetworkBalance(balance);
      }

      const fromNetworkChainId = Number(bidContext.state.fromChain.id) as SupportChainIds;
      const cachedBalance = queryClient.getQueryData<bigint>(["balance", fromNetworkChainId, address]);
      if (cachedBalance) return setSelectNetworkBalance(cachedBalance);

      publicClients[fromNetworkChainId]
         .getBalance({ address: address })
         .then((_balance) => {
            setSelectNetworkBalance(_balance);
            queryClient.setQueryData(["balance", fromNetworkChainId, address], _balance);
         })
         .catch(console.error);
   }, [chainId, address, balance, bidContext.state.fromChain?.id]);

   return (
      <BidLayout page={BidPages.writeOrder}>
         <div className="flex h-full flex-1 flex-col">
            <div className="grid flex-1 content-evenly justify-items-start">
               <div className="max-w-120 w-full">
                  <Label className="mb-1 text-lg font-bold">From Token</Label>
                  <SelectTokenModal
                     value={bidContext.state.fromChain}
                     onChange={(network: AppKitNetwork) => selectTokenHandler(network, "fromChain")}
                     deleteValue={() => bidContext.setState({ ...bidContext.state, fromChain: null })}
                     selectedValues={selectedValues}
                  />
               </div>
               <div className="max-w-120 w-full">
                  <Label className="mb-1 text-lg font-bold">To Token</Label>
                  <SelectTokenModal
                     value={bidContext.state.toChain}
                     onChange={(network: AppKitNetwork) => selectTokenHandler(network, "toChain")}
                     deleteValue={() => bidContext.setState({ ...bidContext.state, toChain: null })}
                     selectedValues={selectedValues}
                  />
               </div>
               <div className="max-w-120 relative w-full">
                  <Label className="mb-1 text-lg font-bold">From Amount</Label>
                  <Input
                     className={`${injectionClassName} min-h-8 md:min-h-12`}
                     type="number"
                     placeholder="0.0"
                     value={bidContext.state.fromAmount}
                     onChange={(e) => bidContext.setState({ ...bidContext.state, fromAmount: e.target.value })}
                     onFocus={removeMissingFieldClassName}
                  />
                  <div
                     className={`text-muted-foreground absolute mt-0.5 flex w-full items-center justify-between text-sm ${bidContext.state.fromChain?.id && address && bidContext.state.toChain?.id ? "visible" : "invisible"}`}
                  >
                     <span>
                        * balance:{" "}
                        {formatUnits(selectNetworkBalance, bidContext.state.fromChain?.decimals || 18).toString()}{" "}
                        {bidContext.state.fromChain?.symbol || ""}
                     </span>
                     <TooltipProvider>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button size="sm" className="h-6 rounded-md px-2" onClick={maxHandler}>
                                 Max
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                              {!bidContext.state.fromChain?.id || !bidContext.state.toChain?.id
                                 ? "네트워크를 먼저 선택해주세요."
                                 : "네트워크 토큰의 잔액 일부가 이 트랜잭션의 네트워크 비용으로 할당되었습니다."}
                           </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                  </div>
               </div>
               <div className="max-w-120 w-full">
                  <Label className="mb-1 text-lg font-bold">To Amount</Label>
                  <Input
                     className={`${injectionClassName} min-h-8 md:min-h-12`}
                     type="number"
                     placeholder="0.0"
                     value={bidContext.state.toAmount}
                     onChange={(e) => bidContext.setState({ ...bidContext.state, toAmount: e.target.value })}
                     onFocus={removeMissingFieldClassName}
                  />
               </div>
            </div>
            <Button
               size="lg"
               className="max-w-160 w-full"
               onClick={() => {
                  const { fromChain, fromAmount, toAmount, toChain } = bidContext.state;

                  if (!fromChain?.id || !toChain?.id || !fromAmount || !toAmount) {
                     return missingFieldCheck();
                  }

                  navigate("/order/bid/submit");
               }}
            >
               Preview Order
            </Button>
         </div>
      </BidLayout>
   );
};

export default WriteOrder;
