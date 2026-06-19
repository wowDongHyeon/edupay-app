// 오페리아 API(NL2SQL 에이전트) 클라이언트 — MOCK_API_설계.md §3, §8(옵션 B: 프론트 alasql 실행)
//
// 모드 우선순위(§8.1):
//   VITE_OPERIA_API (실서버)  >  VITE_OPERIA_AI === "true" (alasql 로컬 실행)  >  정적 목업(src/mock/operia)
// 세 모드 모두 queryOperia(intent, params, question) → { question, sql, result } 동일 계약.
//
// 옵션 B: 데이터셋을 프롬프트에 넣지 않는다(가볍고 안정·무료).
//   · 알려진 10개 intent → (★ intent당 SQL 1문장·UNION ALL 허용 = 실 오페리아 1요청=1쿼리 계약, §8.4)
//       - 키 있음(VITE_ANTHROPIC_API_KEY)+VITE_OPERIA_AI → Claude NL→SQL(템플릿과 동일 컬럼의 단일 SQL) → alasql → 기존 shaper.
//         파싱/실행/컬럼 실패 시 고정 SQL 템플릿으로 자동 폴백(§8.8, 데모 안 깨짐).
//       - 키 없음/prod 빌드 → 항상 고정 SQL 템플릿(queries.js)을 alasql로 실행(Claude 호출 없음, 결정적).
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

// ① 알려진 intent → 단일 SQL 1문장 alasql 실행 → shaper로 §5 형태 조립 (결정적·폴백 경로)
// ★ §8.4: intent당 SQL은 1문장(UNION ALL 허용). rawRows = 그 단일 rows 한 세트(§9.6).
// source(§8.8/§9.5): 키 없음·prod에서 처음부터 템플릿이면 "template",
//   키 있어 Claude 시도했으나 실패해 템플릿으로 떨어진 경우엔 "fallback"으로 구분해 호출한다.
function runKnown(intent, question, source = "template") {
  const def = QUERIES[intent];
  const rows = runSql(def.sql); // alasql 예외는 상위로 전파 → throw
  return { question: question || intent, sql: def.sql, result: def.shape(rows), rawRows: rows, source };
}

// ── §8.8 알려진 10개 intent도 Claude NL→SQL (단일 SQL, 템플릿은 reference/폴백) ──
// 템플릿 SQL의 AS 별칭 = 그 SQL이 내야 할 출력 컬럼(계약). shaper가 이 컬럼을 기대한다.
function extractAliases(sql) {
  const out = [];
  const re = /\bAS\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let m;
  while ((m = re.exec(sql))) if (!out.includes(m[1])) out.push(m[1]); // UNION ALL로 중복 별칭 → dedupe
  return out;
}

const KNOWN_SQL_SYSTEM =
  `너는 '오페리아' NL2SQL 에이전트. 주어진 질문(intent)을 alasql 호환 SELECT '한 문장'으로 변환한다.
[출력] 오직 SQL '한 문장'만 출력(코드펜스·설명·JSON 금지). 여러 'SELECT;'를 나열하지 말 것. 한 문장 안의 UNION ALL은 허용(결과셋 1개 유지).
[계약] 지정된 출력 컬럼명을 AS 별칭으로 정확히 동일하게(이름·개수·의미 일치) 내야 한다. result는 그 SQL이 실제 반환할 값과 일관해야 한다.
[범위] reference SQL의 집계 단위(GROUP BY/UNION ALL 구성)·필터 범위·LIMIT를 그대로 유지하라. 질문이 특정 항목(예: 편의점)을 언급해도, reference가 전체를 그룹화하면 전체 그룹을 그대로 반환하고 그 값으로 좁히는 WHERE를 추가하지 말 것(차트는 전체 분포 카드다).
[함수] DATE_FORMAT 금지. 월=SUBSTR(PAY_DT,1,7), 일자=SUBSTR(PAY_DT,1,10). SUM/COUNT/AVG/GROUP BY/JOIN/ORDER BY/LIMIT/DISTINCT/UNION ALL/FROM서브쿼리 가능(스칼라 상관 서브쿼리는 피할 것).
[규칙] 대상 USER_ID='stu_demo', 보통 PAY_STTS='APPROVED'. 별칭·식별자는 영문 소문자만(한글 금지 — alasql 파서 오류). 한글 문자열 리터럴(예: SCH_NM='흥덕중')은 그대로 사용 가능.
[스키마] TB_COM_USER(USER_ID,USER_TYPE,USER_NM,SCH_NM,GRADE,CLS_NO,POINT_BAL) / TB_COM_VOUCHER(MERCHANT_NO,MERCHANT_NM,BIZ_TYPE_NM,BIZ_ITEM_NM,ADDR,USE_YN,VOUCHER_STTS_NM,LAT,LNG) / TB_PAY_DTL(PAY_ID,USER_ID,MERCHANT_NO,PAY_AMT,PAY_MEANS,PAY_CHANNEL,PAY_STTS,PAY_DT) / TB_BEG(BEG_ID,STUDENT_USER_ID,PARENT_USER_ID,REQ_AMT,RECV_AMT,REQ_STTS,REQ_DT)`;

function knownPrompt(intent, question, def) {
  return `질문(intent=${intent}): ${question || intent}
출력 컬럼(AS 별칭) 계약: [${extractAliases(def.sql).join(", ")}]
reference SQL(이 구조·컬럼을 유지, 단일 문장): ${def.sql}
위 컬럼을 그대로 내는 alasql SELECT '한 문장'만 출력하라.`;
}

// Claude 응답에서 단일 SELECT 문장만 추출(코드펜스 제거, 다중 문장 거부)
function parseSingleSql(raw) {
  const sql = stripFence(raw).trim().replace(/;\s*$/, "").trim();
  if (!sql || !/^select\b/i.test(sql)) throw new Error("유효한 SELECT 아님");
  if (sql.includes(";")) throw new Error("여러 문장 금지(단일 SQL)");
  return sql;
}

// Claude가 만든 단일 SQL을 alasql 실행 + 컬럼 검증 → 기존 shaper 그대로. 어떤 실패든 throw(상위에서 템플릿 폴백).
async function runKnownClaude(intent, question) {
  const def = QUERIES[intent];
  const raw = await complete({
    system: KNOWN_SQL_SYSTEM,
    messages: [{ role: "user", content: knownPrompt(intent, question, def) }],
    max_tokens: 700,
  });
  const sql = parseSingleSql(raw);
  const rows = runSql(sql); // alasql 예외 → 상위로 전파(폴백)
  const need = extractAliases(def.sql); // 필수 출력 컬럼(계약)
  if (rows.length && need.some((c) => !(c in rows[0]))) throw new Error("필수 컬럼 누락");
  const result = def.shape(rows); // shaper 예외 → 상위로 전파(폴백)
  return { question: question || intent, sql, result, rawRows: rows, source: "claude" };
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
  return { question, sql, result: rows, rawRows: rows, source: "claude" };
}

export async function queryOperia(intent, params, question) {
  // ① 실 오페리아 서버
  if (BASE) {
    // 실 오페리아는 자연어 질의(question)가 본 신호 — intent/params는 보조(레거시). NL 텍스트를 항상 전달.
    const r = await fetch(`${BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, intent, params }),
    });
    if (!r.ok) throw new Error("operia " + r.status);
    const data = await r.json(); // { question, sql, result }
    return { source: "api", ...data }; // 서버가 source를 주면 그 값을 우선
  }
  // ② 시뮬 (프론트 alasql 실행)
  if (AI) {
    if (QUERIES[intent]) {
      // §8.8 키 있음 → Claude NL→SQL(동일 구조 sqls) → alasql → 기존 shaper. 실패 시 고정 템플릿 폴백.
      // 키 없음/prod 빌드 → 항상 고정 템플릿(결정적·키 무관).
      if (HAS_KEY) {
        try {
          return await runKnownClaude(intent, question); // source: "claude"
        } catch (e) {
          // §9.5 폴백 가시화: Claude 시도 후 실패한 케이스 → source="fallback" (키 없는 "template"과 구분)
          if (import.meta.env.DEV) console.warn("[operia] intent Claude→템플릿 폴백:", intent, e && e.message);
          return runKnown(intent, question, "fallback");
        }
      }
      return runKnown(intent, question, "template"); // 키 없음/prod
    }
    return runClaudeSql(question || String(intent)); // 미지원 데이터 질문 → Claude SQL → table
  }
  // ③ 정적 목업 (폴백 최하위)
  await new Promise((r) => setTimeout(r, 300));
  const m = results[intent];
  if (!m) throw new Error("no mock for " + intent);
  const resp = typeof m === "function" ? m(params) : m;
  return { source: "mock", ...resp };
}
