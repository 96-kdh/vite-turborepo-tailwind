import { ExecuteStatementCommand, ExecuteStatementCommandInput, SqlParameter } from "@aws-sdk/client-rds-data";

import { rdsClient } from "../utils";

interface RdsDataEvent {
   arguments?: { [key: string]: any };
   payload?: { arguments?: { [key: string]: any } };
}

export const getListOrderSQL = (args: { [key: string]: any }) => {
   const limit = typeof args.limit === "number" ? args.limit : 100;
   const cursor = typeof args.cursor === "string" ? args.cursor : undefined;

   // Build dynamic WHERE clause and parameters
   const whereClauses: string[] = [];
   const parameters: SqlParameter[] = [];

   // --- status 처리 (단일 or 배열) ---
   if (args.status) {
      const statuses = Array.isArray(args.status) ? args.status : [args.status];
      const placeholders = statuses.map((_, i) => `:status${i}`);
      whereClauses.push(`status IN (${placeholders.join(", ")})`);
      statuses.forEach((val, i) => {
         parameters.push({
            name: `status${i}`,
            value: { stringValue: String(val) },
         });
      });
   }

   // --- srcChainId 처리 (단일 or 배열) ---
   if (args.srcChainId) {
      const srcs = Array.isArray(args.srcChainId) ? args.srcChainId : [args.srcChainId];
      const placeholders = srcs.map((_, i) => `:srcChainId${i}`);
      whereClauses.push(`src_chain_id IN (${placeholders.join(", ")})`);
      srcs.forEach((val, i) => {
         parameters.push({
            name: `srcChainId${i}`,
            value: { longValue: Number(val) },
         });
      });
   }

   // --- dstChainId 처리 (단일 or 배열) ---
   if (args.dstChainId) {
      const dsts = Array.isArray(args.dstChainId) ? args.dstChainId : [args.dstChainId];
      const placeholders = dsts.map((_, i) => `:dstChainId${i}`);
      whereClauses.push(`dst_chain_id IN (${placeholders.join(", ")})`);
      dsts.forEach((val, i) => {
         parameters.push({
            name: `dstChainId${i}`,
            value: { longValue: Number(val) },
         });
      });
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
   if (args.maker && typeof args.maker === "string" && args.maker.length === 42) {
      whereClauses.push("maker = :maker");
      parameters.push({ name: "maker", value: { stringValue: args.maker } });
   }

   // cursor 기반 페이징
   if (cursor) {
      whereClauses.push("created_at < :cursor");
      parameters.push({ name: "cursor", value: { stringValue: cursor } });
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
