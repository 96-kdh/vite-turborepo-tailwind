/** @type {import("eslint").Linter.Config} */
module.exports = {
   root: true,
   ignorePatterns: [".eslintrc.cjs"],
   extends: ["@workspace/eslint-config/base.js"],
   parser: "@typescript-eslint/parser",
   parserOptions: {
      project: true,
   },
};
