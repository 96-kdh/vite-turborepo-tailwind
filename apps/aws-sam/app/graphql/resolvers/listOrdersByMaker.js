import { util } from "@aws-appsync/utils";

export function request(ctx) {
   if (util.dynamodb) {
      const {
         maker,
         createdAtFrom = 0,
         createdAtTo = util.time.nowEpochMilliSeconds(),
         nextToken,
         limit = 20,
      } = ctx.args;

      return {
         operation: "Query",
         index: "GSI_maker_createdAt",
         query: {
            expression: "maker = :maker AND createdAt BETWEEN :from AND :to",
            expressionValues: {
               ":maker": util.dynamodb.toDynamoDB(maker),
               ":from": util.dynamodb.toDynamoDB(createdAtFrom),
               ":to": util.dynamodb.toDynamoDB(createdAtTo),
            },
         },
         nextToken,
         limit,
      };
   } else {
      const { maker, createdAtFrom = 0, createdAtTo = Date.now(), nextToken, limit = 20 } = ctx.args;

      return {
         operation: "Query",
         index: "GSI_maker_createdAt",
         query: {
            expression: "maker = :maker AND createdAt BETWEEN :from AND :to",
            expressionValues: {
               ":maker": maker,
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
