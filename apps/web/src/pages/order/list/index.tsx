import { useQuery } from "@tanstack/react-query";

import { Avatar } from "@workspace/ui/components/shadcn-ui/avatar";
import { Card } from "@workspace/ui/components/shadcn-ui/card";

import { BidTokenModal } from "@/components/Modal/BidTokenModal";

const OrderList = () => {
   async function graphqlFetcher<T>(query: string, variables?: Record<string, any>): Promise<T> {
      const response = await fetch("http://localhost:4000/graphql", {
         // 여러분의 GraphQL 엔드포인트
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({ query, variables }),
      });
      const json = await response.json();
      if (json.errors) {
         throw new Error(json.errors[0]?.message || "GraphQL Error");
      }
      return json.data;
   }

   const LIST_ORDERS_BY_STATUS_QUERY = `
  query ListOrdersByStatus($orderStatus: Int!, $createdAtFrom: Int, $createdAtTo: Int) {
    listOrdersByStatus(orderStatus: $orderStatus, createdAtFrom: $createdAtFrom, createdAtTo: $createdAtTo) {
      items {
        orderId
        chainId
        maker
        taker
        orderStatus
        createdAt
        depositAmount
        desiredAmount
        updatedAt
        blockNumber
      }
      nextToken
    }
  }
`;

   type Order = {
      orderId: string;
      chainId: number;
      maker: string;
      taker?: string;
      orderStatus: number;
      createdAt: number;
      depositAmount?: number;
      desiredAmount?: number;
      updatedAt?: number;
      blockNumber?: number;
   };

   type PaginatedOrders = {
      items: Order[];
      nextToken: string | null;
   };

   const mockData: Order = {
      orderId: "999",
      chainId: 999,
      maker: "0x..kim",
      taker: "0x..kkk",
      orderStatus: 1,
      createdAt: Date.now(),
      depositAmount: 10,
      desiredAmount: 30,
   };

   // useQuery를 객체 형식으로 사용 (v5 방식)
   const {
      data: data2,
      error,
      isLoading,
   } = useQuery<PaginatedOrders, Error>({
      queryKey: ["ordersByStatus", 1, LIST_ORDERS_BY_STATUS_QUERY],
      queryFn: async () => {
         const res = await graphqlFetcher<{ listOrdersByStatus: PaginatedOrders }>(LIST_ORDERS_BY_STATUS_QUERY, {
            orderStatus: 1,
            createdAtFrom: 0,
         });
         return res.listOrdersByStatus;
      },
   });

   if (isLoading) return <div>Loading orders...</div>;
   if (error) return <div>Error: {error.message}</div>;
   console.log(data2);

   return (
      <div className="px-6 py-4">
         {/* Auction List */}
         <div className="space-y-4">
            {[mockData].map((item, index) => (
               <Card key={index} className="flex items-center gap-4 rounded-lg p-4 shadow">
                  <Avatar className="h-12 w-12 rounded-lg bg-gray-200 p-2">
                     <img src="/vite.svg" alt="crypto" className="h-full w-full" />
                  </Avatar>
                  <div>
                     <p className="text-3xl text-lg font-bold font-medium">{item.depositAmount}</p>
                     <p className="text-blue-600">Bid: {item.maker}</p>
                  </div>
               </Card>
            ))}
         </div>
         <BidTokenModal />
      </div>
   );
};

export default OrderList;
