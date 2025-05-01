import { util } from "@aws-appsync/utils";

export function request(ctx) {
   const { orderStatus, createdAtFrom, createdAtTo, nextToken, limit = 20 } = ctx.args;

   return {
      operation: "Query",
      index: "LSI_orderStatus_createdAt",
      query: {
         expression: "orderStatus = :status AND createdAt BETWEEN :from AND :to",
         expressionValues: {
            ":status": util.dynamodb ? util.dynamodb.toDynamoDB(orderStatus) : orderStatus,
            ":from": util.dynamodb ? util.dynamodb.toDynamoDB(createdAtFrom) : createdAtFrom,
            ":to": util.dynamodb ? util.dynamodb.toDynamoDB(createdAtTo) : createdAtTo,
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
