// shapeForIntent — DATASOURCE_설계.md §0.2, §6, §6-1 (프론트가 카드 결정 + tableData→카드 입력 shape)
//
// 프론트가 cardIntent 로 카드를 정하고, 채널이 준 표준 tableData 를 그 카드의 표준 입력으로 변환한다.
//   · 컬럼은 columnMetadata 타입 역할(범주=varchar / 값=integer·decimal / 시간축=date·YYYY-MM / 좌표=lat·lng)로 매핑.
//     → 컬럼 '이름' 의존 최소. 채널이 다른 컬럼명을 줘도 역할로 매핑(mock/backend 는 표준명이라 그대로 통과).
//   · 역할 매핑 후 기존 queries.js shaper(QUERIES[intent].shape) 를 재사용해 카드 표준 입력 생성.
//   · 필요한 역할 컬럼이 없거나 결과가 비면 null 반환(= ChartRenderer 가 reportPlan/table 폴백).
import { QUERIES } from "../mock/operia/queries";

// intent별 표준 입력 컬럼(슬롯) — queries.js shaper 가 기대하는 컬럼명 + 역할. opt=있으면 매핑/없어도 됨.
// ★ 실 backend 형태 적응(§6-1): breakdown/students 처럼 채널이 안 줄 수 있는 컬럼은 opt 로 둔다
//   (report 월별=막대만, schoolCompare=총액 기준). shaper 가 누락을 견디게 짝지어 수정(queries.js).
const SLOTS = {
  report:            [{ n: "month", role: "temporal" }, { n: "amount", role: "value" }, { n: "means", role: "category", opt: true }],
  reportDaily:       [{ n: "day", role: "temporal" }, { n: "amount", role: "value" }],
  catSpend:          [{ n: "category", role: "category" }, { n: "amount", role: "value" }, { n: "cnt", role: "value", opt: true }],
  friendCompare:     [{ n: "k", role: "category" }, { n: "v", role: "value" }],
  nudgeCompare:      [{ n: "month", role: "temporal" }, { n: "cnt", role: "value" }, { n: "amount", role: "value" }],
  // balance 는 SLOTS 미사용 — 입력 형태가 이질적(가로 단일행 피벗/세로/계산형)이라 shapeForIntent 가 raw 를 그대로 넘기고 shape 가 형태를 판별한다.
  channel:           [{ n: "channel", role: "category" }, { n: "amount", role: "value" }, { n: "cnt", role: "value", opt: true }, { n: "item", role: "category", opt: true }, { n: "cat", role: "category", opt: true }, { n: "dt", role: "temporal", opt: true }],
  merchantBreakdown: [{ n: "merchant", role: "category" }, { n: "amount", role: "value" }],
  schoolCompare:     [{ n: "school", role: "category" }, { n: "tot", role: "value" }, { n: "students", role: "value", opt: true }],
  parentCard:        [{ n: "date", role: "temporal" }, { n: "merchant", role: "category" }, { n: "amount", role: "value" }],
  merchantMap:       [{ n: "lat", role: "coord" }, { n: "lng", role: "coord" }, { n: "name", role: "category" }, { n: "category", role: "category", opt: true }, { n: "addr", role: "category", opt: true }],
};

// 측정값 슬롯 선호: 같은 value 역할 후보가 여럿일 때 슬롯 의미에 맞는 컬럼을 고른다
// (예: 온오프 결과 {cnt_pay, sum_pay_dlng_amt} → amount 는 sum, cnt 는 count 를 선택).
const VALUE_PREF = {
  amount: /amt|amount|sum|tot|total|dlng|spend/i,
  tot: /amt|amount|sum|tot|total|dlng|spend/i,
  v: /amt|amount|sum|tot|total|dlng|spend/i,
  cnt: /cnt|count|num|회/i,
  students: /stu|student|count|cnt|num|인원/i,
};

// 날짜 패턴(시간축 판정): YYYY-MM / YYYY-MM-DD / YYYYMM / YYYYMMDD
const TEMPORAL_RE = [/^\d{4}-\d{2}(-\d{2})?$/, /^\d{6}(\d{2})?$/];

function inferType(rows, col) {
  const vals = rows.map((r) => r[col]).filter((v) => v != null);
  if (!vals.length) return "varchar";
  if (vals.every((v) => typeof v === "number" && !Number.isNaN(v))) return vals.every((v) => Number.isInteger(v)) ? "integer" : "decimal";
  return "varchar";
}

// 컬럼 → 역할. 수치(decimal/integer)는 항상 측정값(6/8자리 금액을 시간축으로 오인하지 않게 패턴 검사 전에 처리).
// 시간축은 type=date 뿐 아니라 '값 패턴'(YYYY-MM[-DD]/YYYYMM[DD])으로도 인식(backend 월/일축이 varchar 로 와도 처리, §6-1·작업A).
function roleOf(column, type, rows) {
  const name = String(column || "").toLowerCase();
  if (name === "lat" || name === "lng" || name === "lon" || name === "longitude" || name === "latitude") return "coord";
  if (type === "date" || type === "datetime") return "temporal";
  if (type === "integer" || type === "decimal") return "value";
  const sample = rows.map((r) => r[column]).find((v) => v != null);
  const s = sample == null ? "" : String(sample);
  if (TEMPORAL_RE.some((re) => re.test(s))) return "temporal";
  return "category";
}

// 슬롯에 채울 컬럼 선택: 같은 역할 후보 중 슬롯 선호(VALUE_PREF) 매칭 우선, 없으면 첫 미사용.
function pickCandidate(slot, byRole, used) {
  const avail = (byRole[slot.role] || []).filter((c) => !used.has(c));
  if (!avail.length) return null;
  const pref = VALUE_PREF[slot.n];
  if (pref) { const hit = avail.find((c) => pref.test(c)); if (hit) return hit; }
  return avail[0];
}

// tableData 를 intent 표준 컬럼명으로 정규화. 표준명이 이미 있으면 그대로(mock/backend), 없으면 역할로 매핑(operia/backend).
function normalizeColumns(intent, rows, columnMetadata) {
  const slots = SLOTS[intent];
  if (!slots) return null;
  const cols = Object.keys(rows[0] || {});
  const required = slots.filter((s) => !s.opt);
  // 표준 컬럼명이 모두 있으면 정규화 불필요(우리 채널의 컬럼 계약)
  if (required.every((s) => cols.includes(s.n))) return rows;

  // 역할 버킷(columnMetadata 우선, 없으면 값으로 추론)
  const meta = (Array.isArray(columnMetadata) && columnMetadata.length)
    ? columnMetadata
    : cols.map((c) => ({ column: c, type: inferType(rows, c) }));
  const byRole = { temporal: [], category: [], value: [], coord: [] };
  for (const c of meta) {
    if (!cols.includes(c.column)) continue; // tableData 에 실제 있는 컬럼만
    const r = roleOf(c.column, c.type, rows);
    (byRole[r] || byRole.category).push(c.column);
  }
  const used = new Set();
  const map = {};
  // 1) 정확 이름 매칭 먼저 — 표준명 컬럼은 그 슬롯에 고정(addr 등이 다른 슬롯에 흡수되는 것 방지)
  for (const s of slots) if (cols.includes(s.n)) { map[s.n] = s.n; used.add(s.n); }
  // 2) 남은 슬롯을 역할로 채움(측정값은 VALUE_PREF 로 의미 맞춤)
  for (const s of slots) {
    if (map[s.n]) continue;
    const cand = pickCandidate(s, byRole, used);
    if (cand) { map[s.n] = cand; used.add(cand); }
    else if (!s.opt) return null; // 필수 역할 컬럼 부족 → 폴백
  }
  return rows.map((row) => {
    const o = {};
    for (const [std, actual] of Object.entries(map)) o[std] = row[actual];
    return o;
  });
}

// shape 결과 유효성(핵심 필드 존재 + 비어있지 않음). 무효면 null → 폴백.
function isValidShape(intent, s) {
  if (!s || typeof s !== "object") return false;
  switch (intent) {
    case "report": case "reportDaily": return Array.isArray(s.series) && s.series.length > 0;
    case "catSpend": return Array.isArray(s.slices) && s.slices.length > 0;
    case "friendCompare": return Array.isArray(s.bars) && s.bars.length > 0;
    case "nudgeCompare": return Array.isArray(s.monthly);
    case "balance": case "merchantBreakdown": case "schoolCompare": return Array.isArray(s.items) && s.items.length > 0;
    case "channel": return Array.isArray(s.groups) && Array.isArray(s.rows);
    case "parentCard": return Array.isArray(s.rows);
    case "merchantMap": return Array.isArray(s.items) && s.items.some((m) => m && m.lat != null && m.lng != null);
    default: return false;
  }
}

/**
 * 카드 표준 입력 생성. 실패(미지원 intent / 역할 부족 / 무효) 시 null → 폴백.
 * @param {string} intent
 * @param {Object[]} tableData
 * @param {Array} [columnMetadata]
 * @returns {Object|null}
 */
export function shapeForIntent(intent, tableData, columnMetadata) {
  const def = QUERIES[intent];
  if (!def || typeof def.shape !== "function") return null;
  const rows = Array.isArray(tableData) ? tableData : [];
  if (!rows.length) return null;
  // balance 는 입력 형태가 이질적(가로 단일행 피벗/세로/계산형) → 역할 정규화 없이 raw 전달, shape 가 형태 판별.
  const normalized = intent === "balance" ? rows : normalizeColumns(intent, rows, columnMetadata);
  if (!normalized) return null;
  let shaped;
  try { shaped = def.shape(normalized); } catch (e) { return null; }
  return isValidShape(intent, shaped) ? shaped : null;
}

export default shapeForIntent;
