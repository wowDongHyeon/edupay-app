import React from "react";
import { num, ChartShell, InsightBox } from "../util";
/* generic kpi_cards 템플릿 (reportPlan type:"kpi_cards") — data {items:[{label,value,unit?,sub?}]} + config.
   statList 변형(2열 그리드 KPI 카드). 항목 0개면 빈 렌더 방지(상위에서 table 폴백). */

const TINTS = ["#EDE9FB", "#E2F3F1", "#FAEAF1", "#FFF4E0"];
const INKS = ["#5B4DD6", "#0F5A57", "#8E2F52", "#8A5A12"];

export function KpiCardsTemplate({ data, config }) {
  const cfg = config || {};
  const items = (data && Array.isArray(data.items) ? data.items : []);
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className={"mt-3 grid gap-2.5 " + (items.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl px-3.5 py-3" style={{ background: TINTS[i % TINTS.length] }}>
            <div className="text-[12px] font-bold" style={{ color: INKS[i % INKS.length], opacity: 0.85 }}>{it.label}</div>
            <div className="mt-1 text-[18px] font-extrabold tracking-[-0.02em] tabular-nums" style={{ color: INKS[i % INKS.length] }}>
              {num(it.value)}<span className="text-[12px] font-bold">{it.unit || ""}</span>
            </div>
            {it.sub && <div className="text-[10.5px] mt-0.5" style={{ color: INKS[i % INKS.length], opacity: 0.6 }}>{it.sub}</div>}
          </div>
        ))}
      </div>
      <InsightBox text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default KpiCardsTemplate;
