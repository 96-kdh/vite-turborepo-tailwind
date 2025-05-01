import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ApolloServer, gql } from "apollo-server";
import { readFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { request as getOrderRequest } from "./resolvers/getOrder.js";
import { request as listOrders } from "./resolvers/listOrders.js";
import { request as listOrdersByChainIdRequest } from "./resolvers/listOrdersByChainId.js";
import { request as listOrdersByCreatedAtRequest } from "./resolvers/listOrdersByCreatedAt.js";
import { request as listOrdersByDstChainIdRequest } from "./resolvers/listOrdersByDstChainId.js";
import { request as listOrdersByMakerRequest } from "./resolvers/listOrdersByMaker.js";

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

const _OrderQuery = async ({ index, query, nextToken, limit }) => {
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
};

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
      listOrders: async (_, args) => {
         const { nextToken, limit } = listOrders({ args });
         const res = await dynamoClient.send(
            new ScanCommand({
               TableName: "Order",
               Limit: limit,
               ExclusiveStartKey: nextToken,
            }),
         );
         return {
            items: res.Items,
            nextToken: res.LastEvaluatedKey,
         };
      },
      listOrdersByChainId: async (_, args) => {
         const { index, query, nextToken, limit } = listOrdersByChainIdRequest({ args });
         return _OrderQuery({ index, query, nextToken, limit });
      },
      listOrdersByCreatedAt: async (_, args) => {
         const { index, query, nextToken, limit } = listOrdersByCreatedAtRequest({ args });
         return _OrderQuery({ index, query, nextToken, limit });
      },
      listOrdersByDstChainId: async (_, args) => {
         const { index, query, nextToken, limit } = listOrdersByDstChainIdRequest({ args });
         return _OrderQuery({ index, query, nextToken, limit });
      },
      listOrdersByMaker: async (_, args) => {
         const { index, query, nextToken, limit } = listOrdersByMakerRequest({ args });
         return _OrderQuery({ index, query, nextToken, limit });
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
