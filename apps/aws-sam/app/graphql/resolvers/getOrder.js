import { util } from "@aws-appsync/utils";

export function request(ctx) {
   const { orderId, chainId } = ctx.args;

   return {
      operation: "GetItem",
      key: {
         orderId: util.dynamodb.toDynamoDB(orderId),
         chainId: util.dynamodb.toDynamoDB(chainId),
      },
   };
}

export function response(ctx) {
   return ctx.result;
}
