import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true, // 0.0.0.0 바인딩 — LAN/터널에서 접근 가능
    // ngrok/cloudflare 등 터널 도메인 허용 (Vite의 host 차단 우회)
    allowedHosts: true,
    // 터널(https) 위에서 HMR 웹소켓이 끊기지 않도록
    hmr: { clientPort: 443 },
    // 백엔드 API 프록시 (개발 시 CORS 회피). VITE_API_BASE 사용 시 불필요.
    // proxy: { "/api": { target: "http://10.0.1.12:8080", changeOrigin: true } },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
