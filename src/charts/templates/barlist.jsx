import React from "react";
import { numCompact, ChartShell, InsightBox } from "../util";
/* 제네릭 barlist 템플릿 (N:1) — data {items:[{label,value,pct?,rank?,me?}], avgRow?:{label,value}} + config.
   options:
     rank      : 순위번호 표시
     rankAccent: 1위 골드 + me 보라(랭킹 카드). 미설정이면 순위 회색(가맹점 리스트)
     me        : 우리(me) 행 강조(보라 배경 + 🦊 + 보라 텍스트 + 보라 바)
     avgRow    : data.avgRow를 점선 구분 행으로 추가(충북 평균)
     showPct   : 비율(%) 열 표시
     unit      : 값 단위("원" 또는 "") */

export function BarListTemplate({ data, config }) {
  const cfg = config || {};
  const opt = cfg.options || {};
  const items = (data && Array.isArray(data.items) ? data.items : []).slice();
  const avgRow = opt.avgRow ? (data && data.avgRow) : null;
  const maxV = Math.max(1, ...items.map((r) => r.value || 0), avgRow ? avgRow.value || 0 : 0);
  const ranked = !!(opt.me || opt.rankAccent); // 랭킹(학교) 변형 vs 가맹점 변형
  // 순위/내역 리스트 점진 노출(MapChartCard 패턴): 초기 limit(기본 5)개 → '더보기' +limit씩, 전체 노출 시 버튼 숨김.
  // (schoolCompare 는 shaper 가 TOP5 로 잘라 5개뿐 → 버튼 미노출, 회귀 0)
  const limit = opt.limit || 5;
  const [visibleCount, setVisibleCount] = React.useState(limit);
  const shownItems = items.slice(0, visibleCount);
  // 모바일: hover 툴팁·long-press 불가 → 라벨 탭으로 그 행만 truncate 해제(전체 이름). 재탭 접힘. index 기준.
  const [expanded, setExpanded] = React.useState(() => new Set());
  const toggle = (i) => setExpanded((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const Bar = ({ frac, color }) => (
    <div className={"flex-1 rounded-full bg-gray-100 overflow-hidden " + (ranked ? "h-3" : "h-2.5")}>
      <div className="h-full rounded-full" style={{ width: Math.max(frac * 100, ranked ? 5 : 6) + "%", background: color }}></div>
    </div>
  );

  // 정직성 가드레일: 렌더 대상이 1개뿐이면 막대·%·순위 대신 값 하나를 크게(단일-KPI). 100% 착시 방지.
  //   avgRow(충북 평균 비교) 있는 랭킹 카드는 비교 의미가 있어 제외 → schoolCompare 등 회귀 0.
  if (items.length === 1 && !avgRow) {
    const it = items[0];
    return (
      <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
        <div className="mt-4 flex flex-col items-center justify-center py-4">
          <div className="text-[13px] text-gray-500 mb-1">{it.label}</div>
          <div className="text-[34px] font-extrabold tracking-[-0.03em] tabular-nums text-violet-700">
            {numCompact(it.value)}<span className="text-[18px] font-bold ml-0.5">{opt.unit || ""}</span>
          </div>
        </div>
        <InsightBox className="mt-4" text={cfg.insight ? cfg.insight(data || {}) : ""} />
      </ChartShell>
    );
  }

  return (
    <ChartShell badge={cfg.badge} title={cfg.title} sub={cfg.subtitle}>
      <div className={"flex flex-col " + (ranked ? "mt-3 gap-1.5" : "mt-4 gap-2.5")}>
        {shownItems.map((m, i) => {
          const rk = m.rank != null ? m.rank : i + 1;
          const me = opt.me && m.me;
          const barColor = me ? "#5B4DD6" : (opt.rankAccent && rk === 1) ? "#F5B83D" : ranked ? "#D7D2F2" : "#5B4DD6";
          const rankColor = !opt.rankAccent ? "text-gray-400" : me ? "text-violet-600" : rk === 1 ? "text-amber-500" : "text-gray-400";
          return (
            <div key={i} className={ranked ? ("flex items-center gap-2 rounded-xl px-2 py-1.5 " + (me ? "bg-violet-50" : "")) : "flex items-center gap-2.5"}>
              {opt.rank && <span className={"w-5 shrink-0 text-center font-extrabold " + (ranked ? "text-[13px] " : "text-[12px] ") + rankColor}>{rk}</span>}
              <div role="button" title={m.label} onClick={() => toggle(i)}
                className={"cursor-pointer " + (expanded.has(i)
                  ? (ranked ? "flex-1 flex items-center gap-1 min-w-0" : "flex-1 min-w-0")
                  : (ranked ? "w-[72px] flex items-center gap-1 min-w-0" : "w-[72px] shrink-0 min-w-0 overflow-hidden"))}>
                {me && <span className="shrink-0">🦊</span>}
                <span className={"text-[12.5px] " + (expanded.has(i) ? "block break-words " : "truncate " + (ranked ? "flex-1 min-w-0 " : "block w-full ")) + (me ? "font-extrabold text-violet-700" : "text-gray-700")}>{m.label}</span>
              </div>
              <Bar frac={(m.value || 0) / maxV} color={barColor} />
              {opt.showPct && <span className="text-[11px] text-gray-400 w-8 text-right tabular-nums">{m.pct != null ? m.pct + "%" : Math.round((m.value || 0) / maxV * 100) + "%"}</span>}
              {/* 금액: 고정폭 대신 min-w(작은값 정렬 유지·회귀 0) + shrink-0 → 넓은 폰트에서도 안 잘리고 grow(Bar가 flex-1로 흡수). */}
              <span className={"font-bold text-gray-800 tabular-nums text-right shrink-0 whitespace-nowrap pr-0.5 " + (ranked ? "text-[12px] min-w-[68px]" : "text-[12.5px] min-w-[62px]")}>{numCompact(m.value)}{opt.unit || ""}</span>
            </div>
          );
        })}
        {items.length > visibleCount && (
          <button onClick={() => setVisibleCount((c) => c + limit)}
            className="mt-1 w-full py-2 rounded-xl bg-gray-50 text-[12.5px] font-bold text-violet-600">더보기</button>
        )}
      </div>
      {avgRow && (
        <div className="mt-2 pt-2.5 border-t border-dashed border-gray-200 flex items-center gap-2 px-2">
          <span className="w-5 shrink-0"></span>
          <div className="w-[92px] shrink-0 text-[12.5px] text-gray-500">{avgRow.label}</div>
          <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: Math.max((avgRow.value || 0) / maxV * 100, 5) + "%", background: "#A99DF6" }}></div>
          </div>
          <span className="text-[12px] font-bold text-gray-500 tabular-nums shrink-0 min-w-[58px] pr-0.5 text-right whitespace-nowrap">{numCompact(avgRow.value)}{opt.unit || ""}</span>
        </div>
      )}
      <InsightBox className={ranked ? "mt-3" : "mt-4"} text={cfg.insight ? cfg.insight(data || {}) : ""} />
    </ChartShell>
  );
}
export default BarListTemplate;
