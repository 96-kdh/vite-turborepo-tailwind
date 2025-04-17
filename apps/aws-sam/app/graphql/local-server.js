import { ApolloServer, gql } from "apollo-server";
import { readFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { request as getOrderRequest } from "./resolvers/getOrder.js";
import { request as listOrdersByMakerRequest } from "./resolvers/listOrdersByMaker.js";
import { request as listOrdersByTakerRequest } from "./resolvers/listOrdersByTaker.js";
import { request as listOrdersByStatusRequest } from "./resolvers/listOrdersByStatus.js";

// ✅ ESM용 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ schema.graphql 불러오기
const typeDefs = gql(readFileSync(path.join(__dirname, "./schema.graphql"), "utf8"));

// only local
const dynamoClient = new DynamoDBClient({
   region: "us-east-1",
   endpoint: "http://localhost:4566",
});

const resolvers = {
   Query: {
      getOrder: async (_, args) => {
         const { key } = getOrderRequest({ args });
         const res = await dynamoClient.send(
            new GetCommand({
               TableName: "Order",
               Key: key,
            }),
         );
         return res.Item;
      },
      listOrdersByMaker: async (_, args) => {
         const { index, query, nextToken, limit } = listOrdersByMakerRequest({ args });
         const res = await dynamoClient.send(
            new QueryCommand({
               TableName: "Order",
               IndexName: index,
               KeyConditionExpression: query.expression,
               ExpressionAttributeValues: query.expressionValues,
               Limit: limit,
               ExclusiveStartKey: nextToken,
            }),
         );
         return {
            items: res.Items,
            nextToken: res.LastEvaluatedKey,
         };
      },
      listOrdersByTaker: async (_, args) => {
         const { index, query, nextToken, limit } = listOrdersByTakerRequest({ args });
         const res = await dynamoClient.send(
            new QueryCommand({
               TableName: "Order",
               IndexName: index,
               KeyConditionExpression: query.expression,
               ExpressionAttributeValues: query.expressionValues,
               Limit: limit,
               ExclusiveStartKey: nextToken,
            }),
         );
         return {
            items: res.Items,
            nextToken: res.LastEvaluatedKey,
         };
      },
      listOrdersByStatus: async (_, args) => {
         const { index, query, nextToken, limit } = listOrdersByStatusRequest({ args });
         const res = await dynamoClient.send(
            new QueryCommand({
               TableName: "Order",
               IndexName: index,
               KeyConditionExpression: query.expression,
               ExpressionAttributeValues: query.expressionValues,
               Limit: limit,
               ExclusiveStartKey: nextToken,
            }),
         );
         return {
            items: res.Items,
            nextToken: res.LastEvaluatedKey,
         };
      },
   },
};

const server = new ApolloServer({
   typeDefs,
   resolvers,
});

server.listen(4000).then(({ url }) => {
   console.log(`🚀 Local GraphQL ready at ${url}`);
});
