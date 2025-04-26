import { EventHandler, FocusEvent, useEffect } from "react";

import { toast } from "@workspace/ui/components/shadcn-ui/sonner";

type FocusEventHandler<T = Element> = EventHandler<FocusEvent<T>>;

export const injectionClassName = "requireValue";
export const injectionMissingClassName = "missingField";

const UseMissingFieldHighlight = () => {
   const missingFieldCheck = () => {
      toast.warning("누락된 값이 존재합니다.");
      const elements = document.getElementsByClassName(injectionClassName);
      // @ts-ignore
      for (const el of elements) {
         if (el.value) continue;
         el.classList.add(injectionMissingClassName);
      }
   };

   const removeMissingFieldClassName: FocusEventHandler = (e: FocusEvent) => {
      e.target.classList.remove(injectionMissingClassName);
   };

   useEffect(() => {
      return () => {
         const elements = document.getElementsByClassName(injectionClassName);
         // @ts-ignore
         for (const el of elements) el.classList.remove(injectionMissingClassName);
      };
   }, []);

   return { missingFieldCheck, removeMissingFieldClassName };
};

export default UseMissingFieldHighlight;
