import { PlusIcon } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

import { Button } from "@workspace/ui/components/shadcn-ui";
import { Avatar } from "@workspace/ui/components/shadcn-ui/avatar";
import { Card } from "@workspace/ui/components/shadcn-ui/card";

import {
   ListOrdersQuery,
   ListOrdersQueryVariables,
   Order_Status_Enum,
   useInfiniteListOrdersQuery,
} from "@/graphql/__generated__/types-and-hooks";

// react-window row renderer
const OrderRow: React.FC<
   ListChildComponentProps<{
      items: ListOrdersQuery["listOrders"]["items"];
   }>
> = ({ index, style, data }) => {
   const item = data.items[index];

   if (!item) return;

   return (
      <div style={style}>
         <Card className="flex h-[150px] items-center gap-4 rounded-lg p-4">
            <Avatar className="h-12 w-12 rounded-lg bg-gray-200 p-2">
               <img src="/vite.svg" alt="crypto" className="h-full w-full" />
            </Avatar>
            <div className="flex items-center gap-2">
               <p className="text-lg font-bold">{item.deposit_amount}</p>
               <p className="text-blue-600">Bid: {item.maker}</p>
               <p className="text-blue-600">Bid: {item.status}</p>
               <p className="text-blue-600">Bid: {item.deposit_amount}</p>
               <p className="text-blue-600">Bid: {item.deposit_amount}</p>
               <p className="text-blue-600">Bid: {item.deposit_amount}</p>
               <p className="text-blue-600">Bid: {item.deposit_amount}</p>
            </div>
         </Card>
      </div>
   );
};

const OrderTable = () => {
   const navigate = useNavigate();

   const baseVariables: Omit<ListOrdersQueryVariables, "cursor"> = {
      status: [Order_Status_Enum.CreateOrderLzReceive],
      limit: 10,
   };

   const { data, error, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
      useInfiniteListOrdersQuery(
         {
            endpoint: "http://localhost:4000/graphql",
            fetchParams: { headers: { "Content-Type": "application/json" } },
         },
         baseVariables,
         {
            initialPageParam: { limit: baseVariables.limit!, cursor: undefined },
            getNextPageParam: (lastPage) =>
               lastPage.listOrders.nextCursor
                  ? {
                       limit: baseVariables.limit!,
                       cursor: lastPage.listOrders.nextCursor,
                    }
                  : undefined,
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
         },
      );

   // flatMap to one array
   const allOrders = useMemo(
      () => (data ? data.pages.flatMap((p) => p.listOrders.items) : ([] as ListOrdersQuery["listOrders"]["items"])),
      [data],
   );

   // react-window onItemsRendered 콜백
   const handleItemsRendered = useCallback(
      (props: {
         visibleStartIndex: number;
         visibleStopIndex: number;
         overscanStartIndex: number;
         overscanStopIndex: number;
      }) => {
         if (props.visibleStopIndex >= allOrders.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage().catch(console.error);
         }
      },
      [allOrders.length, fetchNextPage, hasNextPage, isFetchingNextPage],
   );

   if (isLoading) return <div>Loading orders...</div>;
   if (isError) return <div>Error: {(error as Error).message}</div>;

   return (
      <div className="h-full w-full p-4 dark:bg-neutral-900">
         {/* 가상화 리스트 */}
         <List
            height={window.innerHeight - 80}
            itemCount={allOrders.length}
            itemSize={150}
            width="100%"
            itemData={{ items: allOrders }}
            onItemsRendered={handleItemsRendered}
         >
            {OrderRow}
         </List>

         {isFetchingNextPage && <div className="py-4 text-center">Loading more…</div>}

         <Button
            size="lg"
            className="bg-brandColor text-brandColor-foreground hover:bg-brandColor-300 fixed bottom-6 right-6 flex items-center rounded-full shadow-lg"
            onClick={() => navigate("/order/bid")}
         >
            <PlusIcon className="mr-2 h-5 w-5" />
            Bid Token
         </Button>
      </div>
   );
};

export default OrderTable;
