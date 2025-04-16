import { util } from "@aws-appsync/utils";
import { now } from "../../utils";

export function request(ctx) {
   if (util.dynamodb) {
      const {
         taker,
         createdAtFrom = 0,
         createdAtTo = util.time.nowEpochMilliSeconds(),
         nextToken,
         limit = 20,
      } = ctx.args;

      return {
         operation: "Query",
         index: "GSI_taker_createdAt",
         query: {
            expression: "taker = :taker AND createdAt BETWEEN :from AND :to",
            expressionValues: {
               ":taker": util.dynamodb.toDynamoDB(taker),
               ":from": util.dynamodb.toDynamoDB(createdAtFrom),
               ":to": util.dynamodb.toDynamoDB(createdAtTo),
            },
         },
         nextToken,
         limit,
      };
   } else {
      const { taker, createdAtFrom = 0, createdAtTo = now(), nextToken, limit = 20 } = ctx.args;

      return {
         operation: "Query",
         index: "GSI_taker_createdAt",
         query: {
            expression: "taker = :taker AND createdAt BETWEEN :from AND :to",
            expressionValues: {
               ":taker": taker,
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
