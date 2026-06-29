import React from "react";
/* 차트 공통 유틸 + 카드 셸 — 오페리아 result를 입력으로 받는 type 기반 차트들이 공유 */

export const num = (n) =>
  n == null || isNaN(Number(n)) ? "" : Number(n).toLocaleString("ko-KR");
export const won = (n) => num(n) + "원";

// "2026-04" → "4월"
export const monthLabel = (ym) => {
  const mm = +String(ym || "").slice(5, 7);
  return mm ? mm + "월" : String(ym || "");
};

// "2026-06-13" → "6/13"
export const dayLabel = (ymd) => {
  const s = String(ymd || "");
  const mm = +s.slice(5, 7), dd = +s.slice(8, 10);
  return mm && dd ? `${mm}/${dd}` : s;
};

export function ChartShell({ title, sub, badge, children }) {
  return (
    <div className="rounded-[22px] bg-white border border-violet-200 shadow-md px-5 py-5 edupay-fade">
      <div className="flex items-start justify-between gap-3">
        <div>
          {badge && (
            <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full bg-violet-50 text-[11.5px] font-bold text-violet-600">{badge}</span>
          )}
          <div className="text-[17px] font-extrabold text-gray-900 tracking-[-0.01em]">{title}</div>
          {sub && <div className="text-[12.5px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

// 💡 인사이트 박스(보라). 카드별 상단 여백이 달라 className로 mt 조정(기본 mt-3). text 없으면 렌더 안 함.
export function InsightBox({ text, className }) {
  if (!text) return null;
  return (
    <div className={(className || "mt-3") + " rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed"}>💡 {text}</div>
  );
}

export const DONUT_COLORS = ["#5B4DD6", "#7C5CD6", "#9A8FE6", "#C2BAEC", "#D7D2F2", "#E5E0F7"];
export const CAT_EMOJI = { 편의점: "🏪", 식비: "🍱", 학용품: "📚", 교통: "🚌", 문화: "🎮", 매점: "🍫" };
