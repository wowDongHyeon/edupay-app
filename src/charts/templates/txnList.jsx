import React from "react";
import { num, ChartShell } from "../util";
import { ExpandableText } from "../ExpandableText";
/* 제네릭 txnList 템플릿 — 건별 거래 리스트. data {rows:[{merchant,item,amount,time}], total, count} + config.
   가맹점 · 상품 · 금액 · 시간(HH:MM), 시간순. 하단 푸터(총 N건 · 합계). options.limit 로 '더보기' 점진 노출.
   사용처(merchantBreakdown) 카드 톤(깔끔 리스트, %랭킹바 없음). */
export function TxnListTemplate({ data, config }) {
  const cfg = config || {};
  const opt = cfg.options || {};
  const limit = opt.limit || 6;
  const rows = data && Array.isArray(data.rows) ? data.rows : [];
  const total = data && data.total != null ? data.total : rows.reduce((s, r) => s + (r.amount || 0), 0);
  const count = data && data.count != null ? data.count : rows.length;
  const [visibleCount, setVisibleCount] = React.useState(limit);
  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      {rows.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-6 text-center text-[13px] text-gray-400">{opt.emptyText || "내역이 없어요 👍"}</div>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-2.5">
            {rows.slice(0, visibleCount).map((e, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">🧾</span>
                <div className="flex-1 min-w-0">
                  <ExpandableText as="div" text={e.merchant} className="text-[13.5px] font-medium text-gray-800" />
                  {e.item ? <ExpandableText as="div" text={e.item} className="text-[11px] text-gray-400" /> : null}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13.5px] font-bold text-gray-900 tabular-nums whitespace-nowrap">{num(e.amount)}원</div>
                  {e.time ? <div className="text-[11px] text-gray-400 tabular-nums">{e.time}</div> : null}
                </div>
              </div>
            ))}
            {rows.length > visibleCount && (
              <button onClick={() => setVisibleCount((c) => c + limit)}
                className="mt-1 w-full py-2 rounded-xl bg-gray-50 text-[12.5px] font-bold text-violet-600">더보기</button>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12px] text-gray-400">총 {count}건</span>
            <span className="text-[15px] font-extrabold text-gray-900 tabular-nums">{num(total)}원</span>
          </div>
        </>
      )}
    </ChartShell>
  );
}
export default TxnListTemplate;
