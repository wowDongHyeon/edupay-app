import React from "react";
import TEMPLATES from "../templates";
import { TableCard } from "../TableCard";
import { InsightBox, monthLabel, dayLabel } from "../util";
/* ReportPlanRenderer — DATASOURCE_설계.md §6, §6-2, §7 (렌더 일원화 §0.2)
 * result.reportPlan.sections[] 를 순서대로 타입별 렌더. 데이터는 tableData(행)+columnMetadata+summaryStats 에서
 * 읽어 기존/신규 템플릿 표준형으로 변환. generic 8개 intent 의 기본 렌더 경로(전용 2개=report/map 은 ChartRenderer).
 *   chart viz: bar_vertical→bar, line→line, area→area, bar_horizontal→barlist, donut→donut, pie→pie
 *   kpi_grid→barlist, kpi_cards→kpiCards, table→table, heading/insight/report→텍스트, 그 외→table 폴백.
 * 섹션 title/subtitle/badge(우리 mock·backend 가 채움)는 템플릿 config 로 전달(operia 가 안 주면 제목 없이 generic).
 */

// 코드값 → 한글 라벨(채널/결제수단 등). generic 차트 축 라벨이 영문 코드로 나오지 않게.
const CODE_LABEL = { OFFLINE: "오프라인", ONLINE: "온라인", VOUCHER: "바우처(지원금)", APPCARD: "부모카드", BEG: "조르기", me: "나", school: "우리학교", province: "충북 평균" };
const fmtLabel = (v) => {
  const s = String(v == null ? "" : v);
  if (CODE_LABEL[s]) return CODE_LABEL[s];
  if (/^\d{4}-\d{2}$/.test(s)) return monthLabel(s);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return dayLabel(s);
  return s;
};

function aggBy(rows, gcol, vcol, agg = "sum") {
  const sum = new Map(), cnt = new Map();
  for (const r of rows || []) {
    const k = r[gcol];
    const v = Number(r[vcol]);
    sum.set(k, (sum.get(k) || 0) + (Number.isNaN(v) ? 0 : v));
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  return [...sum.entries()].map(([k, s]) => ({
    label: fmtLabel(k),
    value: agg === "count" ? cnt.get(k) : agg === "avg" ? Math.round(s / cnt.get(k)) : s,
  }));
}
const withPct = (items) => {
  const t = items.reduce((s, x) => s + (x.value || 0), 0) || 1;
  return items.map((x) => ({ ...x, pct: Math.round((x.value / t) * 100) }));
};
function aggScalar(rows, col, agg = "sum") {
  const vals = (rows || []).map((r) => Number(r[col])).filter((v) => !Number.isNaN(v));
  if (agg === "count") return (rows || []).length;
  if (!vals.length) return 0;
  if (agg === "avg") return Math.round(vals.reduce((s, x) => s + x, 0) / vals.length);
  if (agg === "max") return Math.max(...vals);
  if (agg === "min") return Math.min(...vals);
  return vals.reduce((s, x) => s + x, 0);
}

const metaOf = (section) => ({ title: section.title, subtitle: section.subtitle, badge: section.badge });

function ChartSection({ section, rows }) {
  const cfg = section.config || {};
  const { viz, x, y } = cfg;
  const meta = metaOf(section);
  if (!x || !y || !Array.isArray(rows) || !rows.length) return <TableCard result={rows} />;
  const series = aggBy(rows, x, y);
  if (viz === "bar_vertical") return <TEMPLATES.bar data={{ series }} config={meta} />;
  if (viz === "line") return <TEMPLATES.line data={{ series }} config={meta} />;
  if (viz === "area") return <TEMPLATES.area data={{ series }} config={meta} />;
  if (viz === "bar_horizontal") return <TEMPLATES.barlist data={{ items: withPct(series).sort((a, b) => b.value - a.value) }} config={{ ...meta, options: { showPct: true } }} />;
  if (viz === "donut") { const it = withPct(series); return <TEMPLATES.donut data={{ slices: it, total: it.reduce((s, e) => s + e.value, 0) }} config={meta} />; }
  if (viz === "pie") return <TEMPLATES.pie data={{ slices: withPct(series) }} config={meta} />;
  return <TableCard result={rows} />; // 모르는 viz → table 폴백
}

function KpiGrid({ section, rows }) {
  const g = section.kpiGrid || {};
  if (!g.groupBy || !g.valueColumn) return <TableCard result={rows} />;
  const items = withPct(aggBy(rows, g.groupBy, g.valueColumn, g.agg || "sum")).sort((a, b) => b.value - a.value).slice(0, g.topN || 6);
  if (!items.length) return <TableCard result={rows} />;
  return <TEMPLATES.barlist data={{ items }} config={{ ...metaOf(section), options: { rank: true, showPct: true } }} />;
}

function KpiCards({ section, rows }) {
  const metrics = section.metrics || [];
  // metrics 있으면 컬럼 집계, 없으면 tableData 행을 직접 카드화(예: balance 잔액 items {label,value,unit,sub})
  const items = metrics.length
    ? metrics.map((m) => ({ label: m.label, value: aggScalar(rows, m.column, m.agg || "sum"), unit: m.unit || "", sub: m.sub || "" }))
    : (rows || []).filter((r) => r && r.label != null).map((r) => ({ label: r.label, value: r.value, unit: r.unit || "", sub: r.sub || "" }));
  if (!items.length) return <TableCard result={rows} />;
  return <TEMPLATES.kpiCards data={{ items }} config={metaOf(section)} />;
}

function Section({ section, ctx }) {
  const t = section && section.type;
  const rows = ctx.tableData || [];
  if (t === "heading") return <div className="text-[16px] font-extrabold text-gray-900 px-1 pt-1">{section.content || ""}</div>;
  if (t === "insight" || t === "report") return <InsightBox text={section.narrative || ""} />;
  if (t === "table") return <TableCard result={rows} />;
  if (t === "chart") return <ChartSection section={section} rows={rows} />;
  if (t === "kpi_grid") return <KpiGrid section={section} rows={rows} />;
  if (t === "kpi_cards") return <KpiCards section={section} rows={rows} />;
  return <TableCard result={rows} />; // 모르는 type → table 폴백(§6-2)
}

export function ReportPlanRenderer({ reportPlan, tableData, columnMetadata, summaryStats }) {
  const sections = reportPlan && Array.isArray(reportPlan.sections) ? reportPlan.sections : [];
  const ctx = { tableData: tableData || [], columnMetadata: columnMetadata || [], summaryStats };
  if (!sections.length) return <TableCard result={tableData || []} />;
  return (
    <div className="flex flex-col gap-2.5">
      {sections.map((s, i) => <Section key={i} section={s} ctx={ctx} />)}
    </div>
  );
}

export default ReportPlanRenderer;
