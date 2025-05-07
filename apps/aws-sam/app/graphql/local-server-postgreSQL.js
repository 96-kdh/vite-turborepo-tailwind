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

         const names = [];
         sql.replace(/:([a-zA-Z]\w*)/g, (_, name) => {
            if (!names.includes(name)) names.push(name);
            return `:${name}`;
         });

         let pgSql = sql;
         names.forEach((name, i) => {
            const dollar = `$${i + 1}`;
            pgSql = pgSql.replace(new RegExp(`:${name}\\b`, "g"), dollar);
         });

         const pgValues = names.map((name) => args[name]);
         const { rows } = await pool.query(pgSql, pgValues);

         return rows;
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
