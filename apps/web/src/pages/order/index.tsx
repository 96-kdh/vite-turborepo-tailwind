// src/pages/OrdersPage.tsx
import React, { useState } from "react";

import { OrderStatus } from "@workspace/hardhat";
import {
   Button,
   Input,
   Label,
   RadioGroup,
   RadioGroupItem,
   ResizableHandle,
   ResizablePanel,
   ResizablePanelGroup,
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
   Tabs,
   TabsContent,
   TabsList,
   TabsTrigger,
} from "@workspace/ui/components/shadcn-ui";

interface Order {
   orderId: string;
   maker: string;
   fromChain: string;
   toChain: string;
   depositAmount: string;
   desiredAmount: string;
   createdAt: string;
}

const mockOrders: Order[] = [
   {
      orderId: "0x0",
      maker: "John Doe",
      fromChain: "ETH",
      toChain: "BSC",
      depositAmount: "$100",
      desiredAmount: "100 USDT",
      createdAt: "Aug 12 2022",
   },
   {
      orderId: "0x0",
      maker: "John Doe",
      fromChain: "ETH",
      toChain: "BSC",
      depositAmount: "$100",
      desiredAmount: "100 USDT",
      createdAt: "Aug 12 2022",
   },
   {
      orderId: "0x0",
      maker: "John Doe",
      fromChain: "ETH",
      toChain: "BSC",
      depositAmount: "$100",
      desiredAmount: "100 USDT",
      createdAt: "Aug 12 2022",
   },
];

export const OrdersPage: React.FC = () => {
   const [status, setStatus] = useState<"all" | "pending" | "completed">("all");
   const [fromChain, setFromChain] = useState<string | null>(null);
   const [toChain, setToChain] = useState<string | null>(null);
   const [maker, setMaker] = useState("");
   const [startDate, setStartDate] = useState("");
   const [endDate, setEndDate] = useState("");

   return (
      <ResizablePanelGroup direction="horizontal" className="flex h-full text-gray-800">
         <ResizablePanel defaultSize={20} className="overflow-y-scroll! space-y-6 p-6">
            <h1 className="text-3xl font-bold">Orders</h1>

            <Tabs defaultValue="Basic Filter">
               <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="Basic Filter">Basic Filter</TabsTrigger>
                  <TabsTrigger value="Advanced Filter">Advanced Filter</TabsTrigger>
               </TabsList>

               <TabsContent value="Basic Filter" className="overflow-y-auto">
                  <RadioGroup defaultValue="Status" className="space-y-1 p-4">
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Status" id="r1" />
                        <Label htmlFor="r1">Status</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="From" id="r2" />
                        <Label htmlFor="r2">From (Network & Token)</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="To" id="r3" />
                        <Label htmlFor="r3">To (Network & Token)</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CreatedAt" id="r4" />
                        <Label htmlFor="r4">Created At</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Maker" id="r5" />
                        <Label htmlFor="r5">Maker</Label>
                     </div>
                  </RadioGroup>

                  {/* 상태 필터 */}
                  <Select onValueChange={(val) => setStatus(val as any)} value={status}>
                     <SelectTrigger className="w-full">
                        <SelectValue placeholder="All orders" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value={String(OrderStatus.createOrder)}>거래 생성중</SelectItem>
                        <SelectItem value={String(OrderStatus.createOrderReceive)}>거래 가능</SelectItem>
                        <SelectItem value={String(OrderStatus.executeOrder)}>거래 진행중</SelectItem>
                        <SelectItem value={String(OrderStatus.claimReceive)}>거래 완료</SelectItem>
                        <SelectItem value={String(OrderStatus.canceled)}>취소됨</SelectItem>
                     </SelectContent>
                  </Select>

                  {/* 체인 칩 */}
                  <div className="flex flex-wrap gap-2">
                     {["BSC", "ETH", "TRON"].map((c) => (
                        <button
                           key={c}
                           className={`rounded-full border px-3 py-1 ${
                              fromChain === c
                                 ? "border-[#F0B90B] bg-[#F0B90B] text-white"
                                 : "border-gray-200 text-gray-600"
                           }`}
                           onClick={() => setFromChain(fromChain === c ? null : c)}
                        >
                           {c}
                        </button>
                     ))}
                  </div>

                  {/* 상세 필터 */}
                  <div className="space-y-4">
                     <Input
                        placeholder="From chain"
                        value={fromChain ?? ""}
                        onChange={(e) => setFromChain(e.target.value || null)}
                     />
                     <Input
                        placeholder="To chain"
                        value={toChain ?? ""}
                        onChange={(e) => setToChain(e.target.value || null)}
                     />
                     <Input placeholder="Maker" value={maker} onChange={(e) => setMaker(e.target.value)} />
                     <Input
                        type="date"
                        placeholder="Start date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                     />
                     <Input
                        type="date"
                        placeholder="End date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                     />
                  </div>

                  <Button className="w-full bg-[#F0B90B] text-white hover:bg-yellow-500">Apply</Button>
               </TabsContent>
               <TabsContent value="Advanced Filter"></TabsContent>
            </Tabs>
         </ResizablePanel>
         <ResizableHandle withHandle />
         <ResizablePanel defaultSize={80} className="flex-1 overflow-auto p-6">
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                     {["Order ID", "Made by", "From Chain", "To Chain", "From Amount", "To Amount", "Created At"].map(
                        (h) => (
                           <th key={h} className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                              {h}
                           </th>
                        ),
                     )}
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {mockOrders.map((o) => (
                     <tr key={o.orderId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{o.orderId}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{o.maker}</td>
                        <td className="px-4 py-3 text-sm">{o.fromChain}</td>
                        <td className="px-4 py-3 text-sm">{o.toChain}</td>
                        <td className="px-4 py-3 text-sm">{o.depositAmount}</td>
                        <td className="px-4 py-3 text-sm">{o.desiredAmount}</td>
                        <td className="px-4 py-3 text-sm">{o.createdAt}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </ResizablePanel>
      </ResizablePanelGroup>
   );
};

export default OrdersPage;
