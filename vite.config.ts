import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import path from "node:path";
import { defineConfig } from "vite";

// SciVerse frontend; research data is supplied by the FastAPI backend.
export default defineConfig({
  plugins: [react(), tailwindcss(), cesium()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    proxy: { "/api/v1": { target: process.env.BACKEND_URL || "http://127.0.0.1:8000", changeOrigin: true, timeout: 420000, proxyTimeout: 420000 } },
    fs: { strict: true, deny: ["**/.*"] },
  },
});
