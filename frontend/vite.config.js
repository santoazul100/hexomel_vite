import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true, // Forces it to only use this port
    open: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    minify: "esbuild",
    cssMinify: true
  },
});
