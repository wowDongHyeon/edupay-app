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
    // [operia 실연동] dev(5173)에서 상대경로 /api 를 nginx(오페리아 게이트웨이)로 포워딩.
    //   프론트는 same-origin /api 로만 호출 → nginx 가 실서버로 프록시 + API 키 주입.
    //   배포본은 이 프록시 없이 실제 nginx 가 /api 를 처리한다.
    proxy: {
      "/api": { target: "http://20.214.176.113:7071", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
