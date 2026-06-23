import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { num, ChartShell, DONUT_COLORS, InsightBox } from "../util";
/* generic pie 템플릿 (reportPlan chart viz:"pie") — data {slices:[{label,value,pct?}]} + config.
   donut 과 달리 꽉 찬 원(innerRadius 0) + 우측 범례. */

export function PieTemplate({ data, config }) {
  const cfg = config || {};
  const slices = (data && data.slices) || [];
  const total = slices.reduce((s, r) => s + (r.value || 0), 0) || 1;
  const view = slices.map((r, i) => ({ name: r.label, value: r.value, pct: r.pct != null ? r.pct : Math.round((r.value / total) * 100), color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className="mt-4 flex items-center gap-3">
        <div style={{ width: 120, height: 120 }} className="shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={view} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} paddingAngle={1.5} stroke="none" isAnimationActive={false}>
                {view.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {view.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }}></span>
              <span className="text-[12px] text-gray-600 flex-1 truncate">{e.name}</span>
              <span className="text-[11px] text-gray-400 tabular-nums">{e.pct}%</span>
              <span className="text-[12px] font-semibold text-gray-900 tabular-nums w-[56px] text-right">{num(e.value)}원</span>
            </div>
          ))}
        </div>
      </div>
      <InsightBox className="mt-4" text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default PieTemplate;
