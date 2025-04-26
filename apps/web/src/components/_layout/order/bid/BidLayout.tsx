import React, { useEffect } from "react";

import { Progress } from "@workspace/ui/components/shadcn-ui";

import { BidPages } from "@/lib";

const BidLayout = ({ children, page }: { children: React.ReactNode; page: BidPages }) => {
   const bidHeader: { [key in BidPages]: string } = {
      [BidPages.writeOrder]: "주문 작성",
      [BidPages.submitOrder]: "주문 확인 및 제출",
      [BidPages.confirmOrder]: "최종 주문 확인",
   };

   const [progress, setProgress] = React.useState(page);

   useEffect(() => {
      const timer = setTimeout(() => setProgress(page + 1), 10);
      return () => clearTimeout(timer);
   }, []);

   return (
      <div className="h-full w-full bg-slate-50">
         <div className="md:max-h-4/5 max-w-300 mx-auto flex h-full w-full flex-col px-4 pb-2 pt-6 md:py-24">
            <Progress
               value={(progress / Object.keys(BidPages).filter((key) => isNaN(Number(key))).length) * 100}
               className="mb-6"
            />
            <h2 className="text-2xl font-bold">{bidHeader[page]}</h2>
            {children}
         </div>
      </div>
   );
};

export default BidLayout;
