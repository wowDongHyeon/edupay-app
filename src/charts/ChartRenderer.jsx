import React from "react";
import { BarChartCard, DonutChartCard, CompareChartCard, BalanceListCard, ChannelChartCard, NudgeTrendChartCard, SchoolRankChartCard, BarListChartCard, ListChartCard } from "./cards";
import { MapChartCard } from "./MapChartCard";
import { TableCard } from "./TableCard";
/* ChartRenderer : 오페리아 데이터 메시지 렌더 진입점.
   chartType(레지스트리가 intent로 결정)으로 분기. 매핑 없으면 기본 TableCard(표).
   §9: SqlChip은 카드 밖(App.jsx Bubble의 아바타 아래)에서 렌더한다. 카드 자체엔 칩 없음.
   리포트(월/일 토글) 카드는 활성 탭의 sql/source/rawRows를 onActiveSql로 상위에 올려, 아바타 아래 칩이 현재 탭 SQL을 보이게 한다. */

const { useState, useEffect, useRef } = React;

// §9.5 출처(source)별 SQL 칩 라벨/색 + 팝오버 헤더 문구. 폴백(Claude 시도 실패→템플릿)을 주황으로 가시화.
//   claude→"</> AI SQL" / fallback→"⚠️ 템플릿(폴백)"(주황) / template→"</> 템플릿" / api→"</> SQL" / mock→"</> 목업"
const SOURCE_META = {
  claude:   { label: "AI SQL",        icon: "</>", header: "출처: Claude 생성 (NL2SQL)",      warn: false },
  fallback: { label: "템플릿(폴백)",   icon: "⚠️", header: "출처: 폴백 — Claude 시도 실패로 템플릿 사용", warn: true },
  template: { label: "템플릿",         icon: "</>", header: "출처: 고정 템플릿 (결정적)",        warn: false },
  api:      { label: "SQL",            icon: "</>", header: "출처: 오페리아 서버",              warn: false },
  mock:     { label: "목업",           icon: "</>", header: "출처: 정적 목업",                  warn: false },
};

const fmtCell = (v) =>
  v == null ? "" : typeof v === "object" ? JSON.stringify(v) : typeof v === "number" ? v.toLocaleString() : String(v);
const isRows = (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null;
const prettyJson = (v) => (Array.isArray(v) && !v.length ? "[] (빈 결과)" : JSON.stringify(v, null, 2));
const jsonPre = (text) => (
  <pre className="px-3 py-2.5 text-[11px] leading-relaxed text-violet-50 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto edupay-noscroll">{text}</pre>
);

// 행 리스트(객체 배열) → 작은 표(컬럼 자동 추출, 숫자 천단위 콤마)
function RowsTable({ rows }) {
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto edupay-noscroll">
      <table className="w-full text-[10.5px] text-violet-50 font-mono border-collapse">
        <thead>
          <tr className="text-violet-200/70">
            {cols.map((c) => <th key={c} className="text-left font-bold px-2 py-1 border-b border-white/15 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {cols.map((c) => <td key={c} className="px-2 py-1 whitespace-nowrap">{fmtCell(row[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// §9.6 rawRows 뷰 — 'SQL이 실제 낸 행' 그대로. 배열이면 표 하나, {key:[행]}이면 키별 작은 표.
function RawRowsView({ rawRows }) {
  if (Array.isArray(rawRows)) {
    return <div className="max-h-64 overflow-auto edupay-noscroll">{rawRows.length ? <RowsTable rows={rawRows} /> : jsonPre("[] (빈 결과)")}</div>;
  }
  if (rawRows && typeof rawRows === "object") {
    return (
      <div className="max-h-64 overflow-auto edupay-noscroll py-0.5">
        {Object.entries(rawRows).map(([k, rows]) => (
          <div key={k} className="px-2 py-1">
            <div className="text-[10px] font-bold text-violet-300/80 mb-0.5 font-mono">{k}</div>
            {isRows(rows) ? <RowsTable rows={rows} /> : jsonPre(prettyJson(rows))}
          </div>
        ))}
      </div>
    );
  }
  return jsonPre(prettyJson(rawRows));
}

// 가공 result 뷰(폴백·보조) — rows 배열이면 표, 그 외 pretty JSON.
function ResultView({ result }) {
  if (isRows(result)) return <div className="max-h-64 overflow-auto edupay-noscroll"><RowsTable rows={result} /></div>;
  return jsonPre(prettyJson(result));
}

// §9 SQL 칩 — 카드 밖(아바타 아래)에서 렌더. 클릭(탭) 토글로 바로 아래에 SQL 패널을 펼침/접음(인라인 — 스크롤 영역 가장자리에서 잘리지 않음). 바깥탭/ESC로 닫힘. sql 없으면 렌더 안 함.
// §9.6 패널 2단 탭: ① SQL ② 결과. 결과 탭은 rawRows(SQL이 실제 낸 행)를 표로, 가공 result는 접기 섹션으로 보조.
export function SqlChip({ sql, source, result, rawRows }) {
  const [pinned, setPinned] = useState(false);
  const [tab, setTab] = useState("sql"); // "sql" | "result"
  const ref = useRef(null);
  const panelRef = useRef(null);
  const open = pinned;

  useEffect(() => {
    if (!pinned) return;
    // 인라인 패널이 스크롤 영역 아래로 펼쳐져도 보이도록 화면 안으로 스크롤
    panelRef.current && panelRef.current.scrollIntoView({ block: "nearest" });
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
  const meta = SOURCE_META[source] || SOURCE_META.api; // source 없으면 기본 "SQL"
  // 폴백은 주황 톤으로 강조, 그 외는 보라 톤
  const btnClosed = meta.warn ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-600";
  const btnOpen = meta.warn ? "bg-amber-500 text-white" : "bg-violet-600 text-white";
  const hasRaw = rawRows !== undefined && rawRows !== null;
  const hasResult = (result !== undefined && result !== null) || hasRaw;
  const tabBtn = (key, label) =>
    <button onClick={() => setTab(key)}
      className={"px-2.5 py-1 text-[10.5px] font-bold rounded-md transition " +
        (tab === key ? "bg-white/15 text-white" : "text-white/55 hover:text-white/80")}>{label}</button>;
  return (
    <div ref={ref}>
      <button
        onClick={() => setPinned((p) => !p)}
        aria-label="생성된 SQL 보기"
        className={"inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 " +
          (open ? btnOpen : btnClosed)}>
        <span className="font-mono">{meta.icon}</span> {meta.label}
      </button>
      {open && (
        <div ref={panelRef} className="mt-1.5 w-[300px] max-w-full rounded-xl shadow-xl border border-black/10 overflow-hidden"
          style={{ background: "#1E1B2E" }}>
          <div className={"px-3 py-1.5 text-[10.5px] font-bold border-b border-white/10 flex items-center justify-between " +
            (meta.warn ? "text-amber-300" : "text-violet-200/80")}>
            <span>{meta.header}</span>
            <button onClick={() => setPinned(false)} className="text-white/50 hover:text-white text-[13px] leading-none">×</button>
          </div>
          {hasResult && (
            <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10 bg-black/20">
              {tabBtn("sql", "SQL")}
              {tabBtn("result", "결과")}
            </div>
          )}
          {tab === "result" && hasResult ? (
            <div>
              {/* SQL이 실제 낸 행(rawRows) 우선. 없으면(mock/실서버) 가공 result로 폴백 */}
              {hasRaw ? <RawRowsView rawRows={rawRows} /> : <ResultView result={result} />}
              {/* (선택) 가공 결과 = 차트가 실제 사용하는 입력. 접기 섹션으로 보조 표시 */}
              {hasRaw && result !== undefined && result !== null && (
                <details className="border-t border-white/10">
                  <summary className="px-3 py-1.5 text-[10px] text-violet-300/70 cursor-pointer select-none">가공 결과(차트 입력) 보기</summary>
                  {jsonPre(prettyJson(result))}
                </details>
              )}
            </div>
          ) : (
            <pre className="px-3 py-2.5 text-[11px] leading-relaxed text-violet-50 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto edupay-noscroll">{sql}</pre>
          )}
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
    case "balanceList": return <BalanceListCard result={result} />;
    case "channel": return <ChannelChartCard result={result} />;
    case "nudgeTrend": return <NudgeTrendChartCard result={result} />;
    case "schoolRank": return <SchoolRankChartCard result={result} />;
    case "barlist": return <BarListChartCard result={result} />;
    case "list": return <ListChartCard result={result} />;
    case "table":
    default:
      return <TableCard result={result} intent={intent} />;
  }
}

// report(bar) 전용 — 월별/일별 탭 토글 + 일별 lazy 로드·양쪽 캐시. 탭 전환은 UI 동작이라
// 새 말풍선/대화턴을 만들지 않고(onCardQuery는 setMessages 안 함), 카드 내부 데이터만 교체한다.
// 일별 질의의 '본 신호'는 NL 텍스트. 'reportDaily' hint는 시뮬 라우팅(템플릿/컬럼계약/폴백)용일 뿐이다.
const DAILY_TEXT = "최근 7일 사용 내역을 일별로 알려줘";
function ReportToggleCard({ initial, onCardQuery, onActiveSql }) {
  const [tab, setTab] = useState("month");
  const [cache, setCache] = useState({ month: initial, day: null }); // 월·일 양쪽 캐시
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadDaily = () => {
    if (loading || !onCardQuery) return;
    setError(false);
    setLoading(true);
    Promise.resolve(onCardQuery(DAILY_TEXT, "reportDaily"))
      .then((resp) => { setCache((c) => ({ ...c, day: resp })); setLoading(false); })
      .catch(() => { setLoading(false); setError(true); });
  };

  const onTab = (next) => {
    if (next === tab) return;
    setTab(next);
    if (next === "day" && !cache.day) loadDaily(); // 일별 최초 1회만 요청, 이후 캐시로 즉시 전환
  };

  const active = tab === "month" ? cache.month : cache.day;
  // 활성 탭의 SQL/source/rawRows를 상위(Bubble)로 올림 → 아바타 아래 칩이 '지금 보는 탭'의 SQL을 보여줌.
  // 일별 로딩 중(active 없음)엔 칩을 잠시 숨김(해당 탭 SQL이 아직 없음).
  useEffect(() => {
    if (!onActiveSql) return;
    onActiveSql(active
      ? { sql: active.sql, source: active.source, result: active.result, rawRows: active.rawRows }
      : { sql: null });
  }, [active, onActiveSql]);

  return (
    <BarChartCard
      result={active && active.result}
      tab={tab} onTab={onTab}
      loading={tab === "day" && loading}
      error={tab === "day" && error && !cache.day}
      onRetry={loadDaily}
    />
  );
}

// 카드만 렌더(칩은 Bubble이 아바타 아래에서 렌더). 리포트 카드는 onActiveSql로 현재 탭 SQL을 상위에 올린다.
export function ChartRenderer({ type, result, intent, question, sql, source, rawRows, onCardQuery, onActiveSql }) {
  if (type === "bar" && intent === "report") {
    return <ReportToggleCard initial={{ result, sql, source, rawRows }} onCardQuery={onCardQuery} onActiveSql={onActiveSql} />;
  }
  return pickCard(type, result, intent);
}

export default ChartRenderer;
