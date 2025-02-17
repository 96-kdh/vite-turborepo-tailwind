import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tailwindcss, autoprefixer } from "../../packages/tailwind-config/lib";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});
