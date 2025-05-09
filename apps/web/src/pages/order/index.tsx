import React from "react";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@workspace/ui/components/shadcn-ui";

import OrdersTable from "@/components/_pages/order/list/OrdersTable";
import OrdersTableFilter from "@/components/_pages/order/list/OrdersTableFilter";

export const OrderListPage: React.FC = () => {
   return (
      <ResizablePanelGroup
         direction="horizontal"
         className="flex h-full text-gray-800 dark:bg-neutral-900 dark:text-gray-100"
      >
         <ResizablePanel defaultSize={20} className="overflow-auto! p-6">
            <OrdersTableFilter />
         </ResizablePanel>

         <ResizableHandle withHandle />

         <ResizablePanel defaultSize={80} className="flex-1 overflow-auto p-6">
            <OrdersTable />
         </ResizablePanel>
      </ResizablePanelGroup>
   );
};

export default OrderListPage;
