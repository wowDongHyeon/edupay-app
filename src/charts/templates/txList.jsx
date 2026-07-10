import React from "react";
import { num, ChartShell } from "../util";
import { ExpandableText } from "../ExpandableText";
/* 제네릭 txList 템플릿 — data {groups:[{key,label,amount,count,pct}], rows:[{group,item,amount,date}]} + config.
   상단 스택바 + 그룹 요약박스 + 거래 리스트(최근순, options.limit건). 그룹 색/이모지는 config.options.groupStyles[key]. */

const dayMD = (dt) => {
  const s = String(dt || ""); const mm = +s.slice(5, 7), dd = +s.slice(8, 10);
  return mm && dd ? `${mm}/${dd}` : "";
};

export function TxListTemplate({ data, config }) {
  const cfg = config || {};
  const gs = (cfg.options && cfg.options.groupStyles) || {};
  const limit = (cfg.options && cfg.options.limit) || 5;
  const groups = (data && Array.isArray(data.groups) ? data.groups : []);
  const rows = (data && Array.isArray(data.rows) ? data.rows : []);
  const total = groups.reduce((s, g) => s + (g.amount || 0), 0) || 1;
  const labelOf = Object.fromEntries(groups.map((g) => [g.key, g.label]));
  const w0 = groups[0] ? Math.round((groups[0].amount / total) * 100) : 0;
  const widths = groups.map((g, i) => (groups.length === 2 ? (i === 0 ? w0 : 100 - w0) : Math.round((g.amount / total) * 100)));
  // 거래 리스트 점진 노출(MapChartCard 패턴): 초기 limit(기본 5)개 → '더보기' +limit씩, 전체 노출 시 버튼 숨김.
  // 상단 스택바·그룹 요약 박스는 전체 기준 유지(거래 리스트만 페이징).
  const [visibleCount, setVisibleCount] = React.useState(limit);
  const shown = rows.slice(0, visibleCount);
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      {/* 가로 스택 바 */}
      <div className="mt-3 flex h-3.5 rounded-full overflow-hidden bg-gray-100">
        {groups.map((g, i) => (g.amount > 0 ? <div key={i} style={{ width: widths[i] + "%", background: (gs[g.key] || {}).color }}></div> : null))}
      </div>
      {/* 그룹 요약 박스 */}
      <div className="mt-3 flex gap-2.5">
        {groups.map((g, i) => {
          const c = gs[g.key] || {};
          return (
            <div key={i} className="flex-1 rounded-2xl px-3.5 py-3" style={{ background: c.soft }}>
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-bold" style={{ color: c.color }}>{g.label}</span>
                <span className="ml-auto text-[11px] font-bold" style={{ color: c.color }}>{g.pct}%</span>
              </div>
              <div className="mt-1.5 text-[16px] font-extrabold text-gray-900 tabular-nums">{num(g.amount)}<span className="text-[11px] font-bold text-gray-400">원</span></div>
              <div className="text-[11px] text-gray-400">{g.count}건</div>
            </div>
          );
        })}
      </div>
      {/* 거래 리스트(최근순) */}
      <div className="mt-3.5 flex flex-col gap-1">
        {shown.map((r, i) => {
          const c = gs[r.group] || {};
          return (
            <div key={i} className="flex items-center gap-2.5 py-1 border-b border-gray-50 last:border-0">
              <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: c.soft, color: c.color }}>{labelOf[r.group]}</span>
              <ExpandableText text={r.item} className="flex-1 min-w-0 text-[13px] text-gray-800" />
              <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{dayMD(r.date)}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0 w-[74px] text-right whitespace-nowrap">−{num(r.amount)}원</span>
            </div>
          );
        })}
        {rows.length > visibleCount && (
          <button onClick={() => setVisibleCount((c) => c + limit)}
            className="mt-1 w-full py-2 rounded-xl bg-gray-50 text-[12.5px] font-bold text-violet-600">더보기</button>
        )}
      </div>
    </ChartShell>
  );
}
export default TxListTemplate;
