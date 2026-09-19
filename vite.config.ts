import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_SERVER = "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    // /api・/cmaps・/standard_fonts は Bun サーバー(server/index.ts)が本体を持つため、
    // dev では vite に同じものを重複実装せずそのまま転送する。
    proxy: {
      "/api": API_SERVER,
      "/cmaps": API_SERVER,
      "/standard_fonts": API_SERVER,
    },
  },
});
