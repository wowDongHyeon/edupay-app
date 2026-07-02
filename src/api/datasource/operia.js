// operia 어댑터 (1순위) — DATASOURCE_설계.md §5.1, §4.2 / 실연동(nginx 상대경로 + 2단계 세션)
//
// 실제 오페리아 SSE 호출. backend 와 동일 계약(SSE data→result)이나 흐름은 2단계다.
//   ① 세션 생성 : POST /api/v1/sessions        (대화당 1회, lazy)
//   ② 채팅 스트림: POST /api/v1/agent/stream    (매 질문)
// 경로는 모두 상대경로 → same-origin 의 nginx 가 실서버로 프록시하고 API 키를 '서버에서' 주입한다.
//   → 프론트 번들/코드/env 어디에도 API 키를 두지 않는다(X-Api-Key 미전송).
//
// 헤더:
//   공통      : Content-Type: application/json, X-User-Id: <userId>
//   세션 생성 : 공통 + body {"userId": <userId>}          → 응답에서 sessionId 취득
//   채팅      : 공통 + X-Session-Id: <sessionId> + Accept: text/event-stream
//               + body {"userInput", "context":{"companyId": <companyId>}}
//
// 세션 수명 = 대화별: 같은 대화는 sessionId 재사용, 새 대화는 새 세션을 lazy 생성.
//   App(convos/activeId)이 대화 경계에서 resetOperiaSession() 을 호출해 캐시를 비운다.

import { consumeEventStream } from "./sse";
import { EVT } from "./contract";

// companyId(§4.2 데이터 격리·DB 라우팅): env 값. userId 는 컨텍스트가 아니라 헤더로만 보낸다.
const COMPANY_ID = import.meta.env.VITE_OPERIA_COMPANY_ID || "edupay";
const MAX_INPUT = 500; // userInput 길이 제한

// ── 세션 캐시(대화 단위) ──
// sessionPromise: 현재 대화의 sessionId 를 담은 Promise(중복 생성 방지). resetOperiaSession() 으로 무효화.
let sessionPromise = null;

/** 새 대화 시작 시 호출 — 다음 질문에서 새 sessionId 를 lazy 생성하게 한다. */
export function resetOperiaSession() {
  sessionPromise = null;
}

// POST /api/v1/sessions → sessionId. 헤더(X-Session-Id) 우선, 없으면 body 의 흔한 키들에서 탐색.
async function createSession(userId, signal) {
  const headers = { "Content-Type": "application/json" };
  if (userId) headers["X-User-Id"] = String(userId);
  const r = await fetch("/api/v1/sessions", {
    method: "POST",
    headers,
    body: JSON.stringify({ userId: userId || null }),
    signal,
  });
  if (!r.ok) throw { httpStatus: r.status, message: `sessions ${r.status}` };
  // sessionId 위치는 서버 구현에 따라 다름 → 헤더/body 양쪽을 방어적으로 파싱(§13 도착 후 확인).
  const hdr = r.headers.get("X-Session-Id") || r.headers.get("x-session-id");
  if (hdr) return hdr;
  let body = null;
  try { body = await r.json(); } catch (e) { /* body 없음 */ }
  const sid =
    body &&
    (body.sessionId ||
      body.session_id ||
      body.id ||
      (body.data && (body.data.sessionId || body.data.session_id || body.data.id)));
  if (!sid) throw { message: "sessions no-id" };
  return String(sid);
}

// 현재 대화의 sessionId(Promise). 최초 1회만 생성하고 재사용. 생성 실패 시 캐시 무효화(다음 재시도 재생성).
function ensureSession(userId, signal) {
  if (!sessionPromise) {
    sessionPromise = createSession(userId, signal).catch((e) => {
      sessionPromise = null;
      throw e;
    });
  }
  return sessionPromise;
}

export const operiaSource = {
  /**
   * @param {{userInput:string, context?:object, hints?:object}} req
   * @param {{onData?:Function, onResult?:Function, onError?:Function}} handlers
   * @param {AbortSignal} [signal]
   */
  async query(req, handlers, signal) {
    const { onData, onResult, onError } = handlers || {};
    // userId: App(session.getUserId)이 context.userId 로 넘겨준 값. 서버로는 헤더로만 보낸다.
    const userId = req && req.context && req.context.userId;
    const userInput = String((req && req.userInput) || "").slice(0, MAX_INPUT);
    // 서버로 보내는 context 는 companyId 만(userId 는 헤더). §4.2
    const context = { companyId: COMPANY_ID };
    try {
      const sessionId = await ensureSession(userId, signal);
      const headers = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Session-Id": sessionId,
      };
      if (userId) headers["X-User-Id"] = String(userId);
      const r = await fetch("/api/v1/agent/stream", {
        method: "POST",
        headers,
        body: JSON.stringify({ userInput, context }),
        signal,
      });
      if (!r.ok) {
        // 세션 무효(401/403) 가능성 → 캐시를 비워 다음 시도에 새 세션 생성.
        if (r.status === 401 || r.status === 403) resetOperiaSession();
        // 기술 상태코드만 전달(한글 미포함) → App 이 친근 문구+다시시도로 흡수(기술문자열 노출 0).
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
      if (err && err.name === "AbortError") return; // 취소는 조용히 종료
      // 세션 생성/네트워크 실패 → 캐시 무효화(다음 재시도 재생성). 기술 메시지 → 친근 문구로 흡수.
      resetOperiaSession();
      onError && onError({ httpStatus: err && err.httpStatus, message: (err && err.message) || String(err) });
    }
  },
};

export default operiaSource;
