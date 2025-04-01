export enum Task {
   dev = "dev", // for dev
   mining = "mining", // for hardhat node task
   pollingQueue = "pollingQueue", // for localstack queue polling
   setDestLzEndpoint = "setDestLzEndpoint", // for endpoint mock (layerzero) contract
   receivePayload = "receivePayload", // for endpoint mock (layerzero) contract task

   // for orderBook.lz
   createOrder = "createOrder",
   setPeer = "setPeer",
}
