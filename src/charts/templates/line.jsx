import React from "react";
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { num, won, ChartShell, InsightBox } from "../util";
/* generic line 템플릿 (reportPlan chart viz:"line") — data {series:[{label,value}]} + config. */

export function LineTemplate({ data, config }) {
  const cfg = config || {};
  const chart = ((data && data.series) || []).map((s) => ({ label: s.label, value: s.value }));
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div style={{ width: "100%", height: 160 }} className="mt-2">
        <ResponsiveContainer>
          <LineChart data={chart} margin={{ top: 18, right: 16, left: 12, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} interval={0} />
            <Tooltip formatter={(v) => [won(v), "값"]} contentStyle={{ borderRadius: 12, border: "1px solid #E0E2FA", fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke="#5B4DD6" strokeWidth={2.6} dot={{ r: 3.5, fill: "#5B4DD6", strokeWidth: 0 }} isAnimationActive={false}>
              <LabelList dataKey="value" position="top" formatter={(v) => (v ? num(v) : "")} style={{ fontSize: 10, fontWeight: 700, fill: "#6B7280" }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <InsightBox text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default LineTemplate;
