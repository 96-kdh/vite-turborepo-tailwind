import React, { createContext, useState } from "react";

import { SupportChainIds } from "@workspace/hardhat";

export enum BidPages {
   writeOrder,
   submitOrder,
   confirmOrder,
}

export type BidNetwork = {
   id: SupportChainIds;
   name: string;
   symbol: string;
   decimals: number;
};

type BidState = {
   fromChain: BidNetwork | null;
   fromAmount: string; // Do not know how to serialize a BigInt, unit eth
   toChain: BidNetwork | null;
   toAmount: string; // Do not know how to serialize a BigInt, unit eth
};

type BidContextState = {
   state: BidState;
   setState: (state: BidState) => void;
};

const initialState: BidContextState = {
   state: {
      fromChain: null,
      fromAmount: "",
      toChain: null,
      toAmount: "",
   },
   setState: () => {},
};

const BidSessionKey = "order-bid-state";

export const BidContext = createContext<BidContextState>(initialState);

export const BidContextProvider = ({ children, ...props }: { children: React.ReactNode }) => {
   const bidSession = sessionStorage.getItem(BidSessionKey);
   const [state, setState] = useState<BidState>(
      bidSession
         ? (JSON.parse(bidSession) as BidState)
         : {
              fromChain: null,
              fromAmount: "",
              toChain: null,
              toAmount: "",
           },
   );

   const value = {
      state,
      setState: (_state: BidState) => {
         sessionStorage.setItem(BidSessionKey, JSON.stringify(_state));
         setState(_state);
      },
   };

   return (
      <BidContext.Provider {...props} value={value}>
         {children}
      </BidContext.Provider>
   );
};
