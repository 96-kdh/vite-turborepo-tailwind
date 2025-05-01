import { util } from "@aws-appsync/utils";

export function request(ctx) {
   const { orderStatus, chainId, nextToken, limit = 20 } = ctx.args;

   return {
      operation: "Query",
      index: "LSI_orderStatus_chainId",
      query: {
         expression: "orderStatus = :status AND chainId = :cid",
         expressionValues: {
            ":status": util.dynamodb ? util.dynamodb.toDynamoDB(orderStatus) : orderStatus,
            ":cid": util.dynamodb ? util.dynamodb.toDynamoDB(chainId) : chainId,
         },
      },
      nextToken,
      limit,
   };
}

export function response(ctx) {
   const { items, nextToken } = ctx.result;
   return { items: items ?? [], nextToken };
}
