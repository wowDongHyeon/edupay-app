import React from "react";
import { num, ChartShell } from "../util";
/* 제네릭 list 템플릿 — data {rows:[{date,merchant,amount}], total, count} + config.
   합계+건수 헤더 + 거래 리스트. 아이콘/접미/빈문구/건수접미는 config.options. */
export function ListTemplate({ data, config }) {
  const cfg = config || {};
  const opt = cfg.options || {};
  const icon = opt.icon || "💳";
  const suffix = opt.itemSuffix || "";
  const rows = (data && Array.isArray(data.rows) ? data.rows : []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = data && data.total != null ? data.total : rows.reduce((s, r) => s + (r.amount || 0), 0);
  const count = data && data.count != null ? data.count : rows.length;
  const fmt = (iso) => { const [, m, d] = String(iso).split("-").map(Number); return `${m}월 ${d}일`; };
  // 내역 리스트 점진 노출(MapChartCard 패턴): 초기 limit(기본 5)개 → '더보기' +limit씩, 전체 노출 시 버튼 숨김.
  const limit = opt.limit || 5;
  const [visibleCount, setVisibleCount] = React.useState(limit);
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className="mt-3 text-[26px] font-extrabold text-gray-900">{num(total)}원</div>
      <div className="text-[12px] text-gray-400 mb-3">총 {count}건{opt.countSuffix ? " · " + opt.countSuffix : ""}</div>
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-[13px] text-gray-400">{opt.emptyText || "내역이 없어요 👍"}</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.slice(0, visibleCount).map((e, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-gray-800 truncate">{e.merchant}</div>
                <div className="text-[11px] text-gray-400">{fmt(e.date)}{suffix ? " · " + suffix : ""}</div>
              </div>
              <span className="text-[13.5px] font-bold text-gray-900 tabular-nums shrink-0">-{num(e.amount)}원</span>
            </div>
          ))}
          {rows.length > visibleCount && (
            <button onClick={() => setVisibleCount((c) => c + limit)}
              className="mt-1 w-full py-2 rounded-xl bg-gray-50 text-[12.5px] font-bold text-violet-600">더보기</button>
          )}
        </div>
      )}
    </ChartShell>
  );
}
export default ListTemplate;
