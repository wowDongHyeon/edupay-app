import React from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList, Cell } from "recharts";
import { num, won, ChartShell, DONUT_COLORS, InsightBox } from "../util";
/* 제네릭 bar 템플릿 — data {series:[{label,value}], breakdown?:[{label,value,pct,key}]} + config.
   report(월/일 토글)는 ChartRenderer의 orchestrator가 탭별 config/데이터를 주입(toggle/loading/error 포함). */

const MEANS_COLOR = { VOUCHER: "#188F8A", APPCARD: "#5C6B82" };

export function BarTemplate({ data, config, tab, onTab, loading, error, onRetry }) {
  const cfg = config || {};
  const series = (data && data.series) || [];
  const chart = series.map((s) => ({ label: s.label, amount: s.value }));
  const breakdown = (data && data.breakdown) || [];
  const total = breakdown.reduce((s, m) => s + (m.value || 0), 0) || 1;
  const toggle = cfg.options && cfg.options.toggle;
  const Toggle = onTab && toggle && (
    <div className="mt-3 inline-flex gap-0.5 bg-gray-100 rounded-full p-0.5 text-[12px] font-bold">
      {[["month", "월별"], ["day", "일별"]].map(([k, label]) => (
        <button key={k} onClick={() => onTab(k)}
          className={"px-3.5 py-1 rounded-full transition " + (tab === k ? "bg-white text-violet-600 shadow-sm" : "text-gray-400")}>
          {label}
        </button>
      ))}
    </div>
  );
  const insight = cfg.insight ? cfg.insight(data || {}) : "";
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      {Toggle}
      {loading ? (
        <div className="h-[150px] flex flex-col items-center justify-center gap-2.5 text-[13px] text-gray-400">
          <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin"></div>
          {(cfg.options && cfg.options.loadingText) || "일별 내역 불러오는 중…"}
        </div>
      ) : error ? (
        <div className="h-[150px] flex flex-col items-center justify-center gap-2.5 text-[13px] text-gray-500">
          <div>{(cfg.options && cfg.options.errorText) || "일별 내역을 불러오지 못했어요."}</div>
          <button onClick={onRetry} className="px-3.5 py-1.5 rounded-full bg-violet-100 text-violet-700 font-bold text-[12px] active:scale-95 transition">{(cfg.options && cfg.options.retryText) || "다시 시도"}</button>
        </div>
      ) : (
      <>
      <div style={{ width: "100%", height: 150 }} className="mt-2">
        <ResponsiveContainer>
          <BarChart data={chart} margin={{ top: 16, right: 4, left: 4, bottom: 0 }} barCategoryGap="38%">
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} interval={0} />
            <Tooltip cursor={{ fill: "rgba(59,130,246,0.06)" }} formatter={(v) => [won(v), "사용"]}
              contentStyle={{ borderRadius: 12, border: "1px solid #E0E2FA", fontSize: 12 }} />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={28} isAnimationActive={false}>
              <LabelList dataKey="amount" position="top"
                formatter={(v) => (v ? (v >= 10000 ? (Number.isInteger(v / 10000) ? v / 10000 : (v / 10000).toFixed(1)) + "만" : num(v)) : "")}
                style={{ fontSize: 10, fontWeight: 700, fill: "#6B7280" }} />
              {chart.map((e, i) => <Cell key={i} fill={i === chart.length - 1 ? "#5B4DD6" : "#D7D2F2"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {breakdown.length > 0 && (
        <div className="mt-3">
          <div className="text-[12px] text-gray-400 mb-2">{(cfg.options && cfg.options.breakdownHeader) || "결제수단별 · 합계"}</div>
          <div className="flex h-3.5 rounded-full overflow-hidden mb-2.5">
            {breakdown.map((m, i) => (
              <div key={i} style={{ width: (m.value / total * 100) + "%", background: MEANS_COLOR[m.key] || DONUT_COLORS[i % DONUT_COLORS.length] }}></div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {breakdown.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MEANS_COLOR[m.key] || DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                <span className="text-[12.5px] text-gray-600 flex-1">{m.label}</span>
                <span className="text-[11px] text-gray-400 tabular-nums">{m.pct != null ? m.pct + "%" : Math.round(m.value / total * 100) + "%"}</span>
                <span className="text-[12.5px] font-bold text-gray-900 tabular-nums w-[64px] text-right">{won(m.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <InsightBox text={insight} />
      </>
      )}
    </ChartShell>
  );
}
export default BarTemplate;
