import React, { useMemo, useState } from "react";

import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
   Button,
   Calendar,
   Checkbox,
   Input,
   Label,
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@workspace/ui/components/shadcn-ui";

import { Order_Status_Enum } from "@/graphql/__generated__/types-and-hooks";
import { networks } from "@/lib";

const presetRanges = [
   { label: "0 ~ 50", min: 0, max: 50 },
   { label: "50 ~ 100", min: 50, max: 100 },
   { label: "100 ~ 500", min: 100, max: 500 },
];

const OrdersTableFilter: React.FC = () => {
   const [statusFilters, setStatusFilters] = useState<string[]>([]);
   const [srcFilters, setSrcFilters] = useState<string[]>([]);
   const [dstFilters, setDstFilters] = useState<string[]>([]);
   const [maker, setMaker] = useState("");
   const [depositRange, setDepositRange] = useState<string[]>([]);
   const [desiredRange, setDesiredRange] = useState<string[]>([]);
   const [customMinDeposit, setCustomMinDeposit] = useState<number | "">("");
   const [customMaxDeposit, setCustomMaxDeposit] = useState<number | "">("");
   const [customMinDesired, setCustomMinDesired] = useState<number | "">("");
   const [customMaxDesired, setCustomMaxDesired] = useState<number | "">("");
   const [createdFrom, setCreatedFrom] = useState<Date | undefined>(undefined);
   const [createdTo, setCreatedTo] = useState<Date | undefined>(undefined);

   const statusOptions = useMemo(() => Object.values(Order_Status_Enum).map((s) => ({ label: s, value: s })), []);
   const chainOptions = useMemo(() => networks.map((n) => ({ label: n.name, value: String(n.id) })), []);

   const toggleFilter = (value: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
      setList((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
   };

   const applyFilters = () => {
      // TODO: call your query with the filter state
      console.log({
         statusFilters,
         srcFilters,
         dstFilters,
         maker,
         depositRange,
         desiredRange,
         customMinDeposit,
         customMaxDeposit,
         customMinDesired,
         customMaxDesired,
         createdFrom,
         createdTo,
      });
   };

   return (
      <>
         <h2 className="mb-4 text-2xl font-semibold">Filter</h2>
         <Accordion type="multiple" className="space-y-4">
            {/* status */}
            <AccordionItem value="status">
               <AccordionTrigger>Status</AccordionTrigger>
               <AccordionContent className="space-y-2">
                  {statusOptions.map((opt) => (
                     <div key={opt.value} className="flex items-center">
                        <Checkbox
                           id={`status_${opt.value}`}
                           checked={statusFilters.includes(opt.value)}
                           onCheckedChange={() => toggleFilter(opt.value, statusFilters, setStatusFilters)}
                        />
                        <Label htmlFor={`status_${opt.value}`} className="ml-2">
                           {opt.label}
                        </Label>
                     </div>
                  ))}
               </AccordionContent>
            </AccordionItem>

            {/* srcChainId */}
            <AccordionItem value="srcChain">
               <AccordionTrigger>From Chain</AccordionTrigger>
               <AccordionContent className="space-y-2">
                  {chainOptions.map((opt) => (
                     <div key={opt.value} className="flex items-center">
                        <Checkbox
                           id={`src_${opt.value}`}
                           checked={srcFilters.includes(opt.value)}
                           onCheckedChange={() => toggleFilter(opt.value, srcFilters, setSrcFilters)}
                        />
                        <Label htmlFor={`src_${opt.value}`} className="ml-2">
                           {opt.label}
                        </Label>
                     </div>
                  ))}
               </AccordionContent>
            </AccordionItem>

            {/* dstChainId */}
            <AccordionItem value="dstChain">
               <AccordionTrigger>To Chain</AccordionTrigger>
               <AccordionContent className="space-y-2">
                  {chainOptions.map((opt) => (
                     <div key={opt.value} className="flex items-center">
                        <Checkbox
                           id={`dst_${opt.value}`}
                           checked={dstFilters.includes(opt.value)}
                           onCheckedChange={() => toggleFilter(opt.value, dstFilters, setDstFilters)}
                        />
                        <Label htmlFor={`dst_${opt.value}`} className="ml-2">
                           {opt.label}
                        </Label>
                     </div>
                  ))}
               </AccordionContent>
            </AccordionItem>

            {/* maker */}
            <AccordionItem value="maker">
               <AccordionTrigger>Maker</AccordionTrigger>
               <AccordionContent>
                  <Input placeholder="Maker address" value={maker} onChange={(e) => setMaker(e.target.value)} />
               </AccordionContent>
            </AccordionItem>

            {/* depositAmount */}
            <AccordionItem value="depositAmount">
               <AccordionTrigger>Deposit Amount</AccordionTrigger>
               <AccordionContent className="space-y-2">
                  {presetRanges.map((r) => (
                     <div key={r.label} className="flex items-center">
                        <Checkbox
                           id={`dep_${r.label}`}
                           checked={depositRange.includes(r.label)}
                           onCheckedChange={() => toggleFilter(r.label, depositRange, setDepositRange)}
                        />
                        <Label htmlFor={`dep_${r.label}`} className="ml-2">
                           {r.label}
                        </Label>
                     </div>
                  ))}
                  <div className="mt-2 flex items-center space-x-2">
                     <Input
                        type="number"
                        placeholder="Min"
                        value={customMinDeposit}
                        onChange={(e) => setCustomMinDeposit(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-20"
                     />
                     <span>~</span>
                     <Input
                        type="number"
                        placeholder="Max"
                        value={customMaxDeposit}
                        onChange={(e) => setCustomMaxDeposit(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-20"
                     />
                  </div>
               </AccordionContent>
            </AccordionItem>

            {/* desiredAmount */}
            <AccordionItem value="desiredAmount">
               <AccordionTrigger>Desired Amount</AccordionTrigger>
               <AccordionContent className="space-y-2">
                  {presetRanges.map((r) => (
                     <div key={r.label} className="flex items-center">
                        <Checkbox
                           id={`des_${r.label}`}
                           checked={desiredRange.includes(r.label)}
                           onCheckedChange={() => toggleFilter(r.label, desiredRange, setDesiredRange)}
                        />
                        <Label htmlFor={`des_${r.label}`} className="ml-2">
                           {r.label}
                        </Label>
                     </div>
                  ))}
                  <div className="mt-2 flex items-center space-x-2">
                     <Input
                        type="number"
                        placeholder="Min"
                        value={customMinDesired}
                        onChange={(e) => setCustomMinDesired(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-20"
                     />
                     <span>~</span>
                     <Input
                        type="number"
                        placeholder="Max"
                        value={customMaxDesired}
                        onChange={(e) => setCustomMaxDesired(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-20"
                     />
                  </div>
               </AccordionContent>
            </AccordionItem>

            {/* createdAt */}
            <AccordionItem value="createdAt">
               <AccordionTrigger>Created At</AccordionTrigger>
               <AccordionContent className="flex space-x-2">
                  <Popover>
                     <PopoverTrigger asChild>
                        <Button variant="outline" className="w-36">
                           {createdFrom ? createdFrom.toLocaleDateString() : "From"}
                        </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={createdFrom} onSelect={setCreatedFrom} initialFocus />
                     </PopoverContent>
                  </Popover>
                  <Popover>
                     <PopoverTrigger asChild>
                        <Button variant="outline" className="w-36">
                           {createdTo ? createdTo.toLocaleDateString() : "To"}
                        </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={createdTo} onSelect={setCreatedTo} initialFocus />
                     </PopoverContent>
                  </Popover>
               </AccordionContent>
            </AccordionItem>
         </Accordion>

         <Button onClick={applyFilters} className="mt-6 w-full bg-[#F0B90B] text-white hover:bg-yellow-500">
            APPLY
         </Button>
      </>
   );
};

export default OrdersTableFilter;
