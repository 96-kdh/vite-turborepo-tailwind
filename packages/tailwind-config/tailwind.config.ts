const defaultTailwindConfig = {
   theme: {
      extend: {
         colors: {
            primary: {
               DEFAULT: "#F5C754", // Primary 기본값
               dark: "#C99E44", // 어두운 버전
               100: "#FFF7E0",
               200: "#FEE9B8",
               300: "#FDD88F",
               400: "#FDC467",
               500: "#F5C754", // Primary
               600: "#E2AD4B",
               700: "#C99E44",
               800: "#A78139",
               900: "#84662D",
            },
         },
      },
   },
   content: [
      "./index.html",
      "./src/**/*.{ts,tsx,css,js,jsx}",
      "../../packages/ui/src/**/*.{ts,tsx,css,js,jsx}",
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      // Or if using `src` directory:
      "./src/**/*.{js,ts,jsx,tsx,mdx}",
   ],
};

export default defaultTailwindConfig;
