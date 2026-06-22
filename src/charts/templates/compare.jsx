import React from "react";
import { num, ChartShell, InsightBox } from "../util";
/* 제네릭 compare 템플릿 — data {bars:[{label,value,me?,avg?,amt?}], ...insightFields} + config.
   나 vs 평균/또래 가로 막대 비교. unit은 config.options.unit(기본 "원"). */

export function CompareTemplate({ data, config }) {
  const cfg = config || {};
  const unit = (cfg.options && cfg.options.unit != null) ? cfg.options.unit : "원";
  const bars = (data && Array.isArray(data.bars) ? data.bars : []);
  const max = Math.max(1, ...bars.map((b) => b.value || 0));
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className="mt-4 flex flex-col gap-3">
        {bars.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-[92px] shrink-0">
              <div className={"text-[12.5px] leading-tight truncate " + (b.me ? "font-extrabold text-violet-600" : "text-gray-600")}>{b.label}</div>
            </div>
            <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: Math.max((b.value || 0) / max * 100, 5) + "%", background: b.me ? "#5B4DD6" : "#D7D2F2" }}></div>
            </div>
            <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-[60px] text-right whitespace-nowrap">{num(b.value)}{unit}</span>
          </div>
        ))}
      </div>
      <InsightBox className="mt-4" text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default CompareTemplate;
