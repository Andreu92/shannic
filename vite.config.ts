/// <reference types="vitest" />

import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    strictPort: true,
    host: host || false,
    ws: host
      ? { protocol: "ws", host, clientPort: 5173 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  }
});
