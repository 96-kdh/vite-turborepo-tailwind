import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
   overwrite: true,
   schema: "../aws-sam/app/graphql/schema.graphql",
   documents: ["./src/graphql/*.graphql"],
   generates: {
      "src/graphql/__generated__/types-and-hooks.ts": {
         plugins: ["typescript", "typescript-operations", "typescript-react-query"],
         config: {
            reactQueryVersion: 5,
            addInfiniteQuery: true,
         },
      },
   },
   hooks: {
      afterAllFileWrite: "prettier --write",
   },
};

export default config;
