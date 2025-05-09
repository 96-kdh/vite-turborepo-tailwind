import { ApolloServer, gql } from "apollo-server";
import { readFileSync } from "fs";
import path, { dirname } from "path";
import { Pool } from "pg";
import { fileURLToPath } from "url";

import { getListOrderSQL } from "../dist/app.js";

// ✅ ESM용 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ schema.graphql 불러오기
const typeDefs = gql(readFileSync(path.join(__dirname, "./schema.graphql"), "utf8"));

const pool = new Pool({
   connectionString: "postgres://local:local@localhost:5432/mydb",
});

const resolvers = {
   Query: {
      listOrders: async (_, args) => {
         const { sql } = getListOrderSQL(args);

         // 파라미터 이름 수집
         const names = [];
         sql.replace(/:([a-zA-Z]\w*)/g, (_, name) => {
            if (!names.includes(name)) names.push(name);
            return `:${name}`;
         });

         // :name → $1, $2 로 치환
         let pgSql = sql;
         names.forEach((name, i) => {
            const dollar = `$${i + 1}`;
            pgSql = pgSql.replace(new RegExp(`:${name}\\b`, "g"), dollar);
         });

         // pgValues 생성: status0 → args.status[0], srcChainId2 → args.srcChainId[2], 그 외는 args[name] 사용
         const pgValues = names.map((name) => {
            if (name.startsWith("status")) {
               const idx = parseInt(name.slice("status".length), 10);
               return args.status[idx];
            }
            if (name.startsWith("srcChainId")) {
               const idx = parseInt(name.slice("srcChainId".length), 10);
               return args.srcChainId[idx];
            }
            if (name.startsWith("dstChainId")) {
               const idx = parseInt(name.slice("dstChainId".length), 10);
               return args.dstChainId[idx];
            }
            // limit, cursor, depositMin 등은 args에 직접
            return args[name];
         });

         const { rows } = await pool.query(pgSql, pgValues);
         return {
            items: rows,
            nextCursor: rows.length > 0 ? rows[rows.length - 1].created_at.toISOString() : null,
         };
      },
   },
};

// 5) ApolloServer 기동
const server = new ApolloServer({
   typeDefs,
   resolvers,
   context: () => ({ pool }),
});

server
   .listen({ port: process.env.PORT || 4000 })
   .then(({ url }) => {
      console.log(`🚀 Server ready at ${url}`);
   })
   .catch((err) => {
      console.error("Server failed to start", err);
   });
