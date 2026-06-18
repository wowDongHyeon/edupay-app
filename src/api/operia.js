// 오페리아 API(NL2SQL 에이전트) 클라이언트 — MOCK_API_설계.md §3, §8
//
// 모드 우선순위(§8.1):
//   VITE_OPERIA_API (실서버)  >  VITE_OPERIA_AI === "true" (Claude 시뮬)  >  정적 목업(src/mock/operia)
// 세 모드 모두 queryOperia(intent, params, question) → { question, sql, result } 동일 계약.
// ※ 차트 유형은 응답이 아니라 프론트가 결정(src/charts/registry.js INTENT_CHART).
// ※ AI 시뮬 실패(키없음/네트워크/파싱오류) → throw → 화면 에러. 정적 목업으로 자동 폴백하지 않음(§8.1).
import results from "../mock/operia";
import { complete } from "./claude"; // 저수준 Anthropic 호출 재사용 (자유대화 window.claude.complete와 분리)

const BASE = import.meta.env.VITE_OPERIA_API; // 실 오페리아 베이스
const AI = import.meta.env.VITE_OPERIA_AI === "true"; // Claude 시뮬 모드

// App.send 라우팅이 참조 — AI 시뮬 모드(실서버 미설정 + AI on)일 때 true
export function isOperiaAiMode() {
  return !BASE && AI;
}

// §8.3 시스템 프롬프트 — operia.js가 사용 (오페리아 NL2SQL 페르소나)
const OPERIA_SYSTEM = `너는 '오페리아', 충청북도 교육지원금 결제 데이터의 NL2SQL 에이전트다.
아래 스키마를 참조해 사용자 질문을 MySQL SQL로 변환하고, 그 쿼리가 반환했을 법한 결과를 현실적으로 생성한다.
반드시 JSON만 출력한다(마크다운/코드펜스/설명 금지): {"question": <원질문>, "sql": <생성 SQL>, "result": <결과>}
result는 반드시 sql 쿼리가 반환했을 결과와 일치(컬럼/집계/필터 의미 일관)해야 한다.

[스키마]
- TB_COM_USER(USER_ID, USER_TYPE, USER_NM, SCH_NM, GRADE, CLS_NO, ...)
- TB_COM_VOUCHER(MERCHANT_NO, MERCHANT_NM, BIZ_TYPE_NM, BIZ_ITEM_NM, ADDR, USE_YN, VOUCHER_STTS_NM, LAT, LNG)
- TB_PAY_DTL(PAY_ID, USER_ID, MERCHANT_NO, PAY_AMT, PAY_MEANS[VOUCHER/APPCARD/BEG], PAY_CHANNEL[ONLINE/OFFLINE], PAY_STTS[APPROVED/CANCELED], PAY_DT)
- TB_BEG(BEG_ID, STUDENT_USER_ID, PARENT_USER_ID, REQ_AMT, RECV_AMT, REQ_STTS, REQ_DT)

[데모 컨텍스트] USER_ID=stu_demo, 중학생, 학교=흥덕중, 최근 3개월(4·5·6월), 금액 단위 원, 바우처 한도 100,000.

[result 규칙]
- expectedShape 가 주어지면: 그 JSON 구조를 그대로 유지하고 값만 현실적으로 채운다(키/중첩 변경 금지).
- expectedShape 가 없으면: 질문에 맞는 행 배열(rows: [{컬럼:값,...}])로 반환.
- 숫자는 number 타입, 한글 라벨 사용, 합계/비율은 서로 일관되게.`;

// ```json 펜스 제거 (§8.4) — 부분 JSON 복구는 시도하지 않는다.
function stripFence(t) {
  return String(t || "").trim().replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
}

// 알려진 intent면 그 intent의 result 예시를 expectedShape 견본으로 재사용(값은 Claude가 새로 채움)
function shapeAndQuestion(intent, params, question) {
  const m = results[intent];
  const known = typeof m === "function" ? m(params) : m;
  return {
    expectedShape: known ? known.result : null,
    q: question || (known && known.question) || String(intent),
  };
}

async function queryOperiaAI(intent, params, question) {
  const { expectedShape, q } = shapeAndQuestion(intent, params, question);
  const userMsg =
    `질문: ${q}` + (expectedShape ? `\nexpectedShape: ${JSON.stringify(expectedShape)}` : "");
  const raw = await complete({
    system: OPERIA_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
    max_tokens: 2000,
  });
  // §8.4 파싱 가드: 펜스 제거 → JSON.parse, 실패하면 throw(부분 복구 금지)
  let obj;
  try {
    obj = JSON.parse(stripFence(raw));
  } catch (e) {
    throw new Error("오페리아 AI 응답 JSON 파싱 실패");
  }
  if (!obj || typeof obj !== "object" || obj.result == null) {
    throw new Error("오페리아 AI 응답에 result 없음");
  }
  return {
    question: obj.question != null ? obj.question : q,
    sql: obj.sql != null ? obj.sql : null,
    result: obj.result,
  };
}

export async function queryOperia(intent, params, question) {
  // ① 실 오페리아 서버
  if (BASE) {
    const r = await fetch(`${BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, params }),
    });
    if (!r.ok) throw new Error("operia " + r.status);
    return r.json(); // { question, sql, result }
  }
  // ② Claude 시뮬 (가짜 오페리아)
  if (AI) return queryOperiaAI(intent, params, question);
  // ③ 정적 목업 (폴백 최하위)
  await new Promise((r) => setTimeout(r, 300));
  const m = results[intent];
  if (!m) throw new Error("no mock for " + intent);
  return typeof m === "function" ? m(params) : m;
}
