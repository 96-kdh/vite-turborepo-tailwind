export function shortenAddress(address: string): string {
   if (address.length <= 7) return address;
   return `${address.slice(0, 4)}...${address.slice(-3)}`;
}
