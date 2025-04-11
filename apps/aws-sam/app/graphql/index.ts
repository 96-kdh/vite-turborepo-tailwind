/* eslint-disable @typescript-eslint/no-explicit-any */

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { docClient } from "../utils";
import { TableNames } from "../vendor/@workspace/hardhat/script";
import { APIGatewayProxyEvent } from "aws-lambda";

interface ResolverPayload {
   field: string;
   arguments: any;
}

export const handler = async (event: ResolverPayload | APIGatewayProxyEvent): Promise<any> => {
   // 만약 API Gateway 형식으로 호출되면 event.body가 존재할 수 있음
   let payload: any;

   if (event.body) {
      try {
         payload = JSON.parse(event.body);
      } catch (err) {
         return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid JSON in body" }),
         };
      }
   } else {
      payload = event;
   }

   console.log("Received event:", JSON.stringify(payload, null, 2));
   const { field, arguments: args } = payload;

   try {
      if (field === "getOrder") {
         const command = new GetCommand({
            TableName: TableNames.OrderTable,
            Key: {
               orderId: args.orderId,
               chainId: Number(args.chainId),
            },
         });
         const result = await docClient.send(command);
         return result.Item;
      } else if (field === "listOrdersByMaker") {
         // GSI 'GSI_maker_createdAt' 를 이용한 조회
         const params: any = {
            TableName: TableNames.OrderTable,
            IndexName: "GSI_maker_createdAt",
            KeyConditionExpression: "maker = :maker",
            ExpressionAttributeValues: { ":maker": args.maker },
         };

         if (args.createdAtFrom && args.createdAtTo) {
            params.KeyConditionExpression += " and createdAt between :from and :to";
            params.ExpressionAttributeValues[":from"] = Number(args.createdAtFrom);
            params.ExpressionAttributeValues[":to"] = Number(args.createdAtTo);
         } else if (args.createdAtFrom) {
            params.KeyConditionExpression += " and createdAt >= :from";
            params.ExpressionAttributeValues[":from"] = Number(args.createdAtFrom);
         } else if (args.createdAtTo) {
            params.KeyConditionExpression += " and createdAt <= :to";
            params.ExpressionAttributeValues[":to"] = Number(args.createdAtTo);
         } else {
            params.KeyConditionExpression += " and createdAt >= :to";
            params.ExpressionAttributeValues[":to"] = 0;
         }

         const command = new QueryCommand(params);
         const result = await docClient.send(command);
         return result.Items;
      } else if (field === "listOrdersByTaker") {
         // GSI 'GSI_taker_createdAt' 를 이용한 조회
         const params: any = {
            TableName: TableNames.OrderTable,
            IndexName: "GSI_taker_createdAt",
            KeyConditionExpression: "taker = :taker",
            ExpressionAttributeValues: { ":taker": args.taker },
         };

         if (args.createdAtFrom && args.createdAtTo) {
            params.KeyConditionExpression += " and createdAt between :from and :to";
            params.ExpressionAttributeValues[":from"] = Number(args.createdAtFrom);
            params.ExpressionAttributeValues[":to"] = Number(args.createdAtTo);
         } else if (args.createdAtFrom) {
            params.KeyConditionExpression += " and createdAt >= :from";
            params.ExpressionAttributeValues[":from"] = Number(args.createdAtFrom);
         } else if (args.createdAtTo) {
            params.KeyConditionExpression += " and createdAt <= :to";
            params.ExpressionAttributeValues[":to"] = Number(args.createdAtTo);
         } else {
            params.KeyConditionExpression += " and createdAt >= :to";
            params.ExpressionAttributeValues[":to"] = 0;
         }

         const command = new QueryCommand(params);
         const result = await docClient.send(command);
         return result.Items;
      } else if (field === "listOrdersByStatus") {
         // GSI 'GSI_orderStatus_createdAt' 를 이용한 조회
         const params: any = {
            TableName: TableNames.OrderTable,
            IndexName: "GSI_orderStatus_createdAt",
            KeyConditionExpression: "orderStatus = :orderStatus",
            ExpressionAttributeValues: { ":orderStatus": Number(args.orderStatus) },
         };

         if (args.createdAtFrom && args.createdAtTo) {
            params.KeyConditionExpression += " and createdAt between :from and :to";
            params.ExpressionAttributeValues[":from"] = Number(args.createdAtFrom);
            params.ExpressionAttributeValues[":to"] = Number(args.createdAtTo);
         } else if (args.createdAtFrom) {
            params.KeyConditionExpression += " and createdAt >= :from";
            params.ExpressionAttributeValues[":from"] = Number(args.createdAtFrom);
         } else if (args.createdAtTo) {
            params.KeyConditionExpression += " and createdAt <= :to";
            params.ExpressionAttributeValues[":to"] = Number(args.createdAtTo);
         } else {
            params.KeyConditionExpression += " and createdAt >= :to";
            params.ExpressionAttributeValues[":to"] = 0;
         }

         const command = new QueryCommand(params);
         const result = await docClient.send(command);
         return result.Items;
      } else {
         return { error: `Unknown field: ${field}` };
      }
   } catch (err: any) {
      console.error("Error processing request:", err);
      return { error: err.message };
   }
};
