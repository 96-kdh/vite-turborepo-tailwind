import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
   overwrite: true,
   schema: "../aws-sam/app/graphql/schema.graphql",
   documents: ["!./src/graphql/**"],
   generates: {
      "src/graphql/__generated__/types-and-hooks.ts": {
         plugins: ["typescript", "typescript-operations", "typescript-react-query"],
      },
   },
};

export default config;
