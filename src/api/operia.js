// 오페리아 API(NL2SQL 에이전트) 클라이언트 — MOCK_API_설계.md §3, §8(옵션 B: 프론트 alasql 실행)
//
// 모드 우선순위(§8.1):
//   VITE_OPERIA_API (실서버)  >  VITE_OPERIA_AI === "true" (alasql 로컬 실행)  >  정적 목업(src/mock/operia)
// 세 모드 모두 queryOperia(intent, params, question) → { question, sql, result } 동일 계약.
//
// 옵션 B: 데이터셋을 프롬프트에 넣지 않는다(가볍고 안정·무료).
//   · 알려진 10개 intent → 고정 SQL 템플릿(queries.js)을 alasql로 dataset.json 위에서 실행(Claude 호출 없음, 결정적).
//   · 그 외 데이터 질문 → Claude 경량 호출(스키마만, SELECT 한 문장) → alasql 실행 → rows → table.
//   · 실패(SQL 비었음/SELECT아님/alasql 예외) → throw → 화면 에러(정적 목업 자동 폴백 안 함).
// ※ 차트 유형은 응답이 아니라 프론트가 결정(src/charts/registry.js INTENT_CHART).
import alasql from "alasql";
import results from "../mock/operia";
import { QUERIES } from "../mock/operia/queries";
import { complete } from "./claude"; // 저수준 Anthropic 호출 재사용 (자유대화 window.claude.complete와 분리)
// DB 대역 고정 fixture(§8.2). alasql이 이 데이터셋 위에서 SQL을 실제 실행한다.
// ※ 이 dataset.json은 추후 edupay_db 더미데이터(빈 DB 시드)로 그대로 재활용한다(§8.7).
import dataset from "../mock/operia/dataset.json";

const BASE = import.meta.env.VITE_OPERIA_API; // 실 오페리아 베이스
const AI = import.meta.env.VITE_OPERIA_AI === "true"; // alasql 로컬 실행 모드
// §8.5/§10 키 게이팅 — 키가 비면(배포 프로파일) Claude(NL→SQL) 경로를 아예 시도하지 않는다.
// 빌드 시 import.meta.env로 인라인되므로, 키 없는 배포본 번들엔 키도 호출도 없음.
const HAS_KEY = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

// App.send 라우팅이 참조 — 시뮬 모드(실서버 미설정 + AI on)일 때 true
export function isOperiaAiMode() {
  return !BASE && AI;
}

// ── alasql 테이블 등록 (1회) ──
let registered = false;
function ensureTables() {
  if (registered) return;
  for (const t of ["TB_COM_USER", "TB_COM_VOUCHER", "TB_PAY_DTL", "TB_BEG"]) {
    alasql.tables[t] = { data: dataset[t] || [] };
  }
  registered = true;
}
function runSql(sql) {
  ensureTables();
  return alasql(sql);
}

// ① 알려진 intent → 템플릿 SQL alasql 실행 → shaper로 §5 형태 조립
function runKnown(intent, question) {
  const def = QUERIES[intent];
  const sets = {};
  const sqlList = [];
  for (const [key, sql] of Object.entries(def.sqls)) {
    sets[key] = runSql(sql); // alasql 예외는 상위로 전파 → throw
    sqlList.push(sql);
  }
  return { question: question || intent, sql: sqlList.join(";\n"), result: def.shape(sets) };
}

// §8.5 그 외 질문 — Claude 경량 NL→SQL (데이터셋 미주입, SELECT 한 문장만)
const SQL_SYSTEM =
  `너는 '오페리아' NL2SQL 에이전트. 질문을 alasql 호환 SELECT 한 문장으로만 변환해 출력한다.
SQL 외 텍스트 금지(설명·코드펜스 금지). 대상 USER_ID='stu_demo', 보통 PAY_STTS='APPROVED'.
[함수] DATE_FORMAT 금지. 월=SUBSTR(PAY_DT,1,7), 일자=SUBSTR(PAY_DT,1,10), 시각(시)=SUBSTR(PAY_DT,12,2), 요일=DAYOFWEEK(PAY_DT)(1=일~7=토). SUM/COUNT/AVG/GROUP BY/JOIN/ORDER BY/LIMIT 가능.
[지침] 집계 질문이면 GROUP BY + 합계로 ORDER BY ... DESC. 결과가 비지 않도록 특정 요일/날짜로 좁히는 불필요한 WHERE는 넣지 말 것.
[중요] 컬럼 별칭(AS)·식별자는 반드시 영문 소문자만(예: dow, hour, cnt, amount). 한글 별칭/식별자 금지(alasql 파서 오류). CASE 식도 영문 별칭만.
[스키마] TB_COM_USER(USER_ID,USER_TYPE,SCH_NM,GRADE) / TB_COM_VOUCHER(MERCHANT_NO,MERCHANT_NM,BIZ_ITEM_NM,ADDR,LAT,LNG) / TB_PAY_DTL(USER_ID,MERCHANT_NO,PAY_AMT,PAY_MEANS,PAY_CHANNEL,PAY_STTS,PAY_DT) / TB_BEG(STUDENT_USER_ID,REQ_AMT,RECV_AMT,REQ_STTS,REQ_DT)`;

function stripFence(t) {
  return String(t || "").trim().replace(/^```(?:sql|json)?/i, "").replace(/```\s*$/i, "").trim();
}

async function runClaudeSql(question) {
  // §8.5 키 게이팅: 키 없으면 Claude 호출 없이 친절 안내 반환(에러/throw 아님 — 배포본 안전)
  if (!HAS_KEY) {
    return { unsupported: true, message: "그 질문은 아직 지원하지 않아요. 위의 자주 묻는 질문이나 카드로 물어봐 줘 🙏" };
  }
  const raw = await complete({ system: SQL_SYSTEM, messages: [{ role: "user", content: question }], max_tokens: 400 });
  let sql = stripFence(raw).replace(/;\s*$/, "").trim();
  if (!sql || !/^select\b/i.test(sql)) throw new Error("오페리아: 유효한 SELECT 생성 실패");
  let rows;
  try {
    rows = runSql(sql);
  } catch (e) {
    throw new Error("오페리아 SQL 실행 오류: " + (e && e.message ? e.message : e));
  }
  return { question, sql, result: rows };
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
  // ② 시뮬 (프론트 alasql 실행)
  if (AI) {
    if (QUERIES[intent]) return runKnown(intent, question);
    return runClaudeSql(question || String(intent)); // 미지원 데이터 질문 → Claude SQL → table
  }
  // ③ 정적 목업 (폴백 최하위)
  await new Promise((r) => setTimeout(r, 300));
  const m = results[intent];
  if (!m) throw new Error("no mock for " + intent);
  return typeof m === "function" ? m(params) : m;
}
