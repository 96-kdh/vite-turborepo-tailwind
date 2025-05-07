import { ExecuteStatementCommand, ExecuteStatementCommandInput, SqlParameter } from "@aws-sdk/client-rds-data";

import { rdsClient } from "../utils";

interface RdsDataEvent {
   arguments?: { [key: string]: any };
   payload?: { arguments?: { [key: string]: any } };
}

export const getListOrderSQL = (args: { [key: string]: any }) => {
   const limit = typeof args.limit === "number" ? args.limit : 100;

   // Build dynamic WHERE clause and parameters
   const whereClauses: string[] = [];
   const parameters: SqlParameter[] = [];

   if (args.status) {
      whereClauses.push("status = :status");
      parameters.push({ name: "status", value: { stringValue: args.status } });
   }
   if (typeof args.srcChainId === "number") {
      whereClauses.push("src_chain_id = :srcChainId");
      parameters.push({ name: "srcChainId", value: { longValue: args.srcChainId } });
   }
   if (typeof args.dstChainId === "number") {
      whereClauses.push("dst_chain_id = :dstChainId");
      parameters.push({ name: "dstChainId", value: { longValue: args.dstChainId } });
   }
   if (args.depositMin) {
      whereClauses.push("deposit_amount >= :depositMin");
      parameters.push({ name: "depositMin", value: { stringValue: args.depositMin } });
   }
   if (args.depositMax) {
      whereClauses.push("deposit_amount <= :depositMax");
      parameters.push({ name: "depositMax", value: { stringValue: args.depositMax } });
   }
   if (args.desiredMin) {
      whereClauses.push("desired_amount >= :desiredMin");
      parameters.push({ name: "desiredMin", value: { stringValue: args.desiredMin } });
   }
   if (args.desiredMax) {
      whereClauses.push("desired_amount <= :desiredMax");
      parameters.push({ name: "desiredMax", value: { stringValue: args.desiredMax } });
   }
   if (args.createdFrom) {
      whereClauses.push("created_at >= :createdFrom");
      parameters.push({ name: "createdFrom", value: { stringValue: args.createdFrom } });
   }
   if (args.createdTo) {
      whereClauses.push("created_at <= :createdTo");
      parameters.push({ name: "createdTo", value: { stringValue: args.createdTo } });
   }

   // Always include limit as a parameter
   parameters.push({ name: "limit", value: { longValue: limit } });

   const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
   const sql = `SELECT * FROM public.orders ${where} ORDER BY created_at DESC LIMIT :limit`;

   return { sql, whereClauses, parameters };
};

export const listOrderResolvers = async (event: RdsDataEvent): Promise<any[]> => {
   console.log(event);
   const args = event.arguments ?? event.payload?.arguments ?? {};
   const { sql, parameters } = getListOrderSQL(args);

   const params: ExecuteStatementCommandInput = {
      resourceArn: process.env.DB_CLUSTER_ARN!,
      secretArn: process.env.SECRET_ARN!,
      database: process.env.DB_NAME!,
      sql,
      parameters,
      includeResultMetadata: true,
   };

   console.log({ sql, parameters });

   try {
      const command = new ExecuteStatementCommand(params);
      const response = await rdsClient.send(command);
      console.log(response);

      const columns = response.columnMetadata || [];
      const records = response.records || [];

      return records.map((row) => {
         const obj: Record<string, any> = {};
         row.forEach((cell, idx) => {
            const colInfo = columns[idx];
            const key = colInfo?.name ?? `col${idx}`;
            if (cell.isNull) obj[key] = null;
            else if (cell.stringValue !== undefined) obj[key] = cell.stringValue;
            else if (cell.longValue !== undefined) obj[key] = cell.longValue;
            else if (cell.doubleValue !== undefined) obj[key] = cell.doubleValue;
            else if (cell.booleanValue !== undefined) obj[key] = cell.booleanValue;
            else if (cell.blobValue !== undefined) obj[key] = cell.blobValue;
            else obj[key] = null;
         });
         return obj;
      });
   } catch (error: any) {
      console.error("Error querying Aurora via RDS Data API:", error);
      throw new Error("Failed to fetch orders: " + error.message);
   }
};
