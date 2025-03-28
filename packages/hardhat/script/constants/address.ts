import { SupportChainIds } from "./network";

export enum ContractNames {
   MockEndpointV2A = "MockEndpointV2A",
   MockEndpointV2B = "MockEndpointV2B",
   OrderBookWithLzA = "OrderBookWithLzA",
   OrderBookWithLzB = "OrderBookWithLzB",
}

export enum ContractEventSig {
   // event UpdateSrcOrder(uint256 indexed orderId, address indexed maker, address taker, uint256 depositAmount, uint256 desiredAmount, uint256 timelock, OrderStatus orderStatus);
   UpdateSrcOrder = "0x",
   // event UpdateDstOrder(bytes32 indexed orderId, address indexed maker, address taker, uint256 depositAmount, uint256 desiredAmount, uint256 timelock, OrderStatus orderStatus);
   UpdateDstOrder = "0x1",
}

export const contractAddresses: {
   [key in SupportChainIds]: { [key in ContractNames]: `0x${string}` };
} = {
   [SupportChainIds.LOCALHOST]: {
      [ContractNames.MockEndpointV2A]: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      [ContractNames.MockEndpointV2B]: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      [ContractNames.OrderBookWithLzA]: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
      [ContractNames.OrderBookWithLzB]: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
   },
};

export const ownerAddress: {
   [key in SupportChainIds]: `0x${string}`;
} = {
   [SupportChainIds.LOCALHOST]: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
};
