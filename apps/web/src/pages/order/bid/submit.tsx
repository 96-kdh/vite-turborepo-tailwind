import type { AppKitNetwork } from "@reown/appkit/networks";
import { CircleAlert } from "lucide-react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { encodeFunctionData, formatUnits, parseUnits, zeroAddress } from "viem";
import { useWriteContract } from "wagmi";

import {
   ChainIdToEndpointId,
   ContractNames,
   ErrorMsg,
   SupportChainIds,
   contractAddresses,
   encodePayloadOrderBook,
   lzReceiveOption,
   orderBookWithLzAbi,
} from "@workspace/hardhat";
import { LoadingSpinner } from "@workspace/ui/components/custom-ui";
import {
   Button,
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
   toast,
} from "@workspace/ui/components/shadcn-ui";

import BidLayout from "@/components/_layout/order/bid/BidLayout";
import { useAppKitWrap } from "@/hooks/useAppKitWrap";
import { BidContext, BidPages, networks, publicClients } from "@/lib";

const SubmitOrder = () => {
   const navigate = useNavigate();
   const bidContext = useContext(BidContext);

   if (
      !bidContext.state.fromChain ||
      !bidContext.state.toChain ||
      !bidContext.state.fromAmount ||
      !bidContext.state.toAmount
   ) {
      navigate("/order/bid");
      return;
   }

   const { chainId, switchNetwork, address, isConnected, open, balance } = useAppKitWrap();
   const { writeContract, isSuccess, isPending, data, status, error } = useWriteContract();

   const [fromNetworkId, toNetworkId] = useMemo(() => {
      const [fromNetworkId, toNetworkId]: [SupportChainIds, SupportChainIds] = [
         Number(bidContext.state.fromChain?.id),
         Number(bidContext.state.toChain?.id),
      ];

      console.assert(fromNetworkId in SupportChainIds, "fromNetwork must be a SupportChainIds");
      console.assert(toNetworkId in SupportChainIds, "toNetworkId must be a SupportChainIds");

      return [fromNetworkId, toNetworkId];
   }, [bidContext.state.fromChain?.id, bidContext.state.toChain?.id]);
   const [depositAmount, desiredAmount] = useMemo(() => {
      const [depositAmount, desiredAmount]: [bigint, bigint] = [
         parseUnits(bidContext.state.fromAmount, bidContext.state.fromChain?.decimals || 18),
         parseUnits(bidContext.state.toAmount, bidContext.state.toChain?.decimals || 18),
      ];

      return [depositAmount, desiredAmount];
   }, [bidContext.state.fromAmount, bidContext.state.toAmount]);

   const [estimatedGas, setEstimatedGas] = useState<{ networkFee: bigint; crossChainFee: bigint }>({
      networkFee: BigInt(0),
      crossChainFee: BigInt(0),
   });

   const submitHandler = useCallback(async () => {
      if (!isConnected || !address) return open();
      else if (Number(chainId) !== fromNetworkId) {
         const selectedNetwork = networks.filter((network) => Number(network.id) === fromNetworkId);
         console.assert(selectedNetwork.length > 0, "selectedNetwork.length is zero error");
         return switchNetwork(selectedNetwork[0] as AppKitNetwork);
      }

      writeContract({
         address: contractAddresses[fromNetworkId as SupportChainIds][ContractNames.OrderBookWithLz],
         abi: orderBookWithLzAbi,
         functionName: "createOrder",
         args: [ChainIdToEndpointId[toNetworkId], depositAmount, desiredAmount, lzReceiveOption(200_000n)],
         value: estimatedGas.crossChainFee + depositAmount,
         chainId: fromNetworkId,
      });
   }, [
      isConnected,
      address,
      chainId,
      fromNetworkId,
      toNetworkId,
      depositAmount,
      desiredAmount,
      estimatedGas.crossChainFee,
   ]);
   const submitHandlerText = useMemo(() => {
      if (!isConnected || !address) return "Connect Wallet";
      else if (Number(chainId) !== Number(fromNetworkId)) return "Change Network";
      else if (balance < depositAmount + estimatedGas.networkFee + estimatedGas.crossChainFee) {
         return `Insufficient Balance`;
      }

      return "Submit";
   }, [isConnected, address, chainId, fromNetworkId, balance, depositAmount, estimatedGas]);

   useEffect(() => {
      const ca = contractAddresses[fromNetworkId as SupportChainIds][ContractNames.OrderBookWithLz];
      const { createOrder } = encodePayloadOrderBook();
      const payload = createOrder({
         orderId: 0n, //
         sender: zeroAddress, //
         srcEid: ChainIdToEndpointId[fromNetworkId],
         depositAmount: depositAmount,
         dstEid: ChainIdToEndpointId[toNetworkId],
         desiredAmount: desiredAmount,
      });
      const fromNetworkClient = publicClients[fromNetworkId];

      const promiseTask = [];
      promiseTask.push(
         fromNetworkClient.readContract({
            address: ca,
            abi: orderBookWithLzAbi,
            functionName: "quote",
            args: [ChainIdToEndpointId[toNetworkId], payload, lzReceiveOption(200_000n), false],
         }),
      );
      promiseTask.push(fromNetworkClient.getGasPrice());

      Promise.all(promiseTask).then((values) => {
         const [quoteOutput, gasPrice] = values as [{ nativeFee: bigint; lzTokenFee: bigint }, bigint];
         const { nativeFee } = quoteOutput;

         fromNetworkClient
            .estimateGas({
               account: zeroAddress,
               to: ca,
               data: encodeFunctionData({
                  abi: orderBookWithLzAbi,
                  functionName: "createOrder",
                  args: [ChainIdToEndpointId[toNetworkId], depositAmount, desiredAmount, lzReceiveOption(200_000n)],
               }),
               value: nativeFee + depositAmount,
            })
            .then((usedGas) => {
               setEstimatedGas({
                  networkFee: usedGas * gasPrice,
                  crossChainFee: nativeFee,
               });
            });
      });
   }, [fromNetworkId, toNetworkId, depositAmount, desiredAmount]);

   useEffect(() => {
      if (status === "idle" || status === "pending") return;
      else if (status === "error" && error) {
         if (error.message.includes(ErrorMsg.userRejected)) {
            toast.error(ErrorMsg.userRejected);
            return;
         }
         toast.error(error.name, { description: error.message });
         console.error(error);
         return;
      } else if (status === "success" && isSuccess && data) {
         navigate(`/order/bid/${data}`);
      }
   }, [status, error, isSuccess, data]);

   return (
      <BidLayout page={BidPages.submitOrder}>
         <div className="flex h-full flex-1 flex-col">
            <div className="grid flex-1 content-evenly justify-items-start py-12">
               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="text-foreground">{bidContext.state.fromChain.name}</span>
               </div>

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="text-foreground">{bidContext.state.toChain.name}</span>
               </div>

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">You are deposit</span>
                  <span className="text-foreground">
                     {bidContext.state.fromAmount}{" "}
                     <span className="text-muted-foreground text-xs">{bidContext.state.fromChain.symbol}</span>
                  </span>
               </div>

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">You will receive</span>
                  <span className="text-foreground">
                     {bidContext.state.toAmount}{" "}
                     <span className="text-muted-foreground text-xs">{bidContext.state.fromChain.symbol}</span>
                  </span>
               </div>

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="text-foreground">
                     1 <span className="text-muted-foreground text-xs">{bidContext.state.fromChain.symbol}</span> ={" "}
                     {(Number(bidContext.state.toAmount) / Number(bidContext.state.fromAmount) || 1).toString()}{" "}
                     <span className="text-muted-foreground text-xs">{bidContext.state.toChain.symbol}</span>
                  </span>
               </div>

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <div className="flex gap-2">
                     <span className="text-muted-foreground">Network Fee</span>
                     <TooltipProvider>
                        <Tooltip>
                           <TooltipTrigger>
                              <CircleAlert color="var(--muted-foreground)" size="18" />
                           </TooltipTrigger>
                           <TooltipContent>
                              <span>트랜잭션 비용</span>
                           </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                  </div>

                  <span className="text-foreground">
                     {formatUnits(estimatedGas.networkFee, bidContext.state.fromChain.decimals).toString()}{" "}
                     <span className="text-muted-foreground text-xs">{bidContext.state.fromChain.symbol}</span>
                  </span>
               </div>

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <div className="flex gap-2">
                     <span className="text-muted-foreground">CrossChain Fee</span>
                     <TooltipProvider>
                        <Tooltip>
                           <TooltipTrigger>
                              <CircleAlert color="var(--muted-foreground)" size="18" />
                           </TooltipTrigger>
                           <TooltipContent>
                              <span>크로스체인 이용 수수료로 value transfer 내부에 포함됩니다.</span>
                           </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                  </div>
                  <span className="text-foreground">
                     {formatUnits(estimatedGas.crossChainFee, bidContext.state.fromChain.decimals).toString()}{" "}
                     <span className="text-muted-foreground text-xs">{bidContext.state.fromChain.symbol}</span>
                  </span>
               </div>

               <div className="max-w-120 flex w-full flex-row justify-between">
                  <span className="text-muted-foreground">Total Fee</span>
                  <span className="text-foreground">
                     {formatUnits(
                        estimatedGas.networkFee + estimatedGas.crossChainFee,
                        bidContext.state.fromChain.decimals,
                     ).toString()}{" "}
                     <span className="text-muted-foreground text-xs">{bidContext.state.fromChain.symbol}</span>
                  </span>
               </div>
            </div>

            <div className="max-w-160 flex w-full justify-between gap-2">
               <Button className="flex-1" variant="outline" onClick={() => navigate("/order/bid")}>
                  Back
               </Button>
               <Button
                  variant="brand"
                  className="flex-1"
                  onClick={submitHandler}
                  disabled={submitHandlerText === "Insufficient Balance"}
               >
                  {isPending ? <LoadingSpinner /> : submitHandlerText}
               </Button>
            </div>
         </div>
      </BidLayout>
   );
};

export default SubmitOrder;
