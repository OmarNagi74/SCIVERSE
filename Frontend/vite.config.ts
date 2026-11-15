import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

// SciVerse frontend; research data is supplied by the FastAPI backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  return {
    envDir: import.meta.dirname,
    plugins: [react(), tailwindcss(), cesium({
      cesiumBuildRootPath: path.resolve(import.meta.dirname, "node_modules/cesium/Build"),
      cesiumBuildPath: path.resolve(import.meta.dirname, "node_modules/cesium/Build/Cesium"),
    })],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      // Relative to client/: vite-plugin-cesium joins root and outDir when
      // copying its runtime. An absolute outDir makes it copy outside the
      // directory Vite publishes, so SPA hosts serve index.html for Cesium.js.
      outDir: "../dist/public",
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      proxy: { "/api/v1": { target: env.BACKEND_URL || "http://127.0.0.1:8000", changeOrigin: true, timeout: 420000, proxyTimeout: 420000 } },
      fs: { strict: true, deny: ["**/.*"] },
    },
  };
});
