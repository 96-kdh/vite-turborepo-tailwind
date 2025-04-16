import { util } from "@aws-appsync/utils";

export function request(ctx) {
   const { orderId, chainId } = ctx.args;

   if (util.dynamodb) {
      return {
         operation: "GetItem",
         key: {
            orderId: util.dynamodb.toDynamoDB(orderId),
            chainId: util.dynamodb.toDynamoDB(chainId),
         },
      };
   } else {
      return {
         operation: "GetItem",
         key: {
            orderId,
            chainId,
         },
      };
   }
}

export function response(ctx) {
   return ctx.result;
}
