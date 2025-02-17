import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import tailwindcss from "@repo/tailwind-config/node_modules/tailwindcss";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import autoprefixer from "@repo/tailwind-config/node_modules/autoprefixer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});
