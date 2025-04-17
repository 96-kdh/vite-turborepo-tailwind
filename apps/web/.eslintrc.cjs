/** @type {import("eslint").Linter.Config} */
module.exports = {
   root: true,
   extends: ["@workspace/eslint-config/index.js", "plugin:@tanstack/eslint-plugin-query/recommended"],
   rules: {
      "@tanstack/query/exhaustive-deps": "error",
      "@tanstack/query/stable-query-client": "error",
      "@tanstack/query/no-rest-destructuring": "warn",
   },
};
