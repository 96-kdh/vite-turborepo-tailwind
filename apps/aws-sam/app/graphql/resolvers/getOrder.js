import { util } from "@aws-appsync/utils";

export function request(ctx) {
   const { orderStatus, encodedCompositeKey } = ctx.args;

   if (util.dynamodb) {
      return {
         operation: "GetItem",
         key: {
            orderId: util.dynamodb.toDynamoDB(orderStatus),
            chainId: util.dynamodb.toDynamoDB(encodedCompositeKey),
         },
      };
   } else {
      return {
         operation: "GetItem",
         key: {
            orderStatus,
            encodedCompositeKey,
         },
      };
   }
}

export function response(ctx) {
   return ctx.result;
}
