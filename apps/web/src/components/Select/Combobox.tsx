import { Check, ChevronDown } from "lucide-react";
import React from "react";

import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@workspace/ui/components/shadcn-ui";
import { cn } from "@workspace/ui/lib/utils";

const Combobox = ({
   label,
   value,
   values,
   setValue,
}: {
   label: string;
   value: string;
   values: { label: string; value: string }[];
   setValue: React.Dispatch<React.SetStateAction<string>>;
}) => {
   const [open, setOpen] = React.useState(false);

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger>
            <div className="inline-flex items-center justify-between gap-0.5 rounded-lg bg-gray-100 px-3 py-1">
               <span className="text-sm font-medium text-gray-800">
                  {value ? values.find((v) => v.value === value)?.label : label}
               </span>

               <ChevronDown className="h-4 w-4 text-gray-800" />
            </div>
         </PopoverTrigger>

         <PopoverContent className="p-0" side="right" align="start">
            <Command>
               <CommandInput placeholder="Change status..." />
               <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                     {values.map((v) => (
                        <CommandItem
                           key={v.value}
                           value={v.label}
                           onSelect={(currentValue) => {
                              setValue(currentValue === value ? "" : currentValue);
                              setOpen(false);
                           }}
                        >
                           {v.label}
                           <Check className={cn("ml-auto", value === v.value ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                     ))}
                  </CommandGroup>
               </CommandList>
            </Command>
         </PopoverContent>
      </Popover>
   );
};

export default Combobox;
