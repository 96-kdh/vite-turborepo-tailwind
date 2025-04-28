import copy from "copy-to-clipboard";
import { useCallback, useEffect, useState } from "react";

import { toast } from "@workspace/ui/components/shadcn-ui/sonner";

// copy uniswap hook, https://github.com/Uniswap/interface/blob/main/apps/web/src/hooks/useCopyClipboard.ts
export default function useCopyClipboard(timeout = 500): [boolean, (toCopy: string) => void] {
   const [isCopied, setIsCopied] = useState(false);

   const staticCopy = useCallback((text: string) => {
      const didCopy = copy(text);
      setIsCopied(didCopy);
      toast.message("copied to clipboard");
   }, []);

   useEffect(() => {
      if (isCopied) {
         const hide = setTimeout(() => {
            setIsCopied(false);
         }, timeout);

         return () => {
            clearTimeout(hide);
         };
      }
      return undefined;
   }, [isCopied, setIsCopied, timeout]);

   return [isCopied, staticCopy];
}
