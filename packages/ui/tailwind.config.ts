// export * from "@repo/tailwind-config/tailwind.config";
import defaultConfig from "@repo/tailwind-config/tailwind.config";
import tailwindAnimate from "tailwindcss-animate";

const config = {
   plugins: [tailwindAnimate],
   presets: [defaultConfig],
};

export default config;
