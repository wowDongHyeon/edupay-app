import React from "react";
import TEMPLATES from "./templates";
import { INTENT_CONFIG } from "./intentConfig";
import { ReportPlanRenderer } from "./reportPlan/ReportPlanRenderer";
import { shapeForIntent } from "./shapeForIntent";
import { activeChannelName } from "../api/datasource";
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

// §9 조회조건 뷰 — operia 는 sql 대신 queryInfo(한글 키: 조건/분류기준/정렬기준/지표)를 준다.
//   sql/source 제외한 한글 키를 순회해 `키: 값(배열은 쉼표 join)`으로 표시.
function QueryInfoView({ queryInfo }) {
  const entries = Object.entries(queryInfo || {}).filter(([k, v]) => !["sql", "source"].includes(k) && v != null);
  if (!entries.length) return jsonPre("(조회 조건 정보 없음)");
  return (
    <div className="px-3 py-2.5 text-[11px] leading-relaxed text-violet-50 space-y-1.5 max-h-64 overflow-auto edupay-noscroll">
      {entries.map(([k, v]) => (
        <div key={k}><span className="font-bold text-violet-200/80">{k}</span>: <span className="break-words">{Array.isArray(v) ? v.join(", ") : (typeof v === "object" ? JSON.stringify(v) : String(v))}</span></div>
      ))}
    </div>
  );
}

// §9 SQL/조회조건 칩 — 카드 밖(아바타 아래)에서 렌더. 클릭 토글로 바로 아래 인라인 펼침. 바깥탭/ESC 닫힘.
//   sql 있으면 SQL 칩, 없고 queryInfo 있으면 "조회 조건" 칩, 둘 다 없으면 렌더 안 함.
export function SqlChip({ sql, source, result, rawRows, queryInfo }) {
  const [pinned, setPinned] = useState(false);
  const [tab, setTab] = useState(sql ? "sql" : "info");
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

  // §9(operia) sql 이 없어도 queryInfo(조건/분류기준/정렬기준/지표)가 있으면 "조회 조건" 칩으로 노출.
  const hasQueryInfo = queryInfo && typeof queryInfo === "object"
    && Object.keys(queryInfo).some((k) => !["sql", "source"].includes(k) && queryInfo[k] != null);
  if (!sql && !hasQueryInfo) return null;
  // mock 계열(고정 템플릿/폴백/정적 목업)은 '실제 쿼리'가 아니라 칩 숨김 — 실 채널(api)·Claude 생성(claude)만 노출
  if (source === "template" || source === "fallback" || source === "mock") return null;
  const meta = SOURCE_META[source] || SOURCE_META.api;
  // sql 없으면 "조회 조건" 칩(🔎), 있으면 출처별 SOURCE_META 라벨/아이콘 유지.
  const btnLabel = sql ? meta.label : "조회 조건";
  const btnIcon = sql ? meta.icon : "🔎";
  // source=api 는 실 서버 채널(backend/operia 공통) → 활성 채널명으로 헤더 구분
  const headerText = source === "api"
    ? (activeChannelName() === "backend" ? "출처: 임시 백엔드 서버" : "출처: 오페리아 서버")
    : meta.header;
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
        <span className="font-mono">{btnIcon}</span> {btnLabel}
      </button>
      {open && (
        <div ref={panelRef} className="mt-1.5 w-[300px] max-w-full rounded-xl shadow-xl border border-black/10 overflow-hidden"
          style={{ background: "#1E1B2E" }}>
          <div className={"px-3 py-1.5 text-[10.5px] font-bold border-b border-white/10 flex items-center justify-between " +
            (meta.warn ? "text-amber-300" : "text-violet-200/80")}>
            <span>{headerText}</span>
            <button onClick={() => setPinned(false)} className="text-white/50 hover:text-white text-[13px] leading-none">×</button>
          </div>
          {hasResult && (
            <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10 bg-black/20">
              {sql ? tabBtn("sql", "SQL") : tabBtn("info", "조회 조건")}
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
          ) : sql ? (
            <pre className="px-3 py-2.5 text-[11px] leading-relaxed text-violet-50 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto edupay-noscroll">{sql}</pre>
          ) : (
            <QueryInfoView queryInfo={queryInfo} />
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
// §6-1: 표준 tableData 를 shapeForIntent 가 카드 입력으로 변환(월=initialShaped, 일별=shapeForIntent("reportDaily")).
function ReportToggleCard({ initialShaped, initialRows, sql, source, onCardQuery, onActiveSql }) {
  const [tab, setTab] = useState("month");
  const [cache, setCache] = useState(() => ({
    month: { data: initialShaped, sql, source, rows: initialRows || [] },
    day: null,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadDaily = () => {
    if (loading || !onCardQuery) return;
    setError(false);
    setLoading(true);
    Promise.resolve(onCardQuery(DAILY_TEXT, "reportDaily"))
      .then((resp) => {
        const rows = (resp && resp.tableData) || [];
        const data = shapeForIntent("reportDaily", rows, resp && resp.columnMetadata) || { series: [] };
        setCache((c) => ({ ...c, day: { data, sql: resp && resp.sql, source: resp && resp.source, rows } }));
        setLoading(false);
      })
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
    onActiveSql(active ? { sql: active.sql, source: active.source, rawRows: active.rows } : { sql: null });
  }, [active, onActiveSql]);

  const Bar = TEMPLATES.bar;
  // 배지: 월 탭은 실제 막대(월) 수 기준 "최근 N개월"(1개면 "이번 달"). 일 탭은 기존("최근 7일") 유지.
  const cfg = reportTabConfig(tab);
  const monthCount = active && active.data && Array.isArray(active.data.series) ? active.data.series.length : 0;
  const badge = tab === "month" && monthCount > 0
    ? (monthCount <= 1 ? "이번 달" : `최근 ${monthCount}개월`)
    : cfg.badge;
  return (
    <Bar
      data={active && active.data}
      config={{ ...cfg, badge }}
      tab={tab} onTab={onTab}
      loading={tab === "day" && loading}
      error={tab === "day" && error && !cache.day}
      onRetry={loadDaily}
    />
  );
}

// operia summaryStats.groups[0].rows({label,value,pct}) → 그룹형 카드 표준 입력. 대상: barlist(merchantBreakdown)·donut(catSpend)만.
//   schoolCompare(barlist)는 rank/me/avgRow 가 필요해 제외(그룹행만으론 부족). 그 외/미존재 → null(기존 shapeForIntent 폴백).
const GROUP_PRIORITY = new Set(["merchantBreakdown", "catSpend"]);
function shapeFromGroups(intent, cfg, summaryStats) {
  if (!GROUP_PRIORITY.has(intent)) return null;
  const g = summaryStats && Array.isArray(summaryStats.groups) && summaryStats.groups[0];
  if (!g || !Array.isArray(g.rows) || !g.rows.length) return null;
  // ★회귀 가드: 클라 계산 computeSummaryStats 도 groups 를 만든다(mock/backend 경로). operia 실 payload 전용
  //   마커(groupByLabel/valueLabel)가 있어야만 진입 → mock/backend 는 shapeForIntent 폴백 유지(회귀 0).
  if (!g.groupByLabel && !g.valueLabel) return null;
  const rows = g.rows.map((r) => ({ label: r.label, value: r.value, pct: r.pct }));
  if (cfg.template === "donut") {
    const total = rows.reduce((s, r) => s + (r.value || 0), 0);
    return { total, slices: rows };
  }
  // barlist (merchantBreakdown)
  return { items: rows };
}

// reportPlan 한글 제목: heading.content 우선 → chart.config.title. 없으면 null.
function planTitle(reportPlan) {
  const secs = reportPlan && Array.isArray(reportPlan.sections) ? reportPlan.sections : [];
  const heading = secs.find((s) => s && s.type === "heading" && s.content);
  if (heading) return heading.content;
  const chart = secs.find((s) => s && s.type === "chart" && s.config && s.config.title);
  return chart ? chart.config.title : null;
}
// 그룹형 카드만 payload 제목 우선(그 외는 커스텀 유지). 없으면 cfg.title 폴백.
function mergeTitleFromPlan(intent, cfg, reportPlan) {
  if (!GROUP_PRIORITY.has(intent)) return cfg;
  const t = planTitle(reportPlan);
  return t ? { ...cfg, title: t } : cfg;
}

// 렌더 모델(§0.2): 프론트가 질문으로 카드를 정하고(intent) tableData 를 shapeForIntent 로 카드 입력 변환 → 전용 템플릿.
//   shape 실패(역할 부족/미지원 intent) → reportPlan 폴백 → table. 10개 카드 시각은 전용 템플릿 그대로(입력만 tableData).
// ── dayTxns 헬퍼: operia 건별 행 → 리스트 shape. 컬럼은 '이름'으로 유연 매핑(대소문자 무관), 필수(가맹점·금액) 없으면 null → 폴백. ──
function _pickCol(keys, re, exclude) {
  return keys.find((k) => re.test(k) && !(exclude && exclude.test(k)));
}
function _fmtTime(v) {
  const s = String(v == null ? "" : v);
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);   // "12:00[:00]" → "12:00"
  const d = s.replace(/\D/g, "");
  if (d.length >= 4) return d.slice(0, 2) + ":" + d.slice(2, 4); // "1200"/"120000" → "12:00"
  return "";
}
function dayBadge(scope) {
  const d = scope && scope.date;
  if (!d) return "사용";
  const p = String(d).split("-");
  return p[1] && p[2] ? `${+p[1]}월 ${+p[2]}일` : "사용";
}
function shapeDayTxns(tableData) {
  const rows = Array.isArray(tableData) ? tableData : [];
  if (!rows.length) return null;
  const keys = Object.keys(rows[0] || {});
  const cMerchant = _pickCol(keys, /merchant_nm|merchant|가맹|store|shop/i, /_no$|_id$/i) || _pickCol(keys, /_nm$|name/i, /_no$|_id$/i);
  const cAmount = _pickCol(keys, /dlng_amt|amt|amount|금액|price|pay/i);
  if (!cMerchant || !cAmount) return null; // 형태 안 맞음 → 폴백(reportPlan/table)
  const cItem = _pickCol(keys, /gds_nm|goods|item|상품|product|prod/i, /_no$|_id$/i);
  const cTime = _pickCol(keys, /dlng_tm|_tm$|time|시각|시간/i);
  const cDate = _pickCol(keys, /dlng_dt|_dt$|date|일자/i);
  const items = rows.map((r) => ({
    merchant: r[cMerchant],
    item: cItem ? r[cItem] : "",
    amount: Number(r[cAmount]) || 0,
    time: cTime ? _fmtTime(r[cTime]) : "",
    _t: cTime ? String(r[cTime]).replace(/\D/g, "") : (cDate ? String(r[cDate]) : ""),
  }));
  items.sort((a, b) => (a._t < b._t ? -1 : a._t > b._t ? 1 : 0)); // 시간순(오름차순)
  return { rows: items, total: items.reduce((s, x) => s + x.amount, 0), count: items.length };
}

export function ChartRenderer({ intent, sql, source, tableData, columnMetadata, reportPlan, summaryStats, scope, onCardQuery, onActiveSql }) {
  // 전용 1) report 월/일 토글 — shapeForIntent("report") {series,breakdown}, 일별은 lazy
  if (intent === "report") {
    const shaped = shapeForIntent("report", tableData, columnMetadata);
    if (shaped) return <ReportToggleCard initialShaped={shaped} initialRows={tableData} sql={sql} source={source} onCardQuery={onCardQuery} onActiveSql={onActiveSql} />;
  }
  // 전용 1.5) dayTxns 하루 건별 거래 리스트 — operia 행(merchant/gds/amount/time)을 인라인 shape. 형태 안 맞으면 아래 폴백.
  else if (intent === "dayTxns") {
    const shaped = shapeDayTxns(tableData);
    if (shaped) {
      const label = (scope && scope.label) || "";
      const badge = label && label !== "선택 날짜" ? label : dayBadge(scope);
      return <TEMPLATES.txnList data={shaped} config={{ title: `${badge} 사용 내역`, subtitle: "FOX PAY 결제 · 건별 내역", badge, options: { limit: 6 } }} />;
    }
  }
  // 전용 2) merchantMap 지도 — shapeForIntent("merchantMap") {center,items}. 좌표 없으면(shape 실패) 아래 공통 폴백으로
  //   흘려보낸다(reportPlan 한글 우선 → table). "가맹점 몇개"처럼 merchantMap 오판 시 원시 뷰 대신 리포트/한글 테이블.
  else if (intent === "merchantMap") {
    const shaped = shapeForIntent("merchantMap", tableData, columnMetadata);
    if (shaped) return <TEMPLATES.map data={shaped} config={INTENT_CONFIG.merchantMap || {}} />;
  }
  // 그 외 전용 카드 — INTENT_CONFIG[intent] + shapeForIntent 성공 시 전용 렌더(bar/donut/compare/trend/statList/txList/barlist/list)
  else {
    const cfg = INTENT_CONFIG[intent];
    if (cfg) {
      const grouped = shapeFromGroups(intent, cfg, summaryStats);          // 그룹 payload 우선(비율 그대로)
      const shaped = grouped || shapeForIntent(intent, tableData, columnMetadata);
      if (shaped) {
        const Tpl = TEMPLATES[cfg.template] || TEMPLATES.table;
        // payload 한글 제목은 operia 그룹 경로(grouped)일 때만 — mock/backend(shapeForIntent 폴백)는 cfg.title 유지(회귀 0)
        const mergedCfg = grouped ? mergeTitleFromPlan(intent, cfg, reportPlan) : cfg;
        return <Tpl data={shaped} config={mergedCfg} intent={intent} />;
      }
    }
  }
  // 폴백: 미매칭 intent / shape 실패(자유 질문, operia 표준 등) → reportPlan generic → table
  if (reportPlan && Array.isArray(reportPlan.sections) && reportPlan.sections.length) {
    return <ReportPlanRenderer reportPlan={reportPlan} tableData={tableData} columnMetadata={columnMetadata} summaryStats={summaryStats} />;
  }
  return <TEMPLATES.table data={tableData} intent={intent} columnMetadata={columnMetadata} />;
}

export default ChartRenderer;
