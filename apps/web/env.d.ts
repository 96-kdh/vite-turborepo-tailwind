interface ImportMetaEnv {
   readonly VITE_NODE_ENV: "local" | "staging" | "production" | undefined;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
