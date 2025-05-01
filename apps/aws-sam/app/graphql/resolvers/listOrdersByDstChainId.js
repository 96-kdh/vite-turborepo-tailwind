import { util } from "@aws-appsync/utils";

export function request(ctx) {
   const { orderStatus, dstChainId, nextToken, limit = 20 } = ctx.args;

   return {
      operation: "Query",
      index: "LSI_orderStatus_dstChainId",
      query: {
         expression: "orderStatus = :status AND dstChainId = :dcid",
         expressionValues: {
            ":status": util.dynamodb ? util.dynamodb.toDynamoDB(orderStatus) : orderStatus,
            ":dcid": util.dynamodb ? util.dynamodb.toDynamoDB(dstChainId) : dstChainId,
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
