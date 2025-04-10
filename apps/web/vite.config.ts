import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import tailwindcss from "@repo/tailwind-config/node_modules/tailwindcss";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import autoprefixer from "@repo/tailwind-config/node_modules/autoprefixer";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [react()],
   css: {
      postcss: {
         plugins: [tailwindcss(), autoprefixer()],
      },
   },
   resolve: {
      alias: [
         {
            find: "./runtimeConfig",
            replacement: "./runtimeConfig.browser",
         },
         // Reference: https://github.com/vercel/turbo/discussions/620#discussioncomment-2136195
         {
            find: "@repo/ui",
            replacement: path.resolve(__dirname, "../../packages/ui/src"),
         },
         {
            find: "@",
            replacement: path.resolve(__dirname, "./src"),
         },
      ],
   },
});
