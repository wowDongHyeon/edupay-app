import React from "react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { won, ChartShell, InsightBox } from "../util";
/* generic area 템플릿 (reportPlan chart viz:"area") — data {series:[{label,value}]} + config. */

export function AreaTemplate({ data, config }) {
  const cfg = config || {};
  const chart = ((data && data.series) || []).map((s) => ({ label: s.label, value: s.value }));
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div style={{ width: "100%", height: 160 }} className="mt-2">
        <ResponsiveContainer>
          <AreaChart data={chart} margin={{ top: 18, right: 16, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="rpAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B4DD6" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#5B4DD6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} interval={0} />
            <Tooltip formatter={(v) => [won(v), "값"]} contentStyle={{ borderRadius: 12, border: "1px solid #E0E2FA", fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="#5B4DD6" strokeWidth={2.4} fill="url(#rpAreaFill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <InsightBox text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default AreaTemplate;
