import React from "react";
import { BarChartCard, DonutChartCard, CompareChartCard, GaugeChartCard, BarListChartCard, ListChartCard } from "./cards";
import { MapChartCard } from "./MapChartCard";
import { TableCard } from "./TableCard";
/* ChartRenderer : 오페리아 데이터 메시지 렌더 진입점.
   chartType(레지스트리가 intent로 결정)으로 분기. 매핑 없으면 기본 TableCard(표).
   §9: 응답 sql이 있으면 카드 우상단에 '</> SQL' 칩(hover/탭 팝오버)으로 생성 쿼리 노출. */

const { useState, useEffect, useRef } = React;

// §9 SQL 칩 — 데스크탑 hover + 모바일/WebView 탭 토글. 바깥탭/ESC로 닫힘. sql 없으면 렌더 안 함.
function SqlChip({ sql }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  const open = hover || pinned;

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e) => { if (e.key === "Escape") setPinned(false); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setPinned(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [pinned]);

  if (!sql) return null;
  return (
    <div ref={ref} className="absolute right-3 top-3 z-20"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        onClick={() => setPinned((p) => !p)}
        aria-label="생성된 SQL 보기"
        className={"flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 " +
          (open ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-600")}>
        <span className="font-mono">&lt;/&gt;</span> SQL
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-[290px] max-w-[78vw] rounded-xl shadow-xl border border-black/10 overflow-hidden"
          style={{ background: "#1E1B2E" }}>
          <div className="px-3 py-1.5 text-[10.5px] font-bold text-violet-200/80 border-b border-white/10 flex items-center justify-between">
            <span>생성된 SQL (오페리아 NL2SQL)</span>
            <button onClick={() => setPinned(false)} className="text-white/50 hover:text-white text-[13px] leading-none">×</button>
          </div>
          <pre className="px-3 py-2.5 text-[11px] leading-relaxed text-violet-50 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto edupay-noscroll">{sql}</pre>
        </div>
      )}
    </div>
  );
}

function pickCard(type, result, intent) {
  switch (type) {
    case "bar": return <BarChartCard result={result} />;
    case "donut": return <DonutChartCard result={result} />;
    case "compare": return <CompareChartCard result={result} intent={intent} />;
    case "map": return <MapChartCard result={result} />;
    case "gauge": return <GaugeChartCard result={result} />;
    case "barlist": return <BarListChartCard result={result} />;
    case "list": return <ListChartCard result={result} />;
    case "table":
    default:
      return <TableCard result={result} intent={intent} />;
  }
}

export function ChartRenderer({ type, result, intent, question, sql }) {
  return (
    <div className="relative">
      {pickCard(type, result, intent)}
      <SqlChip sql={sql} />
    </div>
  );
}

export default ChartRenderer;
