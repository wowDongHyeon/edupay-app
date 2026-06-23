// operia 어댑터 (1순위) — DATASOURCE_설계.md §5.1, §4.2
//
// 실제 오페리아 SSE 호출. backend 와 동일 골격(채널만 다름). 접속값은 env(§3, 값은 추후 주입 §13).
//   base = VITE_OPERIA_API, token = VITE_OPERIA_TOKEN, companyId = VITE_OPERIA_COMPANY_ID.
//   값(API) 비면 호출하지 않고 경고(§3 폴백) — 주 폴백 선택은 index.getDataSource() 가 담당.
// ※ 엔드포인트 경로/메서드는 명세서 §2.1 미기재 → 도착 후 확정(§13). 지금은 /query 가정.

import { consumeEventStream } from "./sse";
import { EVT } from "./contract";

const API = import.meta.env.VITE_OPERIA_API;
const TOKEN = import.meta.env.VITE_OPERIA_TOKEN;
const COMPANY_ID = import.meta.env.VITE_OPERIA_COMPANY_ID || "OPERIA";
const PATH = "/query"; // §13 확정 필요

export const operiaSource = {
  /**
   * @param {{userInput:string, context?:object, hints?:object}} req
   * @param {{onData?:Function, onResult?:Function, onError?:Function}} handlers
   * @param {AbortSignal} [signal]
   */
  async query(req, handlers, signal) {
    const { onData, onResult, onError } = handlers || {};
    if (!API) {
      if (import.meta.env.DEV) console.warn("[datasource] VITE_OPERIA_API 미설정 — operia 호출 생략(폴백)");
      onError && onError({ code: "NO_OPERIA_API", message: "VITE_OPERIA_API 미설정" });
      return;
    }
    const headers = { "Content-Type": "application/json", Accept: "text/event-stream" };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    // companyId(§4.2 데이터 격리·DB 라우팅): env 값을 최종으로 강제(App context 위에 덮어씀)
    const context = { ...(req && req.context), companyId: COMPANY_ID };
    try {
      const r = await fetch(`${API}${PATH}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userInput: (req && req.userInput) || "", context }),
        signal,
      });
      if (!r.ok) {
        onError && onError({ httpStatus: r.status, message: `operia ${r.status}` });
        return;
      }
      await consumeEventStream(
        r,
        (e) => {
          if (e.event === EVT.DATA) onData && onData(e.data);
          else if (e.event === EVT.RESULT) onResult && onResult(e.data);
        },
        signal
      );
    } catch (err) {
      if (err && err.name === "AbortError") return;
      onError && onError({ message: (err && err.message) || String(err) });
    }
  },
};

export default operiaSource;
