import React from "react";
import { num, ChartShell } from "../util";
/* 제네릭 statList 템플릿 — data {items:[{label,sub,value,unit?}]} + config.
   항목 스타일(아이콘/배경/글자색)은 config.options.itemStyles[i], 하단 안내문은 config.insight(). 합계 없음. */

export function StatListTemplate({ data, config }) {
  const cfg = config || {};
  const opt = cfg.options || {};
  const items = (data && Array.isArray(data.items) ? data.items : []);
  const styles = opt.itemStyles || [];
  const noteStyle = opt.noteStyle || { background: "#F6F6FB", color: "#6B6E78" };
  const note = cfg.insight ? cfg.insight(data || {}) : "";
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className="mt-3 flex flex-col gap-2.5">
        {items.map((it, i) => {
          const st = styles[i] || {};
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
