import { Copy, ExternalLink } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, toast } from "@workspace/ui/components/shadcn-ui";

import useCopyClipboard from "@/hooks/useCopyClipboard";
import { shortenAddress } from "@/utils";

const CopyOrExternalLink = ({
   text,
   link,
   type,
}: {
   text: string;
   link?: string;
   type: "tx" | "address" | "block";
}) => {
   const [, setCopied] = useCopyClipboard();

   return (
      <TooltipProvider>
         <Tooltip>
            <TooltipTrigger>
               <span className="text-foreground cursor-pointer underline">{shortenAddress(text)}</span>
            </TooltipTrigger>
            <TooltipContent className="flex gap-2">
               <Copy className="cursor-pointer" onClick={() => setCopied(text)} />
               <ExternalLink
                  className="cursor-pointer"
                  onClick={() => {
                     if (link) open(`${link}/${type}/${text}`);
                     else toast.warning("blockExplorers could not be found");
                  }}
               />
            </TooltipContent>
         </Tooltip>
      </TooltipProvider>
   );
};

export default CopyOrExternalLink;
