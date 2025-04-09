import { Card } from "@repo/ui/components/shadcn-ui/card";
import { Avatar } from "@repo/ui/components/shadcn-ui/avatar";

const Order = () => {
   const data = [
      { type: "Maker", name: "Polygon", bid: "$2.20" },
      { type: "Bidder", name: "Bidder 2", bidFor: "Token A" },
      { type: "Maker", name: "BSC", bid: "$3.30" },
      { type: "Bidder", name: "Bidder 3", bidFor: "Token B" },
      { type: "Maker", name: "Ethereum", bid: "$4.40" },
      { type: "Bidder", name: "Bidder 4", bidFor: "Token C" },
   ];

   return (
      <div className="relative min-h-screen bg-gray-100 px-6 py-4">
         {/* Auction List */}
         <div className="space-y-4">
            {data.map((item, index) => (
               <Card key={index} className="flex items-center gap-4 rounded-lg bg-white p-4 shadow">
                  <Avatar className="h-12 w-12 rounded-lg bg-gray-200 p-2">
                     <img src="/vite.svg" alt="crypto" className="h-full w-full" />
                  </Avatar>
                  <div>
                     <p className="text-lg font-medium">
                        {item.type}: {item.name}
                     </p>
                     {item.bid ? (
                        <p className="text-blue-600">Bid: {item.bid}</p>
                     ) : (
                        <p className="text-gray-600">Bid For: {item.bidFor}</p>
                     )}
                  </div>
               </Card>
            ))}
         </div>
      </div>
   );
};

export default Order;
