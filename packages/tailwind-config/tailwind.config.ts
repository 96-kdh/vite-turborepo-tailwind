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
   content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx,css}"],
};

export default defaultTailwindConfig;
