import type { AppKitNetwork } from "@reown/appkit/networks";
import { ChevronDown, CircleX } from "lucide-react";
import React, { useState } from "react";

import {
   Dialog,
   DialogContent,
   DialogTitle,
   DialogTrigger,
   Input,
   ScrollArea,
} from "@workspace/ui/components/shadcn-ui";

import useMissingFieldHighlight, { injectionClassName } from "@/hooks/useMissingFieldHighlight";
import { BidNetwork, networks } from "@/lib";

const SelectTokenModal: React.FC<{
   value: BidNetwork | null;
   onChange: (v: AppKitNetwork) => void;
   deleteValue: () => void;
   selectedValues: BidNetwork[];
}> = ({ value, onChange, deleteValue, selectedValues }) => {
   const { removeMissingFieldClassName } = useMissingFieldHighlight();

   const [open, setOpen] = useState(false);
   const [search, setSearch] = useState("");

   const filtered = networks
      .map((net) => {
         const query = search.trim().toLowerCase();

         const idMatch = String(net.id).toLowerCase().includes(query);
         const nameMatch = net.name.toLowerCase().includes(query);
         const symbolMatch = net.nativeCurrency.symbol.toLowerCase().includes(query);

         let priority = Infinity;
         if (idMatch) priority = 0;
         else if (nameMatch) priority = 1;
         else if (symbolMatch) priority = 2;

         return { net, priority };
      })
      // 매칭되지 않은 항목 제거
      .filter((item) => item.priority !== Infinity)
      // 우선순위 순으로 정렬
      .sort((a, b) => a.priority - b.priority)
      // 원래 객체만 반환
      .map((item) => item.net);

   return (
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogTrigger asChild>
            <button
               value={value?.id}
               className={`${injectionClassName} flex min-h-8 w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 px-3 py-2 hover:border-gray-400 md:min-h-12 dark:border-gray-500`}
               onFocus={removeMissingFieldClassName}
            >
               <span className={`flex ${value ? "text-foreground" : "text-gray-400"}`}>
                  {value ? `${value.name} (${value.symbol})` : "토큰 및 네트워크 선택"}
                  {value && (
                     <CircleX
                        className="ml-1.5 hover:text-gray-400"
                        onClick={(e) => {
                           e.preventDefault();
                           deleteValue();
                        }}
                     />
                  )}
               </span>
               <ChevronDown className="h-5 w-5 text-gray-500" />
            </button>
         </DialogTrigger>
         <DialogContent className="bg-background top-[51%] flex h-[98%] min-h-0 w-full max-w-lg flex-col rounded-lg p-0 md:top-[50%] md:h-2/5 md:shadow-lg">
            <div className="border-b p-4">
               <DialogTitle className="text-center font-medium">토큰 선택</DialogTitle>
            </div>
            <div className="flex h-full min-h-0 flex-col p-4 pt-0">
               <Input
                  placeholder="name, symbol, ChainId .."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-4 p-4"
               />
               <ScrollArea className="h-[90%] w-full flex-1 rounded-md border">
                  {filtered.map((net) => {
                     const isSelected = selectedValues.filter((v) => v.id === net.id).length > 0;
                     return (
                        <div
                           key={net.id}
                           className={`hover:bg-muted cursor-pointer p-3 ${isSelected ? "bg-muted" : ""}`}
                           onClick={() => {
                              setSearch("");
                              onChange(net);
                              setOpen(false);
                           }}
                        >
                           {net.name} ({net.nativeCurrency.symbol})
                        </div>
                     );
                  })}
               </ScrollArea>
            </div>
         </DialogContent>
      </Dialog>
   );
};

export default SelectTokenModal;
