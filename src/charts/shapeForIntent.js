// shapeForIntent — DATASOURCE_설계.md §0.2, §6, §6-1 (프론트가 카드 결정 + tableData→카드 입력 shape)
//
// 프론트가 cardIntent 로 카드를 정하고, 채널이 준 표준 tableData 를 그 카드의 표준 입력으로 변환한다.
//   · 컬럼은 columnMetadata 타입 역할(범주=varchar / 값=integer·decimal / 시간축=date·YYYY-MM / 좌표=lat·lng)로 매핑.
//     → 컬럼 '이름' 의존 최소. 채널이 다른 컬럼명을 줘도 역할로 매핑(mock/backend 는 표준명이라 그대로 통과).
//   · 역할 매핑 후 기존 queries.js shaper(QUERIES[intent].shape) 를 재사용해 카드 표준 입력 생성.
//   · 필요한 역할 컬럼이 없거나 결과가 비면 null 반환(= ChartRenderer 가 reportPlan/table 폴백).
import { QUERIES } from "../mock/operia/queries";

// intent별 표준 입력 컬럼(슬롯) — queries.js shaper 가 기대하는 컬럼명 + 역할. opt=있으면 매핑/없어도 됨.
const SLOTS = {
  report:            [{ n: "month", role: "temporal" }, { n: "means", role: "category" }, { n: "amount", role: "value" }],
  reportDaily:       [{ n: "day", role: "temporal" }, { n: "amount", role: "value" }],
  catSpend:          [{ n: "category", role: "category" }, { n: "amount", role: "value" }, { n: "cnt", role: "value", opt: true }],
  friendCompare:     [{ n: "k", role: "category" }, { n: "v", role: "value" }],
  nudgeCompare:      [{ n: "month", role: "temporal" }, { n: "cnt", role: "value" }, { n: "amount", role: "value" }],
  balance:           [{ n: "k", role: "category" }, { n: "v", role: "value" }],
  channel:           [{ n: "channel", role: "category" }, { n: "amount", role: "value" }, { n: "item", role: "category", opt: true }, { n: "cat", role: "category", opt: true }, { n: "dt", role: "temporal", opt: true }],
  merchantBreakdown: [{ n: "merchant", role: "category" }, { n: "amount", role: "value" }],
  schoolCompare:     [{ n: "school", role: "category" }, { n: "tot", role: "value" }, { n: "students", role: "value" }],
  parentCard:        [{ n: "date", role: "temporal" }, { n: "merchant", role: "category" }, { n: "amount", role: "value" }],
  merchantMap:       [{ n: "lat", role: "coord" }, { n: "lng", role: "coord" }, { n: "name", role: "category" }, { n: "category", role: "category", opt: true }, { n: "addr", role: "category", opt: true }],
};

function inferType(rows, col) {
  const vals = rows.map((r) => r[col]).filter((v) => v != null);
  if (!vals.length) return "varchar";
  if (vals.every((v) => typeof v === "number" && !Number.isNaN(v))) return vals.every((v) => Number.isInteger(v)) ? "integer" : "decimal";
  return "varchar";
}

// 컬럼 → 역할(타입 + 값 패턴). 컬럼 '이름'은 좌표 식별에만 보조 사용.
function roleOf(column, type, rows) {
  const name = String(column || "").toLowerCase();
  if (name === "lat" || name === "lng" || name === "lon" || name === "longitude" || name === "latitude") return "coord";
  if (type === "date" || type === "datetime") return "temporal";
  const sample = rows.map((r) => r[column]).find((v) => v != null);
  if (typeof sample === "string" && /^\d{4}-\d{2}(-\d{2})?/.test(sample)) return "temporal"; // YYYY-MM / YYYY-MM-DD
  if (type === "integer" || type === "decimal") return "value";
  return "category";
}

// tableData 를 intent 표준 컬럼명으로 정규화. 표준명이 이미 있으면 그대로(mock/backend), 없으면 역할로 매핑(operia).
function normalizeColumns(intent, rows, columnMetadata) {
  const slots = SLOTS[intent];
  if (!slots) return null;
  const cols = Object.keys(rows[0] || {});
  const required = slots.filter((s) => !s.opt);
  // 표준 컬럼명이 모두 있으면 정규화 불필요(우리 채널의 컬럼 계약)
  if (required.every((s) => cols.includes(s.n))) return rows;

  // 역할 버킷
  const meta = (Array.isArray(columnMetadata) && columnMetadata.length)
    ? columnMetadata
    : cols.map((c) => ({ column: c, type: inferType(rows, c) }));
  const byRole = { temporal: [], category: [], value: [], coord: [] };
  for (const c of meta) {
    const r = roleOf(c.column, c.type, rows);
    (byRole[r] || byRole.category).push(c.column);
  }
  const used = new Set();
  const map = {};
  for (const s of slots) {
    if (cols.includes(s.n)) { map[s.n] = s.n; used.add(s.n); continue; }
    const cand = (byRole[s.role] || []).find((c) => !used.has(c));
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
  const normalized = normalizeColumns(intent, rows, columnMetadata);
  if (!normalized) return null;
  let shaped;
  try { shaped = def.shape(normalized); } catch (e) { return null; }
  return isValidShape(intent, shaped) ? shaped : null;
}

export default shapeForIntent;
