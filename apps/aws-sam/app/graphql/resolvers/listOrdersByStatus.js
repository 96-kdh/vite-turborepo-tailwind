import { util } from "@aws-appsync/utils";

export function request(ctx) {
   if (util.dynamodb) {
      const {
         orderStatus,
         createdAtFrom = 0,
         createdAtTo = util.time.nowEpochMilliSeconds(),
         nextToken,
         limit = 20,
      } = ctx.args;

      return {
         operation: "Query",
         index: "GSI_orderStatus_createdAt",
         query: {
            expression: "orderStatus = :status AND createdAt BETWEEN :from AND :to",
            expressionValues: {
               ":status": util.dynamodb.toDynamoDB(orderStatus),
               ":from": util.dynamodb.toDynamoDB(createdAtFrom),
               ":to": util.dynamodb.toDynamoDB(createdAtTo),
            },
         },
         nextToken,
         limit,
      };
   } else {
      const { orderStatus, createdAtFrom = 0, createdAtTo = Date.now(), nextToken, limit = 20 } = ctx.args;

      return {
         operation: "Query",
         index: "GSI_orderStatus_createdAt",
         query: {
            expression: "orderStatus = :status AND createdAt BETWEEN :from AND :to",
            expressionValues: {
               ":status": orderStatus,
               ":from": createdAtFrom,
               ":to": createdAtTo,
            },
         },
         nextToken,
         limit,
      };
   }
}

export function response(ctx) {
   const { items, nextToken } = ctx.result;
   return { items: items ?? [], nextToken };
}
