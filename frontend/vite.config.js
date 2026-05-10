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
    cssMinify: true,
    rollupOptions: {
      input: {
        main: "index.html",
        shop: "shop.html",
        about: "about.html",
        contact: "contact.html",
        workshops: "workshops.html",
        curiosidades: "curiosidades.html",
        aprender: "aprender.html",
        comunidade: "comunidade.html",
        apicultor: "apicultor.html",
        apicultores: "apicultores.html",
        profile: "profile.html",
        checkout: "checkout.html",
        admin: "admin.html",
        dashboardApicultor: "dashboard-apicultor.html",
        produto: "produto.html",
      },
    },
  },
});
