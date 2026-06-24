import React from "react";
import { num, ChartShell, InsightBox } from "../util";
/* 제네릭 trend 템플릿 — data {current:{count,value}, prev:{value}, delta, monthly:[{label,count,value}]} + config.
   이번값 vs 이전값 박스 2개 + 월별 추이(가로 바). 박스/헤더 라벨은 config.options.labels(기본=조르기). */

export function TrendTemplate({ data, config }) {
  const cfg = config || {};
  const L = (cfg.options && cfg.options.labels) || {};
  const cu = L.countUnit || "회";
  const cur = (data && data.current) || { count: 0, value: 0 };
  const prev = (data && data.prev) || null; // ★ 정직: 이전 달 없으면 null(0 지어내기 금지)
  const monthly = (data && Array.isArray(data.monthly) ? data.monthly : []);
  const delta = data && data.delta != null ? data.delta : null;
  const maxAmt = Math.max(1, ...monthly.map((m) => m.value || 0));
  // 박스 제목 접두: 최신월이 실제 '이번 달'이면 "이번 달", 아니면 그 달 라벨(예 "2월"). countBox/valueBox 는 폴백.
  const head = cur.isCurrentMonth ? "이번 달" : (cur.label || "");
  const countNoun = L.countNoun || "충전 요청";
  const valueNoun = L.valueNoun || "충전 금액";
  const countBox = head ? `${head} ${countNoun}` : (L.countBox || "이번 달 충전 요청");
  const valueBox = head ? `${head} ${valueNoun}` : (L.valueBox || "이번 달 충전 금액");
  const monthlyHeader = L.monthlyHeader || "월별 충전 요청";
  // 비교줄: 이전 달 행이 있을 때만(없으면 "이전 달 데이터 없음"). prev.label 기준으로 비교.
  const diffLabel = prev
    ? (delta > 0 ? `${prev.label}보다 +${delta}${cu}` : delta < 0 ? `${prev.label}보다 ${delta}${cu}` : `${prev.label}과 같음`)
    : "이전 달 데이터 없음";
  const valueCompare = prev ? `${prev.label} ${num(prev.value)}원` : "이전 달 데이터 없음";
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className="mt-3 flex gap-2.5">
        <div className="flex-1 rounded-2xl px-3.5 py-3 bg-violet-50">
          <div className="text-[12px] font-bold text-violet-600">{countBox}</div>
          <div className="mt-1 text-[18px] font-extrabold text-gray-900 tabular-nums">{cur.count}<span className="text-[12px] font-bold text-gray-400">{cu}</span></div>
          <div className="text-[11px] text-gray-400">{diffLabel}</div>
        </div>
        <div className="flex-1 rounded-2xl px-3.5 py-3 bg-emerald-50">
          <div className="text-[12px] font-bold text-emerald-700">{valueBox}</div>
          <div className="mt-1 text-[18px] font-extrabold text-gray-900 tabular-nums">{num(cur.value)}<span className="text-[12px] font-bold text-gray-400">원</span></div>
          <div className="text-[11px] text-gray-400">{valueCompare}</div>
        </div>
      </div>
      <div className="mt-3.5">
        <div className="text-[12px] text-gray-400 mb-2">{monthlyHeader}</div>
        <div className="flex flex-col gap-2">
          {monthly.map((m, i) => {
            const last = i === monthly.length - 1;
            return (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-[40px] shrink-0 text-[12px] text-gray-500">{m.label}</span>
                <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.max((m.value || 0) / maxAmt * 100, 6) + "%", background: last ? "#5B4DD6" : "#C2BAEC" }}></div>
                </div>
                <span className="text-[11px] text-gray-400 tabular-nums shrink-0 w-[34px] text-right">{m.count}{cu}</span>
                <span className="text-[12.5px] font-bold text-gray-800 tabular-nums shrink-0 w-[64px] text-right whitespace-nowrap">{num(m.value)}원</span>
              </div>
            );
          })}
        </div>
      </div>
      <InsightBox className="mt-3.5" text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default TrendTemplate;
