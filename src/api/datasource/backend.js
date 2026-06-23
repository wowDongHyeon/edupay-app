// backend 어댑터 (임시 자체 백엔드) — DATASOURCE_설계.md §5.2, §4.2
//
// 클라이언트는 operia 와 "완전히 동일한 요청/소비"를 한다. 백엔드 내부(질문+스키마→Claude→SQL→DB→스트리밍)는 모름.
//   요청: POST {userInput, context}, Accept: text/event-stream, (선택)Authorization: Bearer <token>
//   응답: SSE event:data(청크) → event:result(완료) → sse.js 로 파싱해 onData/onResult/onError 로 흘려보낸다.
// ※ 백엔드가 reportPlan/queryInfo.sql 을 구성. 전용 템플릿(옵션 C) 시각까지 동형으로 내려면 shaped result 도
//   함께 실어줘야 한다(검증 스텁은 그렇게 한다). 표준 계약만 주면 ChartRenderer 가 reportPlan 경로로 렌더.

import { consumeEventStream } from "./sse";
import { EVT } from "./contract";

const API = import.meta.env.VITE_BACKEND_API;
const TOKEN = import.meta.env.VITE_BACKEND_TOKEN;
const COMPANY_ID = import.meta.env.VITE_BACKEND_COMPANY_ID || "EDUPAY"; // §갭③ — 백엔드 기대값 EDUPAY(격리 미사용)
const PATH = "/query"; // 백엔드 합의 후 확정(§13)

export const backendSource = {
  /**
   * @param {{userInput:string, context?:object, hints?:object}} req
   * @param {{onData?:Function, onResult?:Function, onError?:Function}} handlers
   * @param {AbortSignal} [signal]
   */
  async query(req, handlers, signal) {
    const { onData, onResult, onError } = handlers || {};
    if (!API) {
      onError && onError({ code: "NO_BACKEND_API", message: "VITE_BACKEND_API 미설정" });
      return;
    }
    const headers = { "Content-Type": "application/json", Accept: "text/event-stream" };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    // context.companyId: 백엔드 채널 전용 값(VITE_BACKEND_COMPANY_ID, 기본 EDUPAY)을 최종으로 강제(§갭③)
    const context = { ...(req && req.context), companyId: COMPANY_ID };
    try {
      const r = await fetch(`${API}${PATH}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userInput: (req && req.userInput) || "", context }),
        signal,
      });
      if (!r.ok) {
        // 스트림 전 오류(§4.5): HTTP 상태 + JSON {code, errorMessage} → errorMessage 를 프론트에 표시
        let msg = `요청 실패 (HTTP ${r.status})`;
        let code;
        try { const j = await r.json(); if (j) { code = j.code; if (j.errorMessage || j.message) msg = j.errorMessage || j.message; } } catch (e) {}
        onError && onError({ httpStatus: r.status, code, message: msg });
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
      if (err && err.name === "AbortError") return; // 취소는 조용히 종료
      onError && onError({ message: (err && err.message) || String(err) });
    }
  },
};

export default backendSource;
