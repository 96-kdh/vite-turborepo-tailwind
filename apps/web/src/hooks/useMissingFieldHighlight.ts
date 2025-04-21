import { toast } from "@workspace/ui/components/shadcn-ui/sonner";
import { EventHandler, FocusEvent, useEffect } from "react";

type FocusEventHandler<T = Element> = EventHandler<FocusEvent<T>>;

const UseMissingFieldHighlight = () => {
   const missingFieldCheck = () => {
      toast.warning("누락된 값이 존재합니다.");
      const elements = document.getElementsByClassName("requireValue");
      // @ts-ignore
      for (const el of elements) {
         console.log(el);
         if (el.value) continue;
         el.classList.add("missingField");
      }
   };

   const removeMissingFieldClassName: FocusEventHandler = (e: FocusEvent) => {
      e.target.classList.remove("missingField");
   };

   useEffect(() => {
      return () => {
         const elements = document.getElementsByClassName("requireValue");
         // @ts-ignore
         for (const el of elements) el.classList.remove("missingField");
      };
   }, []);

   return { missingFieldCheck, removeMissingFieldClassName };
};

export default UseMissingFieldHighlight;
