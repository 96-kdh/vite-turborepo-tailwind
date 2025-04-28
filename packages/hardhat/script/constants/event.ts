import { id } from "ethers";

export enum SupportedEvent {
   CreateSrcOrder = "CreateSrcOrder(uint256 indexed orderId, address indexed maker, uint256 depositAmount, uint256 desiredAmount, uint32 dstEid)",
   UpdateSrcOrder = "UpdateSrcOrder(uint256 indexed orderId, address indexed maker, address indexed taker, uint256 depositAmount, uint256 desiredAmount, uint8 orderStatus, uint32 dstEid)",

   CreateDstOrder = "CreateDstOrder(uint256 indexed srcOrderId, address indexed maker, uint256 depositAmount, uint256 desiredAmount, uint32 dstEid)",
   UpdateDstOrder = "UpdateDstOrder(uint256 indexed srcOrderId, address indexed maker, address indexed taker, uint256 depositAmount, uint256 desiredAmount, uint8 orderStatus, uint32 dstEid)",
}

/**
 * Retrieves the supported past event names and their corresponding display names.
 * @returns An object containing the supported past event names as keys and their display names as values.
 * @example SupportedPastEventName()[SupportedEvent.ERC20Transfer] === 'Transfer'
 */
export const SupportedEventNames = (): { [key in SupportedEvent]: string } => {
   const result = {} as { [key in SupportedEvent]: string };

   for (const value of Object.values(SupportedEvent)) {
      // @ts-ignore
      result[value as SupportedEvent] = value.split("(")[0];
   }

   return result;
};

export const SupportedEventABI = Object.values(SupportedEvent).map((item) => `event ${item}`);

/**
 * Generates a mapping of supported event signatures based on the SupportedEvent enum.
 *
 * @returns An object where the keys are SupportedEvent values and the values are string representations of the event signatures.
 * @example SupportedEventSig()[SupportedEvent.ERC20Transfer] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
 */
export const SupportedEventSig = (): { [key in SupportedEvent]: string } => {
   const result = {} as { [key in SupportedEvent]: string };

   for (const value of Object.values(SupportedEvent)) {
      const [_eventName, _leftover] = value.split("(");
      // @ts-ignore
      const _leftovers = _leftover.replace(")", "").split(",");

      const arr = [];

      for (const v of _leftovers) {
         const types = v.split(" ");
         if (types[0]) arr.push(types[0]);
         else arr.push(types[1]);
      }

      result[value] = id(`${_eventName}(${arr.join(",").toLowerCase()})`);
   }

   return result;
};
