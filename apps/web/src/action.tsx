import { useState } from "react";

import { Button, Card, Avatar, Menu, X } from "@repo/ui/src/components";

const Action = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const data = [
    { type: "Maker", name: "Polygon", bid: "$2.20" },
    { type: "Bidder", name: "Bidder 2", bidFor: "Token A" },
    { type: "Maker", name: "BSC", bid: "$3.30" },
    { type: "Bidder", name: "Bidder 3", bidFor: "Token B" },
    { type: "Maker", name: "Ethereum", bid: "$4.40" },
    { type: "Bidder", name: "Bidder 4", bidFor: "Token C" },
  ];

  const dmList = ["Alice", "Bob", "Charlie", "Dave"];

  return (
    <div className="relative min-h-screen bg-gray-100 px-6 py-4">
      {/* Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div
        className={`fixed left-0 top-0 h-full w-64 transform bg-white shadow-lg ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} z-50 transition-transform`}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">Menu</h2>
          <Button variant="ghost" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <nav className="space-y-3 p-4">
          <a href="#" className="block font-medium text-gray-700">
            Auction
          </a>
          <a href="#" className="block font-medium text-gray-700">
            Docs
          </a>
          <a href="#" className="block font-medium text-gray-700">
            GitHub
          </a>
        </nav>
        <div className="border-t p-4">
          <h3 className="text-md mb-2 font-semibold">Direct Messages</h3>
          <ul className="space-y-2">
            {dmList.map((dm, index) => (
              <li key={index} className="text-gray-600">
                {dm}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
        <Button className="bg-primary rounded-2xl text-black">
          Connect Wallet
        </Button>
      </div>

      {/* Auction List */}
      <div className="space-y-4">
        {data.map((item, index) => (
          <Card
            key={index}
            className="flex items-center gap-4 rounded-lg bg-white p-4 shadow"
          >
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

export default Action;
