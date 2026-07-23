import React from "react";
import { num, won, ChartShell } from "../util";
/* 제네릭 statList 템플릿 — data {items:[{label,sub,value,unit?}]} + config.
   항목 스타일(아이콘/배경/글자색)은 config.options.itemStyles[i], 하단 안내문은 config.insight(). 합계 없음. */

export function StatListTemplate({ data, config }) {
  // ponytail: 카드 발급여부 항목(cardStatus)은 최대 1개뿐이라 단일 로컬 토글 상태로 충분(다건이면 인덱스맵 필요).
  const [cardExpanded, setCardExpanded] = React.useState(false);
  const cfg = config || {};
  const opt = cfg.options || {};
  const items = (data && Array.isArray(data.items) ? data.items : []);
  const styles = opt.itemStyles || [];
  const noteStyle = opt.noteStyle || { background: "#F6F6FB", color: "#6B6E78" };
  const note = cfg.insight ? cfg.insight(data || {}) : "";
  // ★ 단일 KPI(operia 잔액 총액 등: kpi=true + 항목 1개) → 3항목 리스트 대신 큰 단일 값 강조. 기존 3항목 렌더는 아래 유지.
  if (data && data.kpi && items.length === 1) {
    const it = items[0];
    const st = (opt.itemStyles && opt.itemStyles[0]) || {};
    return (
      <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
        <div className="mt-4 flex flex-col items-center justify-center py-4">
          <div className="text-[13px] text-gray-500 mb-1">{it.label}</div>
          <div className="text-[34px] font-extrabold tracking-[-0.03em] tabular-nums" style={{ color: st.ink || "#0F5A57" }}>
            {num(it.value)}<span className="text-[18px] font-bold ml-0.5">{it.unit}</span>
          </div>
        </div>
        {note && (<div className="mt-2 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed" style={noteStyle}>💡 {note}</div>)}
      </ChartShell>
    );
  }
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className="mt-3 flex flex-col gap-2.5">
        {items.map((it, i) => {
          const st = styles[i] || {};
          if (it.type === "cardStatus") {
            const clickable = !!it.has;
            return (
              <div key={i}>
                <div
                  role={clickable ? "button" : undefined}
                  className={"flex items-center gap-3 rounded-2xl px-3.5 py-3" + (clickable ? " cursor-pointer" : "")}
                  style={{ background: clickable ? st.tint : "#F1F1F4" }}
                  onClick={clickable ? () => setCardExpanded((v) => !v) : undefined}
                >
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[17px] shrink-0">{st.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold" style={{ color: clickable ? st.ink : "#9AA0AC" }}>카드</div>
                    <div className="text-[11px]" style={{ color: clickable ? st.ink : "#9AA0AC", opacity: 0.7 }}>실물 카드 발급 여부</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {clickable && (<span className="text-[11px]" style={{ color: st.ink, opacity: 0.7 }}>눌러서 한도 보기 ›</span>)}
                    {/* ponytail: raw "O/X" → 사람 말. 제품 질문: '쓸 수 있는 금액' 카드에서 이 발급여부 항목을 아예 뺄지는 제품 판단(현재는 라벨만 정리). */}
                    <span
                      className="text-[11px] font-extrabold px-2.5 h-6 rounded-full flex items-center justify-center whitespace-nowrap"
                      style={{ background: clickable ? "#fff" : "#E4E5EA", color: clickable ? st.ink : "#9AA0AC" }}
                    >
                      {it.has ? "발급 완료" : "미발급"}
                    </span>
                  </div>
                </div>
                {clickable && cardExpanded && (
                  <div className="mt-1.5 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: st.tint, color: st.ink }}>
                    1일 한도 {won(it.limit)}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={i} className="flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: st.tint }}>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[17px] shrink-0">{st.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold" style={{ color: st.ink }}>{it.label}</div>
                <div className="text-[11px]" style={{ color: st.ink, opacity: 0.7 }}>{it.sub}</div>
              </div>
              <div className="text-[17px] font-extrabold tracking-[-0.02em] tabular-nums shrink-0" style={{ color: st.ink }}>{num(it.value)}<span className="text-[12px] font-bold">{it.unit}</span></div>
            </div>
          );
        })}
      </div>
      {note && (
        <div className="mt-3 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed" style={noteStyle}>💡 {note}</div>
      )}
    </ChartShell>
  );
}
export default StatListTemplate;
