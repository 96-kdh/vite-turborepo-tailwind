import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import Pages from 'vite-plugin-pages';







// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import path, { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [react(), tailwindcss()],
   resolve: {
      alias: [
         {
            find: "./runtimeConfig",
            replacement: "./runtimeConfig.browser",
         },
         // Reference: https://github.com/vercel/turbo/discussions/620#discussioncomment-2136195
         {
            find: "@workspace/ui",
            replacement: path.resolve(__dirname, "../../packages/ui/src"),
         },
         {
            find: "@",
            replacement: path.resolve(__dirname, "./src"),
         },
      ],
   },
});
