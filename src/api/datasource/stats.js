// summaryStats 클라이언트 계산 + 컬럼 타입 추론 — DATASOURCE_설계.md §4.4, §5.3
//
// §4.4: summaryStats 계산 책임 = 클라이언트(확정). 채널이 보내도 클라 계산값을 단일 기준으로 쓴다.
//   => backend/mock 은 summaryStats 를 비워도 되고, 여기서 tableData+columnMetadata 로 직접 계산한다.

const round1 = (n) => Math.round((n || 0) * 10) / 10; // 소수1자리(%·평균)

// 값 1개의 SQL-유사 타입 추정용
function inferType(data, column) {
  const vals = data.map((r) => r[column]).filter((v) => v != null);
  if (!vals.length) return "varchar";
  if (vals.every((v) => typeof v === "number" && !Number.isNaN(v))) {
    return vals.every((v) => Number.isInteger(v)) ? "integer" : "decimal";
  }
  if (vals.every((v) => typeof v === "string")) {
    if (vals.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))) return "date";
    if (vals.every((v) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v))) return "datetime";
  }
  return "varchar";
}

/**
 * rows 값으로 columnMetadata 추론(§5.3). number→integer/decimal, YYYY-MM-DD→date 등.
 * @param {Object[]} rows
 * @returns {import('./contract').ColumnMeta[]}
 */
export function inferColumnMetadata(rows) {
  const data = Array.isArray(rows) ? rows : [];
  const first = data.find((r) => r && typeof r === "object");
  if (!first) return [];
  return Object.keys(first).map((column, displayOrder) => ({
    type: inferType(data, column),
    column,
    label: column,
    displayOrder,
  }));
}

const isNumType = (t) => t === "decimal" || t === "integer";
const isDateType = (t) => t === "date" || t === "datetime";

/**
 * 클라이언트 측 summaryStats 계산(§4.4).
 * @param {Object[]} rows                 tableData(누적된 결과 행)
 * @param {import('./contract').ColumnMeta[]} [columnMetadata]  없으면 값으로 추론
 * @returns {{totalCount:number, columns:Object[], groups:Object[], dateRanges:Object[]}}
 */
export function computeSummaryStats(rows, columnMetadata) {
  const data = Array.isArray(rows) ? rows : [];
  const meta = Array.isArray(columnMetadata) && columnMetadata.length ? columnMetadata : inferColumnMetadata(data);
  const totalCount = data.length;

  // 수치형 컬럼 통계
  const columns = meta.filter((c) => isNumType(c.type)).map((c) => {
    const col = c.column;
    const nullCount = data.filter((r) => r[col] == null).length;
    const zeroCount = data.filter((r) => r[col] === 0).length;
    const vals = data.map((r) => r[col]).filter((v) => typeof v === "number" && !Number.isNaN(v));
    if (!vals.length) return { column: col, sum: 0, avg: 0, median: 0, max: 0, min: 0, nullCount, zeroCount };
    const sorted = [...vals].sort((a, b) => a - b);
    const sum = vals.reduce((s, x) => s + x, 0);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return {
      column: col,
      sum,
      avg: round1(sum / vals.length),
      median,
      max: sorted[sorted.length - 1],
      min: sorted[0],
      nullCount,
      zeroCount,
    };
  });

  // 날짜형 컬럼 범위
  const dateRanges = meta.filter((c) => isDateType(c.type)).map((c) => {
    const vals = data.map((r) => r[c.column]).filter((v) => v != null && v !== "").map(String).sort();
    return { column: c.column, min: vals[0] || null, max: vals[vals.length - 1] || null };
  });

  // groups(옵션, §4.4): 범주형 1 + 수치형 1 조합이면 그룹 합계 + 비율(소수1자리)
  const groups = [];
  const cat = meta.find((c) => c.type === "varchar");
  const numCol = columns[0];
  if (cat && numCol) {
    const m = new Map();
    for (const r of data) {
      const k = r[cat.column];
      const v = typeof r[numCol.column] === "number" ? r[numCol.column] : 0;
      m.set(k, (m.get(k) || 0) + v);
    }
    const total = [...m.values()].reduce((s, x) => s + x, 0) || 1;
    groups.push({
      groupByColumn: cat.column,
      valueColumn: numCol.column,
      rows: [...m.entries()].map(([label, value]) => ({ label: String(label), value, pct: round1((value / total) * 100) })),
    });
  }

  return { totalCount, columns, groups, dateRanges };
}

export default computeSummaryStats;
