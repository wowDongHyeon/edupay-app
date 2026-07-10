import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ExpandableText } from "../ExpandableText";
import { num, ChartShell, DONUT_COLORS, InsightBox } from "../util";
/* 제네릭 donut 템플릿 — data {slices:[{label,value,pct,cnt?}], total} + config. */

export function DonutTemplate({ data, config }) {
  const cfg = config || {};
  const slices = (data && data.slices) || [];
  const total = data && data.total != null ? data.total : slices.reduce((s, r) => s + (r.value || 0), 0) || 1;
  const view = slices.map((r, i) => ({ name: r.label, value: r.value, cnt: r.cnt, pct: r.pct, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className="mt-4 flex items-center gap-3">
        <div className="relative" style={{ width: 130, height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={view} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {view.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400">총 사용</span>
            <span className="text-[15px] font-extrabold text-gray-900">{num(total)}원</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {view.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }}></span>
              <ExpandableText text={e.name} className="text-[12px] text-gray-600 flex-1" />
              {e.cnt != null && <span className="text-[11px] text-gray-400 tabular-nums">{e.cnt}건</span>}
              <span className="text-[12px] font-semibold text-gray-900 tabular-nums w-[52px] text-right">{num(e.value)}원</span>
            </div>
          ))}
        </div>
      </div>
      <InsightBox className="mt-4" text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default DonutTemplate;
