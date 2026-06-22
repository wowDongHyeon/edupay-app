import React from "react";
import TEMPLATES from "./templates";
import { INTENT_CONFIG } from "./intentConfig";
/* ChartRenderer : 오페리아 데이터 메시지 렌더 진입점 (TEMPLATE_설계.md §1·§5).
   INTENT_CONFIG[intent] 조회 → template 선택 → <Template data={result} config={cfg}/>. 없으면 table.
   §9: SqlChip은 카드 밖(App.jsx Bubble의 아바타 아래)에서 렌더. 카드 자체엔 칩 없음.
   report(월/일 토글) 카드만 orchestrator(ReportToggleCard)가 lazy 일별 로드 + 활성 탭 SQL을 onActiveSql로 상위에 올림. */

const { useState, useEffect, useRef } = React;

// §9.5 출처(source)별 SQL 칩 라벨/색 + 팝오버 헤더 문구.
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

// §9.6 rawRows 뷰 — 'SQL이 실제 낸 행' 그대로.
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

function ResultView({ result }) {
  if (isRows(result)) return <div className="max-h-64 overflow-auto edupay-noscroll"><RowsTable rows={result} /></div>;
  return jsonPre(prettyJson(result));
}

// §9 SQL 칩 — 카드 밖(아바타 아래)에서 렌더. 클릭 토글로 바로 아래 인라인 펼침. 바깥탭/ESC 닫힘. sql 없으면 렌더 안 함.
export function SqlChip({ sql, source, result, rawRows }) {
  const [pinned, setPinned] = useState(false);
  const [tab, setTab] = useState("sql");
  const ref = useRef(null);
  const panelRef = useRef(null);
  const open = pinned;

  useEffect(() => {
    if (!pinned) return;
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
  const meta = SOURCE_META[source] || SOURCE_META.api;
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
              {hasRaw ? <RawRowsView rawRows={rawRows} /> : <ResultView result={result} />}
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

// report 탭별 표현 config 합성(같은 bar 템플릿 사용)
const DAILY_TEXT = "최근 7일 사용 내역을 일별로 알려줘";
function reportTabConfig(tab) {
  const base = INTENT_CONFIG.report || {};
  const t = (base.tabs && base.tabs[tab]) || {};
  return { template: "bar", title: t.title, subtitle: t.subtitle, badge: t.badge, insight: t.insight, options: base.options };
}

// report(bar) orchestrator — 월/일 토글 + 일별 lazy 로드·양쪽 캐시 + 활성 탭 SQL 상위 전달.
function ReportToggleCard({ initial, onCardQuery, onActiveSql }) {
  const [tab, setTab] = useState("month");
  const [cache, setCache] = useState({ month: initial, day: null });
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
    if (next === "day" && !cache.day) loadDaily();
  };
  const active = tab === "month" ? cache.month : cache.day;
  useEffect(() => {
    if (!onActiveSql) return;
    onActiveSql(active
      ? { sql: active.sql, source: active.source, result: active.result, rawRows: active.rawRows }
      : { sql: null });
  }, [active, onActiveSql]);

  const Bar = TEMPLATES.bar;
  return (
    <Bar
      data={active && active.result}
      config={reportTabConfig(tab)}
      tab={tab} onTab={onTab}
      loading={tab === "day" && loading}
      error={tab === "day" && error && !cache.day}
      onRetry={loadDaily}
    />
  );
}

// 카드만 렌더(칩은 Bubble이 아바타 아래에서). config의 template으로 디스패치. 없으면 table.
export function ChartRenderer({ type, result, intent, question, sql, source, rawRows, onCardQuery, onActiveSql }) {
  if (intent === "report") {
    return <ReportToggleCard initial={{ result, sql, source, rawRows }} onCardQuery={onCardQuery} onActiveSql={onActiveSql} />;
  }
  const cfg = INTENT_CONFIG[intent] || null;
  const Tpl = (cfg && TEMPLATES[cfg.template]) || TEMPLATES.table;
  return <Tpl data={result} config={cfg} intent={intent} />;
}

export default ChartRenderer;
