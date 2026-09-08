import React from "react";
// [브랜드 에셋] Vite가 URL로 번들 — 하드코딩 경로 금지. 로고는 icons/(프로젝트 root 하위)에서 import.
import logoFoxpay from "../icons/logo_foxpay.svg";           // 컬러 워드마크(170×62) — 흰 배경 랜딩용
import aiAvatar from "../icons/ai_avatar.png"; // 원형 AI 아바타(자체 보라 배경+흰 심볼)
// [피그마 리스킨] PTS30200001 소비패턴분석_메인 에서 추출한 원본 래스터(둘 다 알파 채널 — 투명 배경 위에 얹힌다).
import mascotBlob from "../icons/mascot_blob.png"; // 마스코트 캐릭터(보라 블롭 얼굴)
import mascotOrb from "../icons/mascot_orb.png";   // 마스코트 뒤 무지개 그라데이션 오브(광원)
import { EDUPAY, dragScroll } from "./data/edupay";
import { HistoryDrawer } from "./components/history";
import { getAiEnabled, setAiEnabled as persistAiEnabled, isAiFeatureOn } from "./config";
import { getDataSource, activeChannelName } from "./api/datasource";
import { resetOperiaSession } from "./api/datasource/operia";
import { getUserId, getUserName } from "./api/session";
import { computeSummaryStats } from "./api/datasource/stats";
import { ChartRenderer, SqlChip } from "./charts/ChartRenderer";
import { CompositeReport } from "./charts/CompositeReport";
import { balanceIntent } from "./util/balanceIntent";
import { SKILLS } from "./skills.js";
import SlashSkillMenu from "./skills/SlashSkillMenu";
// Phase D: InlineCard/RecommendModal(로컬 카드)·isOperiaAiMode·OPERIA_KINDS·chartTypeForIntent import 제거(시그니처 단일 경로).
/* FOX PAY AI 금융친구 — 메인 앱 */
const { useState, useRef, useEffect } = React;
const DATA = EDUPAY;

// [데이터창구] context.companyId (§3 — 값은 추후 주입, 없으면 기본)
const COMPANY_ID = import.meta.env.VITE_OPERIA_COMPANY_ID || "OPERIA";

// answer 말풍선 프라이버시 가드 — backend answer 에 사용자 GPS 좌표("위도 …, 경도 …")가 섞여 와도 화면에 노출 안 되게 제거.
//   괄호형 "(위도 36.64, 경도 127.48)"·무괄호 "위도 36.64, 경도 127.48" 둘 다 제거 후 잔여 공백 정리.
//   ★근본해결은 백엔드가 좌표를 안 넣는 것. 프론트는 어떤 응답이 와도 안전하게 가리는 방어선.
function sanitizeAnswer(text) {
  if (text == null) return text;
  return String(text)
    .replace(/\s*[\(（]\s*위도\s*[-\d.]+\s*[,，]?\s*경도\s*[-\d.]+\s*[\)）]/g, "")
    .replace(/\s*위도\s*[-\d.]+\s*[,，]?\s*경도\s*[-\d.]+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,!?·])/g, "$1")
    .trim();
}

// operia summary 로그에서 실제 SQL 블록만 추출([AG8_NL2SQL_SQL] 뒤 ```sql … ```). 없으면 null. (로그 전체 노출 금지)
function extractOperiaSql(summary) {
  if (!summary || typeof summary !== "string") return null;
  const m = summary.match(/\[AG8_NL2SQL_SQL\][\s\S]*?```sql\s*([\s\S]*?)```/i);
  const sql = m && m[1] ? m[1].trim() : "";
  return sql || null;
}

// 한글 포함 여부(라벨 우선순위 판정용). codeLabels.hasKorean 과 동일 규칙(미export → 로컬 정의).
const _hasKorean = (s) => typeof s === "string" && /[가-힣]/.test(s);

// reportPlan.sections 에서 {대문자 컬럼 → 한글 라벨} 맵 구성.
//   대상 라벨 소스(모두 한글일 때만 채움, 영문/집계형은 무시 → 하드코딩·raw 가 처리):
//     · kpi_cards 의 section.metrics[].{column,label}
//     · section.kpiGrid.metrics[].{column,label}      (있는 구현 대비 방어)
//     · section.kpiGrid.{valueColumn→valueLabel, groupBy→groupLabel}  (operia 실제 kpi_grid 구조)
//   먼저 등장한 라벨을 유지(중복 컬럼 안정성). label 이 없거나 영문이면 담지 않는다.
function reportPlanLabelMap(reportPlan) {
  const map = {};
  const put = (col, label) => {
    if (col == null || !_hasKorean(label)) return;
    const key = String(col).trim().toUpperCase();
    if (map[key] == null) map[key] = String(label);
  };
  const secs = reportPlan && Array.isArray(reportPlan.sections) ? reportPlan.sections : [];
  for (const s of secs) {
    const metrics = []
      .concat(s && Array.isArray(s.metrics) ? s.metrics : [])
      .concat(s && s.kpiGrid && Array.isArray(s.kpiGrid.metrics) ? s.kpiGrid.metrics : []);
    for (const m of metrics) if (m) put(m.column, m.label);
    const kg = s && s.kpiGrid;
    if (kg) {
      put(kg.valueColumn, kg.valueLabel);
      put(kg.groupBy, kg.groupLabel);
    }
  }
  return map;
}

// columnMetadata 의 영문 라벨을 reportPlan 한글로 보강(라벨 우선순위 ② 채움).
//   하드코딩 우선(①)은 labelForColumn 이 렌더 시점에 보장하므로, 여기선 raw영문 라벨 → reportPlan한글만 채운다.
//   이미 한글인 label 은 유지. column/type/displayOrder 는 불변(shapeForIntent·summaryStats 무영향).
function enrichColumnMetadata(columnMetadata, reportPlan) {
  if (!Array.isArray(columnMetadata) || !columnMetadata.length) return columnMetadata;
  const map = reportPlanLabelMap(reportPlan);
  if (!Object.keys(map).length) return columnMetadata;
  return columnMetadata.map((m) => {
    if (!m || m.column == null || _hasKorean(m.label)) return m;
    const ko = map[String(m.column).trim().toUpperCase()];
    return ko != null ? { ...m, label: ko } : m;
  });
}

// 데이터 질문 1건 → 데이터창구 어댑터의 SSE 이벤트(data 청크 → result) 소비.
// StreamState: data 의 tableData 를 rows 에 누적, isLast 로 종료. 데이터 확정 시 computeSummaryStats 계산(§4.4, §8).
// ★Phase A 브리지: result 이벤트를 "기존 렌더가 기대하는 입력"{ result, rawRows, sql, source } 로 변환해 resolve.
//   (Phase B 에서 reportPlan 렌더러로 전환하며 이 브리지를 제거한다.)
function queryDataSource(userInput, intent, scope, opts) {
  const ds = getDataSource();
  const ephemeral = !!(opts && opts.ephemeral); // 스킬 앵커 전용 1회성 세션(operia). mock/backend 는 무시.
  return new Promise((resolve, reject) => {
    const state = { rows: [], columnMetadata: null, done: false };
    let settled = false;
    // [세션] userId 는 이 경로에서 1회 조회(session.getUserId 가 캐시) → context 에 주입.
    // 어댑터(operia/backend)는 context 를 스프레드로 그대로 실어 보낸다(companyId 만 채널값으로 덮음). mock 은 context 무시.
    getUserId().then((userId) =>
      ds.query(
        { userInput, context: { companyId: COMPANY_ID, userId }, hints: { intent, scope }, ephemeral },
        {
          onData: (e) => {
            if (e && Array.isArray(e.tableData)) {
              if (e.chunkIndex === 0) state.rows = []; // 첫 청크면 초기화(이후 청크는 누적)
              state.rows = state.rows.concat(e.tableData);
            }
            if (e && e.columnMetadata) state.columnMetadata = e.columnMetadata;
            if (e && e.isLast) state.done = true;
          },
          onResult: (e) => {
            if (settled) return;
            settled = true;
            // 데이터 확정 → 클라가 summaryStats 계산(§4.4). ★bridge 제거(§0.2): 표준 계약(tableData+reportPlan)만 소비.
            // result 이벤트 columnMetadata(한글 라벨·displayOrder 포함)를 우선 — data 청크 라벨은 원컬럼(예: merchant_count)일 수 있어
            //   사용자 노출 라벨(예: 가맹점수)이 정확. type/column 은 동일해 shapeForIntent 무영향. mock/backend 는 두 이벤트가 동일(회귀 0).
            const resultCM = e && Array.isArray(e.columnMetadata) && e.columnMetadata.length ? e.columnMetadata : null;
            // 라벨 우선순위 ②: operia columnMetadata 의 영문 라벨을 reportPlan 한글 라벨로 보강(하드코딩 ①은 labelForColumn 이 보장).
            const columnMetadata = enrichColumnMetadata(resultCM || state.columnMetadata || [], e && e.reportPlan);
            // summaryStats: operia payload(e.summaryStats) 우선, 없으면 클라 계산(§4.4). mock/backend 는 미전송 → 항상 클라 계산(회귀 0).
            const payloadStats = e && e.summaryStats;
            const hasPayloadStats = payloadStats && typeof payloadStats === "object"
              && ((Array.isArray(payloadStats.groups) && payloadStats.groups.length) || (Array.isArray(payloadStats.columns) && payloadStats.columns.length));
            const summaryStats = hasPayloadStats ? payloadStats : computeSummaryStats(state.rows, columnMetadata);
            const qi = (e && e.queryInfo) || {};
            resolve({
              tableData: state.rows,       // 전용 2개(report/map)는 ChartRenderer 가 shape, generic 은 reportPlan 렌더
              columnMetadata,
              reportPlan: e && e.reportPlan,
              summaryStats,
              appliedPeriod: (e && e.appliedPeriod) || null, // 기간정책 02: 기간 배지 소스(operia 미제공이면 null → 미표시)
              queryBreakdown: (e && e.queryBreakdown) || null, // 기간정책 02 D1: appliedPeriod 없어도 봉투 필터로 기간 배지 도출(백업 queryInfo.조건)
              answer: sanitizeAnswer((e && e.answer) || ""),
              sql: qi.sql || extractOperiaSql(e && e.summary) || null,         // §9 SQL 칩(operia 는 summary 로그에서 추출)
              source: qi.source || "api",  // 칩 라벨용(mock=template, backend/operia=자기 값)
              queryInfo: qi,               // §9 sql 없을 때(operia) "조회 조건" 칩용(조건/분류기준/정렬기준/지표 한글 키)
              unsupported: !!(e && e.unsupported),
              message: sanitizeAnswer((e && e.answer) || ""),
              success: !(e && e.success === false),
              errorMessage: (e && e.errorMessage) || null,
            });
          },
          onError: (err) => {
            if (settled) return;
            settled = true;
            reject(new Error((err && err.message) || "datasource error"));
          },
        }
      )
    ).catch((err) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

// [WebView] ?view=webview 로 로드되면 폭스에듀 네이티브 앱에 임베드된 모드.
// 자체 헤더/탭(상단바는 네이티브가 그림)을 숨기고, 인트로를 건너뛰어 금융친구 화면부터 시작.
const WEBVIEW =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("view") === "webview";

// [피그마 리스킨] 웹뷰일 때 <html> 에 .webview 를 붙여 index.css 가 배경을 transparent 로 덮게 한다.
//   CSS 만으로는 ?view=webview 를 알 수 없으므로 JS 가 클래스 하나만 심어주는 방식(단일 접점).
if (WEBVIEW && typeof document !== "undefined") document.documentElement.classList.add("webview");

// [피그마 리스킨] 새 랜딩(마스코트+오브) on/off. 미설정=true(신규 디자인).
//   검수 중 구/신 비교가 필요하면 .env.local 에 VITE_NEW_LANDING=false → 기존 로고 랜딩으로 즉시 복귀.
const NEW_LANDING = import.meta.env.VITE_NEW_LANDING !== "false";

// [실기기] 웹뷰 상단 네이티브 크롬(헤더+카테고리 칩바) 아래로 웹 콘텐츠를 밀어내는 상단 인셋(px).
//   env(safe-area-inset-top)=상태바 노치만 커버하므로, 네이티브(Flutter)가 그리는 헤더+칩바 높이는 이 상수로 별도 확보.
//   미확보 시 대화 첫 메시지가 칩바 뒤로 잘린다.
//   ⚠ 크롬 높이는 기기마다 달라 실기기 튜닝 노브로 둔다(브라우저엔 네이티브 크롬이 없어 로컬 검증 불가).
//   튜닝 우선순위: ?top_inset=NN URL 파라미터(재빌드 없이 기기서 값 탐색) → VITE_WEBVIEW_TOP_INSET → 기본 130.
// ⚠ get()은 미지정 시 null → Number(null)=0 이라 그냥 넘기면 인셋이 항상 0으로 덮인다. 값이 있을 때만 숫자로 읽는다.
const _rawTopInset = (typeof window !== "undefined") ? new URLSearchParams(window.location.search).get("top_inset") : null;
const _urlTopInset = _rawTopInset ? Number(_rawTopInset) : NaN;
const WEBVIEW_TOP_INSET = Number.isFinite(_urlTopInset) ? _urlTopInset : (Number(import.meta.env.VITE_WEBVIEW_TOP_INSET) || 130);
const WEBVIEW_TOP_CSS = `calc(max(env(safe-area-inset-top), 12px) + ${WEBVIEW_TOP_INSET}px)`;

// [개발용 디버그 표시 토글] 독립 플래그 2개(단일 출처). 기본 OFF(데모/실배포 깔끔), .env.local 에서 개별 ON.
//   VITE_SHOW_SQL          → SQL/조회조건 칩 노출 여부
//   VITE_SHOW_SOURCE_BADGE → "operia · balance" 데이터소스 배지 토스트 여부
// 파싱: 'true' 문자열만 true(미설정/그 외 = false).
const SHOW_SQL = import.meta.env.VITE_SHOW_SQL === "true";
const SHOW_SOURCE_BADGE = import.meta.env.VITE_SHOW_SOURCE_BADGE === "true";
const FOX_LOADER_ENABLED = import.meta.env.VITE_FOX_LOADER_ENABLED === "true"; // 미설정=false(여우 OFF→점3개 폴백). 'true'면 FoxRunner 여우 로더 표시.

// [웹뷰] 우상단 🕘 대화기록 버튼 튜닝값. idleOpacity=평소 반투명, size=버튼 지름(px), hideDelayMs=마지막 스크롤 후 idle 복귀 지연.
const HISTORY_BTN = { idleOpacity: 0.5, size: 34, hideDelayMs: 1000 };

const GRADES = ["초등", "중학", "고등"];
const GRADE_LABELS = { "초등": "초등학생", "중학": "중학생", "고등": "고등학생" };

// Phase D: 로컬 카드(퀴즈·추천) 라우팅 제거 → 채팅뷰 빠른칩은 데이터 칩(소비패턴 분석)만 남긴다.
const SUGGESTIONS = [
{ icon: "📊", label: "소비패턴 분석", text: "내 소비 패턴 분석해줘" }];


const FAVORITES = SUGGESTIONS;

/* 입력창 위 고정 빠른 질문 (사용자 지정) */
// 진입 랜딩·즐겨찾기 공용 질의. 플래그 하나로 4개(핵심)↔8개(전체) 토글.
//   SHOW_ALL_QUICK_QUERIES = false → 핵심 4개(기본/운영), true → 전체 8개(테스트).
//   메인 칩(IntroLanding)·즐겨찾기 시드 모두 QUICK_QUERIES 참조 → 이 값 하나로 둘 다 바뀜.
const SHOW_ALL_QUICK_QUERIES = import.meta.env.VITE_SHOW_ALL_QUICK_QUERIES === 'true'; // .env.local 로 4↔8 전환(미설정=4개). QUICK_QUERIES·FAV_KEY 자동 연동.
// 진입칩·즐겨찾기 전용 질의(스킬과 분리). 스킬 = 특화 슬래시 명령(SKILLS), 진입칩 = 빠른 자연어 질의.
//   문자열·순서·아이콘 = v1 고정(FAV_KEY 시드/회귀 0). 단일 스킬 제거와 무관하게 진입칩 불변.
const QUICK_QUERIES_ALL = [
  { icon: "💰", text: "현재 사용할 수 있는 금액 알려줘" },
  { icon: "📅", text: "월별 사용 내역 알려줘" },
  { icon: "📍", text: "근처 사용 가능 가맹점 알려줘" },
  { icon: "🧾", text: "사용처별 내역 알려줘" },
  { icon: "👫", text: "친구랑 사용내역 비교 해줘" },
  { icon: "🛒", text: "온라인/오프라인 결제내역 확인해줘" },
  { icon: "📊", text: "어디에 주로 쓰고 있는지 알려줘" },
  { icon: "🏫", text: "학교별 사용 내역 비교해줘" },
];
const QUICK_QUERIES = SHOW_ALL_QUICK_QUERIES ? QUICK_QUERIES_ALL : QUICK_QUERIES_ALL.slice(0, 4);
// 즐겨찾기 시드 키를 질의 개수에 묶음 → 플래그로 4↔8 바뀌면 즐겨찾기도 그 세트로 재시드(같은 모드 내 편집은 유지).
const FAV_KEY = "edupay_favorites_v1_" + QUICK_QUERIES.length;



/* ── FOX PAY 로고 마크 (말풍선) ──────────────────────── */
function FoxMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className="shrink-0">
      {/* 말풍선 블롭 + 꼬리 */}
      <circle cx="18" cy="17" r="13.5" fill="#6E61DE" />
      <path d="M25 25 L33 32 L27.5 21 Z" fill="#6E61DE" />
      {/* 여우 얼굴 실루엣 */}
      <path d="M11.5 8.8 L18 13.8 L24.5 8.8 L23.2 17.6 L18 24 L12.8 17.6 Z"
      fill="#fff" strokeLinejoin="round" stroke="#fff" strokeWidth="1.2" />
    </svg>);

}

/* ── 초기 화면 히어로 아이콘 (FOX PAY 마크 크게) ──────── */
function SparkleIcon({ size = 88 }) {
  return (
    <div className="edupay-float flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="18" cy="17" r="13.5" fill="#6E61DE" />
        <path d="M25 25 L33 32 L27.5 21 Z" fill="#6E61DE" />
        <path d="M11.5 8.8 L18 13.8 L24.5 8.8 L23.2 17.6 L18 24 L12.8 17.6 Z"
        fill="#fff" strokeLinejoin="round" stroke="#fff" strokeWidth="1.2" />
      </svg>
    </div>);

}

/* ── 채팅 AI 아바타 — 보라 라운드 사각 + 브랜드 심볼(launcher). Bubble/Typing 공통. ── */
function AiAvatar() {
  // 업체 제공 원형 아바타(자체 배경 O) — 보라 라운드사각/그라데이션·내부 심볼 없이 원형 이미지 그대로. 크기·여백은 기존과 동일.
  return (
    <img src={aiAvatar} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover mt-0.5" />);

}

const TABS = ["앱카드", "학생증", "금융친구"];

/* ── 헤더 (FOX PAY 글로벌 헤더 + 탭바) ────────────────── */
function Header({ grade, setGrade, tab, setTab, canBack, onBack, onHistory, aiFeature, aiEnabled, onToggleAi }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 bg-white shrink-0"
    style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
      {/* 글로벌 헤더 */}
      <div className="flex items-center justify-between pl-2 pr-3 h-11">
        <div className="flex items-center gap-0.5">
          {canBack &&
          <button onClick={onBack} aria-label="뒤로가기"
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition shrink-0">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
              <path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          }
          <div className="flex items-center gap-1.5 pl-2">
            <FoxMark size={26} />
            <span className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: "#1A1A1A" }}>Pay</span>
          </div>
        </div>
        <div className="relative shrink-0 flex items-center gap-1">
          {/* 대화 기록 */}
          {onHistory &&
          <button onClick={onHistory} aria-label="대화 기록"
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7.5 4M3 4v3.5h3.5" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 7.5V12l3 2" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          }
          {/* 공유 아이콘 */}
          <button className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path d="M21 3L10.5 13.5M21 3l-6.8 18-3.7-8.5L2 9l19-6Z" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* 메뉴(햄버거) — 학년 선택 */}
          <button onClick={() => setOpen((o) => !o)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="#3A3A3C" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
          {open &&
          <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(false)}></div>
              <div className={(aiFeature ? "w-44" : "w-36") + " absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 overflow-hidden"}>
                <div className="px-3.5 pt-1.5 pb-1 text-[11px] font-bold text-gray-400">학년 선택</div>
                {GRADES.map((g) =>
              <button key={g} onClick={() => {setGrade(g);setOpen(false);}}
              className={"w-full text-left px-3.5 py-2 text-[13px] font-medium flex items-center justify-between " + (
              g === grade ? "text-violet-600 bg-violet-50" : "text-gray-700 active:bg-gray-50")}>
                    {GRADE_LABELS[g]} {g === grade && <span className="text-violet-500">✓</span>}
                  </button>
              )}
                {/* ── AI 답변 설정 (VITE_AI_ENABLED=true 일 때만) ── */}
                {aiFeature &&
                <>
                  <div className="my-1 border-t border-gray-100"></div>
                  <div className="px-3.5 pt-1 pb-1 text-[11px] font-bold text-gray-400">설정</div>
                  <button onClick={() => onToggleAi && onToggleAi(!aiEnabled)}
                  className="w-full text-left px-3.5 py-2 text-[13px] font-medium flex items-center justify-between text-gray-700 active:bg-gray-50">
                    <span>AI 답변(Claude)</span>
                    <span className={"relative inline-flex w-9 h-5 rounded-full transition " + (aiEnabled ? "bg-violet-600" : "bg-gray-300")}>
                      <span className={"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all " + (aiEnabled ? "left-[18px]" : "left-0.5")}></span>
                    </span>
                  </button>
                  <div className="px-3.5 pb-1.5 text-[10.5px] text-gray-400 leading-tight">{aiEnabled ? "켜짐 · 자유대화는 Claude 호출" : "꺼짐 · 로컬 답변만"}</div>
                </>
                }
              </div>
            </>
          }
        </div>
      </div>
      {/* 탭바 */}
      <div className="flex px-2 border-b border-gray-100">
        {TABS.map((t) =>
        <button key={t} onClick={() => setTab(t)}
        className={"relative flex-1 py-2.5 text-[14px] font-bold transition " + (
        tab === t ? "text-gray-900" : "text-gray-300")}>
            {t}
            {tab === t && <span className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-12 h-[2.5px] rounded-full" style={{ background: "#5B4DD6" }}></span>}
          </button>
        )}
      </div>
    </header>);

}

/* ── 앱카드 / 학생증 자리표시 ─────────────────────────── */
function ComingSoon({ tab, onGoChat }) {
  const meta = {
    "앱카드": { emoji: "💳", title: "앱카드", desc: "FOX PAY 잔액 결제와 충전을\n여기서 만나볼 수 있어요." },
    "학생증": { emoji: "🪪", title: "모바일 학생증", desc: "바코드 학생증과 학교 인증을\n여기서 만나볼 수 있어요." }
  }[tab];
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 edupay-fade">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-[38px] mb-5" style={{ background: "#EEEBFA" }}>{meta.emoji}</div>
      <h2 className="text-[19px] font-extrabold text-gray-900">{meta.title}</h2>
      <p className="mt-2 text-[13px] text-gray-400 text-center leading-relaxed whitespace-pre-line">{meta.desc}</p>
      <button onClick={onGoChat}
      className="mt-6 px-5 py-3 rounded-2xl text-white text-[13.5px] font-bold active:scale-95 transition"
      style={{ background: "#5B4DD6" }}>
        금융친구한테 물어보기 →
      </button>
    </div>);

}

/* ── AI 마스코트 오브 ─────────────────────────────────── */
function AIOrb() {
  return (
    <div className="edupay-orb edupay-float">
      <div className="edupay-orb__halo"></div>
      <div className="edupay-orb__blob"></div>
      <div className="edupay-orb__visor">
        <span className="edupay-orb__eye"></span>
        <span className="edupay-orb__eye"></span>
      </div>
      <div className="edupay-orb__reflect"></div>
    </div>);

}

/* ── 인트로 화면 (포인트 잔액 + AI 금융친구 시작) ────────── */
function IntroScreen({ points, onStart, onOpenPoints }) {
  return (
    <div className="flex-1 overflow-y-auto edupay-noscroll px-5 pt-4 pb-6 edupay-fade flex flex-col">
      {/* 에듀페이 포인트 — 프리미엄 잔액 카드 */}
      <button onClick={onOpenPoints}
      className="w-full text-left active:scale-[.985] transition relative overflow-hidden rounded-[24px] p-5 mb-4 mt-1"
      style={{ background: "linear-gradient(135deg,#8A6FE0 0%,#7C5CD6 55%,#6A49C6 100%)", boxShadow: "0 18px 34px -14px rgba(124,92,214,.26)" }}>
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(255,255,255,.22),transparent 68%)" }}></div>
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-white/75">
              <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
              에듀페이 포인트
            </div>
            <div className="mt-2.5 flex items-baseline gap-0.5 text-white">
              <span className="text-[36px] font-extrabold tracking-[-0.02em] leading-none">{DATA.num(points)}</span>
              <span className="text-[22px] font-extrabold leading-none">P</span>
            </div>
          </div>
          <div className="edupay-coin shrink-0"><span>P</span></div>
        </div>
        <div className="relative mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-white/70">질문·금융학습·퀴즈로 포인트가 쌓여요</span>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,.8)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* AI 금융친구 시작 카드 */}
      <div className="relative flex-1 rounded-[30px] px-6 pt-10 pb-6 flex flex-col items-center text-center overflow-hidden"
      style={{ background: "linear-gradient(180deg,#F0EEFC 0%,#E7E3FA 100%)", boxShadow: "0 14px 30px -18px rgba(74,63,176,.35), inset 0 1px 0 rgba(255,255,255,.7)" }}>
        <h2 className="text-[28px] font-extrabold text-gray-900 tracking-[-0.025em]">AI 금융친구</h2>
        <p className="mt-3 text-[14px] font-medium text-gray-500 leading-relaxed">
          AI 금융친구랑 함께<br />
          돈 쓰는 습관도 배우고, 포인트도 받아보자!
        </p>

        {/* 말풍선 배지 */}
        <div className="relative mt-7 mb-1">
          <div className="px-4 py-2 rounded-2xl text-white text-[14px] font-bold"
          style={{ background: "linear-gradient(135deg,#5B4DD6,#4A3FB0)", boxShadow: "0 8px 18px -6px rgba(91,77,214,.18)" }}>
            올바른 금융습관 도우미
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-3 h-3 rotate-45"
          style={{ background: "#4A3FB0" }}></div>
        </div>

        {/* 마스코트 */}
        <div className="my-8 flex-1 flex items-center justify-center min-h-0">
          <AIOrb />
        </div>

        {/* 시작하기 */}
        <button onClick={onStart}
        className="w-full py-[15px] rounded-2xl text-white active:scale-[.98] transition flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#5B4DD6,#4A3FB0)", boxShadow: "0 14px 26px -10px rgba(91,77,214,.18)" }}>
          <span className="text-[16px] font-extrabold tracking-[-0.01em]">시작하기</span>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>);

}

/* ── 메뉴 홈 카드 아이콘 (컬러 일러스트) ───────────────── */
const MenuIcons = {
  ledger:
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="13" y="12" width="26" height="33" rx="5" fill="#fff" stroke="#9AA0B4" strokeWidth="2.4" />
      <path d="M19 9v6M27 9v6M35 9v6" stroke="#9AA0B4" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M19 24h13M19 30h10" stroke="#C3C8D8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M30.5 41.5l11-11a3.2 3.2 0 0 0 0-4.5l-.5-.5a3.2 3.2 0 0 0-4.5 0l-11 11-1.6 6.1 6.1-1.1z" fill="#7C5CD6" />
      <path d="M35.5 27.5l4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>,

  analysis:
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="13" y="26" width="6.5" height="17" rx="2.2" fill="#A99CEC" />
      <rect x="23" y="18" width="6.5" height="25" rx="2.2" fill="#7C5CD6" />
      <rect x="33" y="30" width="6.5" height="13" rx="2.2" fill="#C3C8D8" />
      <path d="M40 12.5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#F5B83D" />
    </svg>,

  quiz:
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <path d="M14 16a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H25l-7 6v-6h-0a5 5 0 0 1-4-5z" fill="#EDE9FB" stroke="#7C5CD6" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M28 17.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="#7C5CD6" strokeWidth="2.4" />
      <path d="M30.6 24.5l2.4 2.4" stroke="#7C5CD6" strokeWidth="2.4" strokeLinecap="round" />
    </svg>,

  shorts:
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="11" y="20" width="26" height="20" rx="4.5" fill="#fff" stroke="#9AA0B4" strokeWidth="2.4" />
      <path d="M19 20l5-7M30 20l-3.5-7" stroke="#9AA0B4" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="37" cy="32" r="9" fill="#F47FB0" />
      <path d="M34.5 28.5l5 3.5-5 3.5z" fill="#fff" />
    </svg>,

  content:
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <path d="M15 22h26l-2 4H17z" fill="#F7B9CE" />
      <path d="M15 22l2-6h22l2 6" stroke="#F47FB0" strokeWidth="2.4" strokeLinejoin="round" fill="#FBD6E4" />
      <rect x="17" y="26" width="22" height="17" rx="2.5" fill="#FBD6E4" stroke="#F47FB0" strokeWidth="2.4" />
      <path d="M24 36a4 4 0 0 0 8 0" stroke="#F47FB0" strokeWidth="2.2" strokeLinecap="round" />
    </svg>,

  local:
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="13" y="24" width="22" height="17" rx="2.5" fill="#FBEAC0" stroke="#E1A92E" strokeWidth="2.4" />
      <path d="M11 20l2-5h22l2 5z" fill="#FAE08F" stroke="#E1A92E" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M40 22c4 0 7 3 7 7 0 4.5-7 12-7 12s-7-7.5-7-12c0-4 3-7 7-7z" fill="#F4715E" />
      <circle cx="40" cy="29" r="2.6" fill="#fff" />
    </svg>

};

/* ── 금융친구 메뉴 홈 ──────────────────────────────────── */
function MenuScreen({ onPick }) {
  // Phase D: 로컬(비데이터) 카드 칩(퀴즈·추천쇼츠·콘텐츠몰) 제거 확정. 데이터 칩(분석·지역상생몰)만 유지.
  const MENU = [
  { key: "analysis", label: "소비패턴\n분석", text: "내 소비 패턴 분석해줘" },
  { key: "local", label: "지역상생 몰", text: "근처 사용 가능 가맹점 알려줘" }];

  return (
    <div className="flex-1 flex flex-col overflow-hidden edupay-fade px-5 pt-8 pb-6 bg-white">
      {/* 마스코트 */}
      <div className="flex justify-center items-center shrink-0" style={{ height: 90 }}>
        <div style={{ transform: "scale(.56)" }}><AIOrb /></div>
      </div>
      {/* 인사말 */}
      <h2 className="mt-1 text-center text-[24px] font-extrabold text-gray-900 leading-snug tracking-[-0.02em] shrink-0" style={{ fontSize: "20px" }}>
        안녕!<br />난 너의 금융친구야 😊
      </h2>
      {/* 메뉴 그리드 */}
      <div className="mt-5 grid grid-cols-2 gap-3 flex-1 min-h-0" style={{ gridTemplateRows: "repeat(3, 1fr)" }}>
        {MENU.map((m) =>
        <button key={m.key} onClick={() => onPick(m.text)}
        className="flex flex-col items-center justify-center gap-3 rounded-[24px] px-3 active:scale-[.97] transition"
        style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.75)", backdropFilter: "blur(6px)", boxShadow: "0 10px 24px -16px rgba(91,77,214,0.5)" }}>
            {MenuIcons[m.key]}
            <span className="text-[15px] font-bold text-gray-800 text-center leading-tight whitespace-pre-line">{m.label}</span>
          </button>
        )}
      </div>
    </div>);

}

/* ── webview 진입 랜딩 — [피그마 리스킨] PTS30200001 소비패턴분석_메인 ─────────
   빈 대화(진입/새 대화)에서만 노출. 전송되면 started=true → 숨김(호출부 조건).
   피그마 대비 변경점: 로고 워드마크 → 마스코트(오브+블롭) / 인사말 2줄 → 1줄 / 칩 full-width 좌측 → 가운데정렬 pill / 칩 이모지 제거.
   NEW_LANDING=false 면 기존 로고 랜딩(IntroLandingLegacy)으로 즉시 복귀 — 검수 중 구·신 비교용. */
function IntroLanding({ userName, onPick }) {
  if (!NEW_LANDING) return <IntroLandingLegacy userName={userName} onPick={onPick} />;
  return (
    <div className="flex-1 flex flex-col items-center pt-6 px-6 edupay-fade">
      {/* 마스코트 = 오브(뒤 광원) + 블롭 얼굴(앞). 둘 다 알파 PNG라 투명 배경 위에 그대로 얹힌다.
          모션 명세가 피그마에 없어 정적으로 둔다(움직여야 하면 여기 wrapper 에 CSS 애니만 추가). */}
      <div className="relative w-[170px] h-[170px] shrink-0 flex items-center justify-center">
        <img src={mascotOrb} alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none" />
        <img src={mascotBlob} alt="AI 금융친구"
          className="relative w-[100px] h-auto select-none pointer-events-none" />
      </div>
      <h2 className="mt-4 text-[22px] font-extrabold text-gray-900 text-center leading-snug tracking-[-0.02em]">
        {userName ? `${userName}님, 반가워요` : "반가워요"}
      </h2>
      {/* 추천 질문 칩 — 피그마(YXmI502, node 0-2241): 가운데정렬(items-center) + 콘텐츠 폭 pill, 아이콘 없음, 반투명 흰 배경 + 테두리.
          투명 배경 위에 얹히므로 회색 채움(#F3F4F6) 대신 반투명 흰색 + 그림자로 떠 보이게 한다. */}
      <div className="mt-7 w-full flex flex-col items-center gap-2.5">
        {QUICK_QUERIES.map((q, i) =>
        <button key={i} onClick={() => onPick(q.text)}
        className="px-4 py-2.5 rounded-full text-[13.5px] font-semibold whitespace-nowrap bg-white/70 text-gray-700 border border-white/80 backdrop-blur-[2px] active:bg-violet-50 active:text-violet-600 active:scale-95 transition"
        style={{ boxShadow: "0 6px 16px -10px rgba(91,77,214,0.45)" }}>
            {q.text}
          </button>
        )}
      </div>
    </div>);

}

/* ── (구) 진입 랜딩 — 로고 워드마크 + 2줄 인사 + full-width 좌측정렬 칩(이모지 포함).
   VITE_NEW_LANDING=false 일 때만 렌더. 리스킨 검수 통과 후 제거 대상. */
function IntroLandingLegacy({ userName, onPick }) {
  return (
    <div className="flex-1 flex flex-col items-center pt-6 px-6 edupay-fade">
      <img src={logoFoxpay} alt="FOX PAY" className="w-[150px] h-auto" />
      <h2 className="mt-6 text-[22px] font-extrabold text-gray-900 text-center leading-snug tracking-[-0.02em]">
        {userName ? <>{userName}님<br />반가워요</> : "반가워요"}
      </h2>
      <div className="mt-8 w-full flex flex-col items-stretch gap-3">
        {QUICK_QUERIES.map((q, i) =>
        <button key={i} onClick={() => onPick(q.text)}
        className="flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-semibold whitespace-nowrap text-left bg-[#F3F4F6] text-gray-700 active:bg-violet-50 active:text-violet-600 active:scale-95 transition">
            <span className="text-[16px]">{q.icon}</span>
            {q.text}
          </button>
        )}
      </div>
    </div>);

}

/* ── 초기 진입 화면 ───────────────────────────────────── */
function WelcomeScreen({ onPick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 edupay-fade">
      <SparkleIcon />
      <h2 className="mt-5 text-[22px] font-extrabold text-gray-900 text-center leading-snug">무엇이든 물어봐!</h2>
      <p className="mt-2 text-[13px] text-gray-400 text-center leading-relaxed">
        EUD Pay AI<br />소비와 용돈을 똑똑하게 관리해줄게 ✨
      </p>
      <div className="mt-7 w-full flex flex-col gap-2.5">
        {SUGGESTIONS.map((s, i) =>
        <button key={i} onClick={() => onPick(s.text)}
        className="group flex items-center gap-3 w-full pl-4 pr-3 py-3.5 rounded-2xl bg-[#F3F4F6] active:bg-violet-50 transition text-left">
            <span className="text-[18px] shrink-0">{s.icon}</span>
            <span className="flex-1 text-[14px] font-semibold text-gray-700">{s.text}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-300 group-active:text-violet-400">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>);

}

/* ── 가로 스와이프 노출 공용 훅 (FAQ 행 삭제 / 사용자 말풍선 등록 공통) ──────────
   왼쪽으로 끌면 본체가 -reveal 까지 이동해 우측 버튼 노출. touch/mouse 분리로 이중 처리 없음.
   iOS(WKWebView): 가로 확정 후 비수동 touchmove 에서 preventDefault → 가장자리 한정 해소(중앙에서도 점유).
   세로 우세면 스크롤에 양보, 짧은 탭은 onClick 으로(드래그 직후 click 은 dragRef 로 억제).
   isOpen/onOpen/onClose 는 호출부가 단일 소스로 소유(컨트롤드). */
function useSwipeReveal({ reveal, openTh, isOpen, onOpen, onClose }) {
  const drag = React.useRef({ active: false, decided: false, horiz: false, x0: 0, y0: 0, mode: null });
  const [dx, setDx] = React.useState(0);
  const bodyRef = React.useRef(null);
  React.useEffect(() => { if (!drag.current.active) setDx(isOpen ? -reveal : 0); }, [isOpen, reveal]);

  const start = (x, y, mode) => { drag.current = { active: true, decided: false, horiz: false, x0: x, y0: y, mode }; };
  const move = (x, y, ev) => {
    const d = drag.current;
    if (!d.active) return;
    const ddx = x - d.x0, ddy = y - d.y0;
    if (!d.decided) {
      if (Math.abs(ddx) < 5 && Math.abs(ddy) < 5) return; // 방향 미정(탭/스크롤 보호)
      d.decided = true; d.horiz = Math.abs(ddx) > Math.abs(ddy);
    }
    if (!d.horiz) return;                       // 세로 우세 → 스크롤에 맡김(preventDefault 안 함)
    if (ev && ev.cancelable) ev.preventDefault(); // 가로 확정 → iOS 가로채기 차단(중앙에서도 점유)
    let next = (isOpen ? -reveal : 0) + ddx;
    if (next > 0) next = 0;
    if (next < -reveal) next = -reveal;
    setDx(next);
  };
  const finish = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (!d.horiz) return; // 스와이프 아니면 위치 변동 없음(탭은 onClick)
    if (dx <= -openTh) { if (isOpen) setDx(-reveal); else onOpen(); }
    else { if (isOpen) onClose(); else setDx(0); }
  };
  // [터치] touchmove 는 React(passive)로 preventDefault 불가 → ref 로 비수동 등록.
  React.useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onTouchMove = (e) => { if (drag.current.mode !== "touch") return; const t = e.touches[0]; if (t) move(t.clientX, t.clientY, e); };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [isOpen]); // isOpen 변경 시 move 클로저(base) 갱신 위해 재바인딩

  const handlers = {
    onTouchStart: (e) => { const t = e.touches[0]; if (t) start(t.clientX, t.clientY, "touch"); },
    onTouchEnd: finish,
    onTouchCancel: finish,
    onPointerDown: (e) => { if (e.pointerType === "mouse") start(e.clientX, e.clientY, "mouse"); }, // 터치는 위 touch 핸들러
    onPointerMove: (e) => {
      if (drag.current.mode !== "mouse") return;
      if (!drag.current.decided || drag.current.horiz) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} }
      move(e.clientX, e.clientY, null); // 마우스는 preventDefault 불필요
    },
    onPointerUp: () => { if (drag.current.mode === "mouse") finish(); },
    onPointerLeave: () => { if (drag.current.mode === "mouse") finish(); },
    onPointerCancel: () => { if (drag.current.mode === "mouse") finish(); },
  };
  return { dx, bodyRef, handlers, dragRef: drag };
}

/* ── 사용자 말풍선 — long-press(~500ms) → onRegisterFaq(text)(App에서 등록 확인창). 짧은 탭/스크롤 무동작. ──
   웹 long-press 억제: user-select/touch-callout none(style) + contextmenu/dragstart preventDefault.
   10px 이상 이동 시 타이머 취소(스크롤 보호). AOS 네이티브 가로채기는 Flutter 억제(별도)로 보완, iOS는 웹 억제로 동작. */
// 스킬(슬래시) 명령 칩 — skillId 있는 user 메시지 전용. text = "/명령어 [인자]".
//   '/'만 accent 컬러 + 명령어 = 둥근 pill, 인자는 오른쪽 평문(CLI/Cowork 슬래시 렌더와 동일 감각).
function SkillChip({ text }) {
  const raw = String(text || "");
  const sp = raw.indexOf(" ");
  const cmd = sp === -1 ? raw : raw.slice(0, sp);          // "/자금보고서"
  const rest = sp === -1 ? "" : raw.slice(sp + 1).trim();  // "지난달"
  const name = cmd.replace(/^\//, "");
  const icon = SKILLS[name]?.icon;                         // 레지스트리 아이콘(없으면 생략)
  return (
    <div className="flex justify-end items-center gap-1.5">
      {rest && <span className="text-[13px] text-gray-500">{rest}</span>}
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[14px] shadow-sm select-none"
        style={{ background: "#EEF0FE", border: "1px solid #9A8FF0", color: "#5B4DD6", fontWeight: 700 }}>
        {icon && <span aria-hidden="true" style={{ fontWeight: 400 }}>{icon}</span>}
        <span><span style={{ marginRight: 1 }}>/</span>{name}</span>
      </span>
    </div>);
}

function UserBubble({ text, onRegisterFaq }) {
  const lp = React.useRef({ timer: null, x: 0, y: 0 });
  const clear = () => { if (lp.current.timer) { clearTimeout(lp.current.timer); lp.current.timer = null; } };
  const lpHandlers = {
    onContextMenu: (e) => e.preventDefault(),
    onDragStart: (e) => e.preventDefault(),
    onPointerDown: (e) => {
      if (!text) return;
      lp.current.x = e.clientX; lp.current.y = e.clientY;
      clear();
      lp.current.timer = setTimeout(() => {
        lp.current.timer = null;
        try { window.getSelection && window.getSelection().removeAllRanges(); } catch (err) {} // 선택 해제
        onRegisterFaq && onRegisterFaq(text);
      }, 500);
    },
    onPointerMove: (e) => { if (!lp.current.timer) return; if (Math.abs(e.clientX - lp.current.x) > 10 || Math.abs(e.clientY - lp.current.y) > 10) clear(); }, // 스크롤/드래그 → 취소
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-[14px] leading-relaxed whitespace-pre-line shadow-sm select-none"
        style={{ background: "#E0E2FA", color: "#2D2870", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", touchAction: "pan-y" }}
        {...lpHandlers}>
        {text}
      </div>
    </div>);

}

/* ── 채팅 말풍선 ──────────────────────────────────────── */
// [연결 실패 안내] 기술/네트워크 에러는 사용자에게 그대로 노출하지 않고 친근 문구로 치환한다.
//   친근 문구(금융친구 반말 톤, 빨강/경고 아님 — 일반 AI 말풍선 톤 유지).
const NET_ERROR_MSG = "앗, 지금 잠깐 연결이 안 돼 😅 조금 있다 다시 해볼래?";
// 데이터 구조 자체가 없는 텍스트 응답(OTHER/비관련 거절)용 친근 회피 문구. 오페리아의 사무적 answer 는 노출하지 않는다.
const OFFTOPIC_MSG = "앗, 그건 내가 도와주기 어려워 😅 결제·용돈·가맹점 관련해서 물어봐줄래?";
// 조회는 유효하나 데이터가 없는 경우(구조는 있음: 컬럼/plan). 헤더만 있는 빈 표·0 KPI 대신 친근 안내.
const EMPTY_MSG = "이 조건엔 사용 내역이 없어요 😊 다른 걸 물어봐줄래?";
// 보안/차단 응답(BLOCKED)용 문구. OTHER(무관)와 톤은 같되 별도 상수로 둔다(추후 문구 분화 여지).
const BLOCKED_MSG = "앗, 그건 도와주기 어려워 😅 결제·용돈·가맹점 관련해서 물어봐줄래?";
// 응답 봉투 상태 → 표시할 말풍선 텍스트(있으면 렌더 대신 이 텍스트). null = 명시 상태 없음 → 기존 추정 경로 유지(패리티).
//   OTHER→거절, BLOCKED→보안, HIL(hilRequired)→되묻기(hilPrompt), NO_DATA→없음(balance는 "정보 없어요").
function statusGateMsg(resp, kind, scope, q) {
  if (!resp) return null;
  if (resp.hilRequired) return sanitizeAnswer(resp.hilPrompt) || "조금만 더 자세히 알려줄래?";
  const s = resp.status == null ? "" : String(resp.status).toUpperCase();
  if (!s || s === "SUCCESS") return null;
  if (s === "OTHER") return OFFTOPIC_MSG;
  if (s === "BLOCKED") return BLOCKED_MSG;
  if (s === "NO_DATA") {
    if (kind === "balance") {
      const _fl = { voucher: "바우처(지원금)", charge: "용돈 충전금", point: "에듀포인트" }[scope && scope.focus];
      return _fl ? `아직 ${_fl} 정보가 없어요.` : "아직 정보가 없어요.";
    }
    return emptyMsgFor(q);
  }
  return null; // 미지의 status → 기존 경로 유지(안전)
}
// 빈결과 안내 문구를 질의 종류에 맞춰 분기(문구만; 판정 isEmptyResult·operia 게이팅은 불변).
//   날짜 표현(오늘/어제/이번 달 등)이 있으면 앞말로 반영. 금액/총액/얼마류→"0원" 톤, 내역/목록류·그 외→"없어요" 톤.
function _dayPrefix(q) {
  const t = String(q || "");
  if (/오늘/.test(t)) return "오늘은";
  if (/(어제|어저께)/.test(t)) return "어제는";
  if (/(그저께|그제)/.test(t)) return "그저께는";
  if (/(그끄제|그끄저께)/.test(t)) return "그끄제는";
  if (/(이번\s*달|이달|당월|금월)/.test(t)) return "이번 달엔";
  if (/(지난\s*달|저번\s*달|전월)/.test(t)) return "지난 달엔";
  if (/(이번\s*주|금주)/.test(t)) return "이번 주엔";
  if (/(지난\s*주|저번\s*주|전주)/.test(t)) return "지난 주엔";
  return "";
}
const _FOCUS_LABEL = { voucher: "바우처(지원금)", charge: "용돈 충전금", point: "에듀포인트" };
function emptyMsgFor(q) {
  const t = String(q || "");
  // Phase D: 잔액/포인트 질의는 "0원" 단정 금지(모름 ≠ 0). balanceIntent 로 감지해 "아직 …정보가 없어요" 톤.
  //   (cardIntent 제거 후에도 balance 무데이터 톤을 보존 — 카드 선택은 시그니처가 하지만 빈응답엔 컬럼이 없어 텍스트로 판단.)
  const _b = balanceIntent(t.replace(/\s/g, ""));
  if (_b) return _b.focus ? `아직 ${_FOCUS_LABEL[_b.focus] || ""} 정보가 없어요.` : "아직 정보가 없어요.";
  const pre = _dayPrefix(t);
  if (/(금액|총액|합계|얼마|총\s*금액|얼마나\s*썼)/.test(t)) {
    return pre ? `${pre} 쓴 금액이 없어! 0원이야 👍` : "쓴 금액이 없어! 0원이야 👍";
  }
  return pre ? `${pre} 사용 내역이 없어요 😊 다른 걸 물어봐줄래?` : EMPTY_MSG;
}
// 빈 결과 판정: totalCount 0 / tableData 없음·빈 배열 / 모든 행의 모든 값이 null·''(집계 null-1행 포함).
//   ※ OTHER(구조 자체 없음)는 호출부에서 먼저 OFFTOPIC 으로 처리하므로, 여기 도달하는 건 '구조는 있는데 값이 빈' 경우.
function isEmptyResult(resp) {
  if (!resp) return false;
  if (resp.totalCount === 0) return true;
  const rows = Array.isArray(resp.tableData) ? resp.tableData : [];
  if (!rows.length) return true;
  return rows.every((r) => (r && typeof r === "object")
    ? Object.values(r).every((v) => v == null || v === "")
    : (r == null || r === ""));
}
// ── 복합 스킬 요약문 조립 헬퍼(모듈 레벨, 상태 무관) ──
//   template(skill.summary)의 {기간}{총액}{최다사용처}{잔액} 을 슬롯 데이터에서 best-effort 추출.
//   빈 슬롯 절은 생략(SSOT §3). shape 이 비결정적/flaky 라 어느 단계든 실패하면 그 절만 빠지고 throw 0.
function _rowsOf(slot) { return slot && !slot.error && Array.isArray(slot.tableData) ? slot.tableData : []; }
function _num(v) { const n = Number(String(v == null ? "" : v).replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : null; }
// 금액 컬럼 '하나'를 골라 행 전체 합산(여러 금액 컬럼 동시합산 시 이중계상 방지). 없으면 첫 숫자 컬럼. 값 없으면 null.
function _sumAmount(rows) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0] || {});
  const amtKeys = keys.filter((k) => /amt|amount|금액|사용|총|합|price|pay|spend/i.test(k) && !/count|건수|_no$|_id$/i.test(k));
  const col = amtKeys[0] || keys.find((k) => rows.some((r) => _num(r[k]) != null));
  if (!col) return null;
  let sum = 0, hit = false;
  for (const r of rows) { const n = _num(r[col]); if (n != null) { sum += n; hit = true; } }
  return hit ? sum : null;
}
// 첫 행의 이름류 문자열(가맹점/상품명) — merchantBreakdown 은 desc 정렬 가정 → row[0] 이 최다사용처.
function _topLabel(rows) {
  if (!rows.length) return null;
  for (const [k, v] of Object.entries(rows[0] || {})) {
    if (typeof v === "string" && v.trim() && !/^\d/.test(v.trim()) && !/(sql|source)/i.test(k)) return v.trim();
  }
  return null;
}
// filters 는 문자열/배열/객체(중첩) 혼재 → primitive leaf 만 수집 후 '기간 냄새'(년월일/분기/최근/지난/YYYY-MM) 조각만.
//   객체를 그대로 join 하면 "[object Object]" 가 새므로 leaf-walk 로 방지. 잡값이면 "" → 기간 절 생략.
function _periodOf(slot) {
  const f = slot && !slot.error && slot.queryBreakdown && slot.queryBreakdown.filters;
  if (!f) return "";
  const leaves = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === "string") { const s = v.trim(); if (s) leaves.push(s); }
    else if (typeof v === "number") leaves.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(f);
  const picked = leaves.filter((s) => /[년월일]|분기|기간|최근|지난|이번|\d{4}[-./]\d{1,2}/.test(s));
  return picked.length ? [...new Set(picked)].join(" ").slice(0, 40) : "";
}
function _wonFmt(n) { return n == null ? null : Math.round(n).toLocaleString(); }
function buildCompositeSummary(cards, slots, period) {
  try {
    const at = (card) => slots[cards.findIndex((c) => c.card === card)];
    const total = _wonFmt(_sumAmount(_rowsOf(at("report"))));       // 총액 ← 월 슬롯
    const top = _topLabel(_rowsOf(at("merchantBreakdown")));         // 최다사용처 ← 사용처 슬롯(첫 merchantBreakdown)
    const bal = _wonFmt(_sumAmount(_rowsOf(at("balance"))));         // 잔액 ← balance 슬롯
    const 기간 = period || _periodOf(at("report")) || _periodOf(at("merchantBreakdown"));
    const parts = [];
    if (total) parts.push(`${기간 ? 기간 + " 동안 " : ""}${total}원 썼어요.`);
    if (top && bal) parts.push(`${top}에 제일 많이 썼고, 지금 ${bal}원 남았어요.`);
    else if (top) parts.push(`${top}에 제일 많이 썼어요.`);
    else if (bal) parts.push(`지금 ${bal}원 남았어요.`);
    return parts.join(" ");
  } catch (e) { return ""; }
}
// 판정: 비었거나 한글이 하나도 없으면(Failed to fetch, NetworkError, datasource error, timeout 등 영문/기술 문자열)
//   → 친근 문구로 치환. 백엔드가 준 '한글 사용자 안내'는 기술 메시지가 아니므로 그대로 노출(현행 유지).
function isTechErrorMessage(em) {
  const s = (em == null ? "" : String(em)).trim();
  if (!s) return true;            // 빈값 → 기술/미상 에러
  if (!/[가-힣]/.test(s)) return true; // 한글 없음 → 영문/기술 문자열
  return false;                   // 한글 포함 → 백엔드 사용자 안내(보존)
}

function Bubble({ msg, grade, onSend, onOpenContent, onCardQuery, onRegisterFaq }) {
  // 아바타 아래 SQL 칩이 보여줄 데이터. 기본은 메시지 응답(월별 등), 리포트 카드는 현재 탭으로 setChip 동기화.
  const [chip, setChip] = React.useState({ sql: msg.sql, source: msg.source, rawRows: msg.tableData });
  // 사용자 말풍선은 좌측 스와이프 → '등록' 버튼(UserBubble). long-press 등록/복사는 모두 제거됨.
  //   AI 말풍선은 아무 제스처도 부착하지 않음(무동작).
  if (msg.role === "user") {
    // 스킬 발동 메시지(skillId)는 칩으로, 일반 전송은 기존 말풍선으로.
    return msg.skillId ? <SkillChip text={msg.text} /> : <UserBubble text={msg.text} onRegisterFaq={onRegisterFaq} />;
  }
  const isReport = !!msg.report; // 복합 스킬(/자금보고서) 보고서 말풍선
  const isChart = !!msg.chartType; // 오페리아 데이터 메시지(ChartRenderer 렌더)
  const bigCard = isChart || isReport || ["spending", "report", "friendCompare", "nudgeCompare", "nudgeList", "merchantMap", "balance", "channel", "merchantBreakdown", "parentCard", "schoolCompare", "catSpend", "timePattern", "quiz", "recommend"].includes(msg.card);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2 items-start">
        <AiAvatar />
        <div className={bigCard ? "flex-1 min-w-0" : "max-w-[85%]"}>
          {/* 카드 응답(isChart)은 카드 섹션만 — 카드 위 answer 텍스트 버블 숨김. 텍스트만/에러/빈결과(카드 없음)는 그대로 표시. */}
          {msg.text && !isChart &&
          <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl rounded-tl-md text-[14px] text-gray-800 leading-relaxed whitespace-pre-line shadow-sm" style={{ WebkitTouchCallout: "none" }}>
            {msg.text}
          </div>
          }
          {/* [다시 시도] 연결 실패 안내 말풍선에만 노출 — 탭하면 같은 질문 재전송(onSend). 일반 톤(빨강/경고 아님). */}
          {msg.retry &&
          <button type="button" onClick={() => onSend && onSend(msg.retry)}
          className="mt-1.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-[#F3F4F6] text-gray-700 active:bg-violet-50 active:text-violet-600 active:scale-95 transition">
            <span className="text-[13px]">↻</span>다시 시도
          </button>
          }
          {isReport && <CompositeReport report={msg.report} />}
          {isChart && <ChartRenderer intent={msg.intent} sql={msg.sql} source={msg.source} tableData={msg.tableData} columnMetadata={msg.columnMetadata} reportPlan={msg.reportPlan} summaryStats={msg.summaryStats} scope={msg.scope} appliedPeriod={msg.appliedPeriod} queryBreakdown={msg.queryBreakdown} queryInfo={msg.queryInfo} forceTable={msg.chartType === "table"} onCardQuery={onCardQuery} onActiveSql={setChip} />}
        </div>
      </div>
      {/* §9 SQL 칩 — 카드 밖, 어시스턴트 아바타 아래(메시지 좌측 영역). 리포트 카드는 현재 탭(월/일) SQL로 setChip 동기화 */}
      {isChart && SHOW_SQL && <SqlChip sql={chip.sql} source={chip.source} rawRows={chip.rawRows} queryInfo={msg.queryInfo} />}
    </div>);

}

// 로딩 말풍선 문구 풀 — 질의 유형별로 순환 노출(점 애니메이션과 병기).
const LOADING_POOLS = {
  "현재 사용 가능 금액": ["지갑을 살짝 열어보는 중이에요", "쓸 수 있는 돈이 얼마인지 세는 중!", "지원금·용돈·카드를 따로따로 확인하고 있어요", "동전을 하나씩 세어보는 중이에요", "잔액을 깔끔하게 정리하는 중이에요"],
  "월별 사용 내역": ["이번 달 가계부를 펼치는 중이에요", "달력을 넘기며 기록을 모으고 있어요", "한 달 동안 쓴 내역을 줄 세우는 중!", "영수증을 차곡차곡 모으고 있어요", "월별 흐름을 그려보는 중이에요"],
  "근처 가맹점": ["주변 지도를 펼쳐보는 중이에요", "근처에 쓸 만한 곳을 찾고 있어요", "발도장 찍을 가게를 둘러보는 중!", "가까운 가맹점에 핀을 꽂는 중이에요", "걸어갈 만한 거리부터 살펴보는 중!"],
  "사용처별 내역": ["어디에 제일 많이 썼나 살펴보는 중이에요", "사용처를 순위대로 줄 세우는 중!", "가게별로 쓴 돈을 모으고 있어요", "영수증을 가게별로 분류하는 중!", "소비 순위표를 그려보는 중이에요"],
  "기타": ["열심히 생각하는 중이에요", "잠깐만요, 답을 정리하고 있어요", "데이터를 살펴보는 중이에요", "거의 다 됐어요!"],
};

// intent → 풀 키. 미매칭(친구/조르기/채널/부모카드/학교/잡담/null)은 모두 '기타'.
function poolKeyForIntent(intent) {
  switch (intent) {
    case "balance": return "현재 사용 가능 금액";
    case "report": return "월별 사용 내역";
    case "merchantMap": return "근처 가맹점";
    case "merchantBreakdown":
    case "catSpend": return "사용처별 내역";
    default: return "기타";
  }
}

// 로딩 여우 러너 단계·문구 config(★편집 지점★). tiredAt 전=run, 이후=tired, cheerAt 이후=cheer(=tired 모션+응원 문구).
const FOX_LOADER_CONFIG = { tiredAt: 5000, cheerAt: 10000, cheerMessages: ["조금만 더!", "거의 다 왔어요!"] };

// 세미-업라이트로 달리는 여우(인라인 SVG). 앞발 펌핑·뒷다리 러닝·꼬리 스윙·발밑 먼지. 모션은 index.css(.fox--run/.fox--tired).
//   제자리 유지(이동 X), 이모지·쓰러짐 없음. cheer 는 tired 모션 재사용.
function FoxRunner({ stage }) {
  const cls = "fox " + (stage === "run" ? "fox--run" : "fox--tired"); // cheer→tired 모션
  return (
    <svg
      className={cls}
      width="50"
      height="46"
      viewBox="0 0 60 56"
      fill="none"
      aria-hidden="true"
      style={{
        // 여우 로더 속도: .env.local(VITE_FOX_*)로 조정, 없으면 기본(가속). CSS time 형식('0.16s').
        "--fox-run-dur": import.meta.env.VITE_FOX_RUN_DUR || "0.16s",
        "--fox-walk-dur": import.meta.env.VITE_FOX_WALK_DUR || "0.5s",
        "--fox-launch-dur": import.meta.env.VITE_FOX_LAUNCH_DUR || "0.55s",
        "--fox-reveal-dur": import.meta.env.VITE_FOX_REVEAL_DUR || "0.6s",
      }}
    >
      {/* 먼지: 시작 버스트(1회, .fox-burst) + run 반복(.fox-dust). 발밑(y≈50)에 싱크. */}
      <g className="fox-dust-layer">
        <circle className="fox-burst" cx="26" cy="50" r="4.5" fill="#D9C9B0" />
        <circle className="fox-burst fox-burst-b" cx="20" cy="51" r="3.5" fill="#E7DAC4" />
        <circle className="fox-dust fox-dust-1" cx="24" cy="50" r="2.6" fill="#DCCCB2" />
        <circle className="fox-dust fox-dust-2" cx="18" cy="51" r="2.1" fill="#CDB795" />
        <circle className="fox-dust fox-dust-3" cx="30" cy="51" r="2.3" fill="#E7DAC4" />
        <circle className="fox-dust fox-dust-4" cx="27" cy="51.5" r="2.7" fill="#DCCCB2" />
        <circle className="fox-dust fox-dust-5" cx="21" cy="50" r="3" fill="#E7DAC4" />
      </g>
      {/* 몸통 그룹: 러닝 bob + 미세 translateX(±2~3px) */}
      <g className="fox-body">
        {/* 꼬리(뒤) */}
        <g className="fox-tail">
          <path d="M25 30 C10 29 5 46 15 49 C13 40 20 36 27 38 Z" fill="#E8622E" />
          <path d="M14 47 C10 46 9 50 13 51 C12 48 13 47 16 48 Z" fill="#FBEEE3" />
        </g>
        {/* 뒷다리 2(러닝, 교대) */}
        <rect className="fox-leg fox-leg-l" x="23" y="35" width="5.4" height="16" rx="2.7" fill="#C6501F" />
        <rect className="fox-leg fox-leg-r" x="31" y="35" width="5.4" height="16" rx="2.7" fill="#EE6C3A" />
        {/* 몸통(세미-업라이트, 앞으로 살짝 기움) */}
        <path d="M24 16 C24 11 40 11 39.5 17 L37.5 35 C37.5 40 25 40 25 35 Z" fill="#F47A45" />
        {/* 배(흰색) */}
        <path d="M29 18 C29 15.5 36 16 35.5 19 L34.5 34 C34.5 37 30 37 29.5 34 Z" fill="#FCEFE4" />
        {/* 앞발 2(위로 들어 앞뒤 펌핑, 교대) */}
        <rect className="fox-arm fox-arm-l" x="27" y="17" width="4.6" height="13" rx="2.3" fill="#C6501F" />
        <rect className="fox-arm fox-arm-r" x="32" y="17" width="4.6" height="13" rx="2.3" fill="#EE6C3A" />
        {/* 머리(오른쪽 향함) */}
        <g className="fox-head">
          <path d="M26 3 L31 11 L22 10 Z" fill="#E8622E" />
          <path d="M41 3 L39 11 L34 8 Z" fill="#E8622E" />
          <circle cx="33" cy="10" r="9" fill="#F47A45" />
          <path d="M34 9 L46 11 L34 14 Z" fill="#FCEFE4" />
          <circle cx="45" cy="11" r="1.7" fill="#2B2B2B" />
          <circle cx="36" cy="9" r="1.5" fill="#2B2B2B" />
        </g>
      </g>
      {/* 출발 먼지구름(1회): fox-body '뒤 순서=위'에 그려 다리를 순간 가림 → 걷히며 러닝 드러남(만화식 대시). */}
      <g className="fox-launch">
        <circle cx="27" cy="47" r="12" fill="#E7DAC4" />
        <circle cx="19" cy="49" r="8.5" fill="#DCCCB2" />
        <circle cx="34" cy="49" r="8" fill="#D9C9B0" />
      </g>
    </svg>
  );
}

function Typing({ intent, skill }) {
  // skill(복합 스킬 label) 있으면 스킬 전용 문구, 없으면 기존 intent별 LOADING_POOLS.
  const runPool = skill
    ? [`${skill} 만드는 중이에요`, "여러 화면을 한 장으로 모으는 중!", "잔액·사용처·상품을 정리하는 중이에요", "거의 다 됐어요!"]
    : (LOADING_POOLS[poolKeyForIntent(intent)] || LOADING_POOLS["기타"]);
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // 마운트/intent·skill 변경 시 리셋 후, 경과시간(단계 판정)·문구순환 두 타이머. 언마운트 시 clear. (달리기 리듬은 CSS)
  useEffect(() => {
    setIdx(0); setElapsed(0);
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Date.now() - start), 250);
    const msg = setInterval(() => setIdx((i) => i + 1), 1800);
    return () => { clearInterval(tick); clearInterval(msg); };
  }, [intent, skill]);
  const stage = elapsed >= FOX_LOADER_CONFIG.cheerAt ? "cheer"
    : elapsed >= FOX_LOADER_CONFIG.tiredAt ? "tired" : "run";
  const pool = stage === "cheer" ? FOX_LOADER_CONFIG.cheerMessages : runPool;
  const msg = pool[idx % pool.length];
  return (
    <div className="flex gap-2 items-start edupay-fade">
      <AiAvatar />
      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm flex gap-2.5 items-center">
        {FOX_LOADER_ENABLED
          ? <FoxRunner stage={stage} />
          : /* 기본 폴백: 점 3개(여우 도입 전 마크업). 문구 순환은 아래 공통. */
            <span className="flex gap-1 items-center" aria-hidden="true">
              <span className="edupay-dot w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              <span className="edupay-dot w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: "0.15s" }}></span>
              <span className="edupay-dot w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: "0.3s" }}></span>
            </span>}
        <span className="text-[13px] text-gray-500 leading-snug">{msg}</span>
      </div>
    </div>);

}

/* ── 자주 쓰는 질문 가로 스크롤 바 ──────────────────── */
function FavoritesBar({ onPick }) {
  return (
    <div className="shrink-0 bg-white border-b border-gray-100 py-2.5 overflow-x-auto edupay-noscroll" ref={(el) => dragScroll && dragScroll(el)}>
      <div className="flex gap-2 w-max px-4">
        {SUGGESTIONS.map((s, i) =>
        <button key={i} onClick={() => onPick(s.text)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap bg-[#F3F4F6] text-gray-700 active:bg-violet-50 active:text-violet-600 active:scale-95 transition">
            <span className="text-[14px]">{s.icon}</span>
            {s.label}
          </button>
        )}
      </div>
    </div>);

}

/* ── 자주 묻는 질문(FAQ) 항목 1행 — 탭=질문 전송, 좌측 가로 스와이프=삭제 노출 ──── */
// WebView 네이티브 long-press 충돌 회피: 길게 누르기 의존 없이 '가로 스와이프'만으로 삭제.
// 열린 행은 App(openFaqKey) 단일 소스로 관리 → isOpen/onOpen/onClose 컨트롤드.
// 포인터 기반 drag 상태기계: 가로 이동이 세로보다 우세할 때만 스와이프 처리(세로 스크롤 보존),
//   threshold(REVEAL=72px 노출폭, OPEN_TH=64px 스냅 기준) 넘기면 '열림' 스냅, 미만은 닫힘.
const FAQ_REVEAL = 72; // 빨간 삭제 버튼 노출 폭(px)
const FAQ_OPEN_TH = 64; // 이 이상 끌면 열림 스냅
function FaqRow({ item, isLast, onPick, onRequestDelete, isOpen, onOpen, onClose }) {
  // 가로 스와이프 로직은 공용 훅(useSwipeReveal)로 일원화 — 말풍선 등록과 동일 패턴/iOS 견고화 공유.
  const { dx, bodyRef, handlers, dragRef } = useSwipeReveal({ reveal: FAQ_REVEAL, openTh: FAQ_OPEN_TH, isOpen, onOpen, onClose });
  const onClick = () => {
    // 드래그(가로) 직후 click 억제, 열림 상태면 닫기만, 닫힘이면 질문 전송.
    if (dragRef.current.decided && dragRef.current.horiz) return;
    if (isOpen) { onClose(); return; }
    onPick(item.text);
  };

  return (
    <div className={"relative overflow-hidden " + (!isLast ? "border-b border-gray-100/80" : "")}>
      {/* 우측 빨간 삭제 버튼(행 아래에 깔림 → 행이 왼쪽으로 밀리며 드러남) */}
      <button
        onClick={() => onRequestDelete(item)}
        aria-label={`"${item.text}" 질문 삭제`}
        className="absolute top-0 right-0 h-full flex items-center justify-center text-white text-[13px] font-bold active:opacity-80 transition"
        style={{ width: FAQ_REVEAL, background: "#EF4444" }}>
        삭제
      </button>
      {/* 슬라이드되는 행 본체(흰 배경으로 삭제 버튼 가림) */}
      <button
        ref={bodyRef}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
        {...handlers}
        className="relative w-full flex items-center gap-2.5 px-3 py-[11px] bg-white active:bg-violet-50 transition text-left select-none"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragRef.current.active ? "none" : "transform 0.22s ease",
          touchAction: "pan-y",
          WebkitTouchCallout: "none" }}>
        <span className="text-[14px] shrink-0">{item.icon}</span>
        <span className="flex-1 text-[13.5px] font-medium text-gray-700">{item.text}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d="M9 6l6 6-6 6" stroke="#C4C4CC" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>);

}

/* ── 즐겨찾기 팝업 (입력창 왼쪽 ★ 버튼으로 토글) ────────────────────
   즐겨찾기(사용자 등록분)만 노출. 최신 등록 최상단(prepend된 favItems 그대로).
   항목 탭 → 질문 전송 + 팝업 닫힘. 스와이프 삭제는 FaqRow 재사용(핵심질의 패널과 동일 패턴).
   비었을 때 안내문 노출. 배경(딤) 탭 → 닫힘. */
function FavoritesPopup({ items, onPick, onDelete, openKey, setOpenKey, onClose }) {
  // 뒤 배경: 블러·딤 없이 완전 투명(뒤 화면 선명). 오버레이(inset-0)는 '밖 탭 = 닫힘'만 담당.
  return (
    <div className="absolute inset-0 z-40" onClick={onClose}>
      {/* 시트: 입력바 위에 뜨도록 하단 여백(mb) 확보. 딤 대신 테두리+은은한 그림자로 자연스럽게 도드라짐. */}
      <div className="absolute left-0 right-0 bottom-0 edupay-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="mx-3 mb-[74px] bg-white rounded-2xl overflow-hidden border border-gray-200/80 transition"
        style={{ boxShadow: "0 12px 32px -10px rgba(45,40,112,0.22), 0 2px 8px -2px rgba(45,40,112,0.10)" }}>
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
            <span className="text-[13px] font-bold text-gray-700">⭐ 즐겨찾기</span>
            <button onClick={onClose} aria-label="닫기"
            className="w-6 h-6 flex items-center justify-center text-gray-400 text-[20px] leading-none active:opacity-60">×</button>
          </div>
          <div className="max-h-[46vh] overflow-y-auto edupay-noscroll py-1">
            {items.length === 0 ?
            <div className="px-6 py-9 text-center">
              <span className="text-[12.5px] text-gray-400 leading-relaxed">질문을 꾹 눌러<br />즐겨찾기에 추가해봐</span>
            </div> :

            items.map((s, i) =>
            <FaqRow key={s.text} item={s} isLast={i === items.length - 1} onPick={onPick} onRequestDelete={onDelete}
              isOpen={openKey === s.text}
              onOpen={() => setOpenKey(s.text)}
              onClose={() => setOpenKey((k) => (k === s.text ? null : k))} />
            )}
          </div>
        </div>
      </div>
    </div>);

}

/* ── 메인 앱 ──────────────────────────────────────────── */
function App() {
  const [grade, setGrade] = useState("중학");
  const [entered, setEntered] = useState(WEBVIEW); // webview면 인트로 건너뛰고 바로 진입
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const slashRef = useRef(null); // 슬래시 스킬 런처 드롭다운: composer onKeyDown이 handleKey로 위임
  const [inputFocused, setInputFocused] = useState(false); // 폴백용(visualViewport 미지원). 입력 포커스 시 FAQ 패널 숨김
  const [keyboardOpen, setKeyboardOpen] = useState(false);  // 키보드 가시성(visualViewport 기반) → FAQ 패널 숨김 트리거
  // 키보드 가시성 판정: visualViewport.height 가 기준(관측 최대) 대비 충분히 작으면 keyboardOpen=true.
  //   inputFocused(focus/blur) 대신 사용 → AOS '뒤로가기'로 키보드만 닫혀도(blur 없이) 패널 복귀. 미지원이면 폴백(inputFocused).
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return; // 폴백: inputFocused 사용
    let base = vv.height, raf = 0;
    const onChange = () => {
      if (raf) return;                                  // rAF 디바운스(과호출 방지)
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (vv.height > base) base = vv.height;          // 기준 = 관측 최대 높이(주소창 변화 등 흡수)
        setKeyboardOpen(base - vv.height > 100 || vv.height < base * 0.85);
      });
    };
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    onChange();
    return () => { vv.removeEventListener("resize", onChange); vv.removeEventListener("scroll", onChange); if (raf) cancelAnimationFrame(raf); };
  }, []);
  // 패널 숨김 = (visualViewport 지원 시) 키보드 열림 / (미지원 폴백) 입력 포커스
  const faqHidden = (typeof window !== "undefined" && window.visualViewport) ? keyboardOpen : inputFocused;
  const [faqOpen, setFaqOpen] = useState(true); // (레거시) 키보드 가시성 계산에만 관여, 하단 패널 제거됨
  const [favOpen, setFavOpen] = useState(false); // 즐겨찾기 팝업 열림 상태 — 입력창 왼쪽 ★ 버튼으로 토글
  // [진입 랜딩] 인사 표시용 이름 — session.getUserName() 사용.
  //   앱팀이 getEduPayUser 응답에 userName 을 실어주면 이름, 아직 안 실어주면 userId 로 폴백(= 기존 동작).
  //   배너용 noUserId 는 '식별자' 유무 판단이라 계속 getUserId() 기준.
  const [userName, setUserName] = useState(null);
  // 웹뷰에서 브릿지·URL·env 폴백 다 실패해 ID를 못 받으면 상단 안내 배너 노출용. 해석 후에만 세팅(초기 null 플래시 방지).
  const [noUserId, setNoUserId] = useState(false);
  useEffect(() => {
    let alive = true;
    getUserName().then((n) => { if (alive) setUserName(n || null); }).catch(() => {});
    getUserId().then((u) => { if (alive) setNoUserId(u == null); }).catch(() => { if (alive) setNoUserId(true); });
    return () => { alive = false; };
  }, []);
  const [typing, setTyping] = useState(false);
  const [typingIntent, setTypingIntent] = useState(null); // 로딩 말풍선 문구 풀 선택용(send 에서 cardIntent 결과 저장)
  const [typingSkill, setTypingSkill] = useState(null); // 복합 스킬(runComposite) 실행 중 스킬 전용 로딩 문구용. 일반 send는 null.
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("금융친구");
  const [convos, setConvos] = useState(() => {
    try {return JSON.parse(localStorage.getItem("edupay_convos") || "[]");} catch (e) {return [];}
  });
  const [activeId, setActiveId] = useState(null);
  const [showHistory, setShowHistory] = useState(false); // 대화기록: 헤더 🕘 → HistoryDrawer(＋새 대화·지난 대화·선택·삭제)로 일원화
  // AI(Claude) 답변 — VITE_AI_ENABLED=true 일 때만 기능/토글 노출. 런타임 토글은 localStorage 유지
  const aiFeature = isAiFeatureOn();
  const [aiEnabled, setAiEnabled] = useState(() => getAiEnabled());
  const toggleAi = (on) => { persistAiEnabled(on); setAiEnabled(on); };
  // [개발용] 응답 경로 디버그 토스트 (API / 로컬). dev 모드에서만 표시
  const [apiToast, setApiToast] = useState(null);
  const showApiToast = (msg, kind = "info") => {
    if (!SHOW_SOURCE_BADGE) return;
    const id = Date.now();
    setApiToast({ msg, kind, id });
    setTimeout(() => setApiToast((cur) => (cur && cur.id === id ? null : cur)), 2600);
  };
  // [FAQ 등록 피드백] 사용자 말풍선 long-press 등록 결과 토스트 — prod 포함 노출(showApiToast는 dev 전용이라 부적합).
  //   복사 기능 제거로 비는 기존 prod 토스트(구 copyToast) 자리를 메시지형으로 재사용. 1.6초.
  const [faqToast, setFaqToast] = useState(null);
  const faqToastTimerRef = useRef(null);
  const showFaqToast = (m) => {
    setFaqToast(m);
    if (faqToastTimerRef.current) clearTimeout(faqToastTimerRef.current);
    faqToastTimerRef.current = setTimeout(() => setFaqToast(null), 1600);
  };
  // [즐겨찾기] 사용자 등록 질문 — DB 없이 localStorage("edupay_favorites_v1") 영속(웹뷰용 데모). 형식: [{icon,text}].
  //   초기값: 키 존재 시 저장본 그대로(빈 배열도 '다 지운 상태'로 존중 → 재시드 금지),
  //           키 없음(신규)일 때만 핵심질의 4개(QUICK_QUERIES 순서)로 시드. 시드/랜딩 모두 같은 QUICK_QUERIES 참조.
  //   정렬: 최신 등록이 배열 앞(prepend). 구 키(edupay_faq_v1: 핵심질의 시드본)는 더는 사용하지 않음.
  const [favItems, setFavItems] = useState(() => {
    let raw = null;
    try { raw = localStorage.getItem(FAV_KEY); } catch (e) {}
    if (raw != null) {
      // 키 존재 → 저장값 사용(재시드 금지). 손상/비배열이면 빈 배열.
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return arr
            .filter((x) => x && typeof x.text === "string" && x.text.trim())
            .map((x) => ({ icon: x.icon || "💬", text: String(x.text).trim() }));
        }
      } catch (e) {}
      return [];
    }
    // 키 없음(신규) → 핵심질의 4개로 시드(QUICK_QUERIES 순서 그대로)
    return QUICK_QUERIES.map((x) => ({ ...x }));
  });
  // favItems 변경 시마다 저장(프라이빗 모드/차단 대비 try/catch).
  useEffect(() => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favItems)); } catch (e) {}
  }, [favItems]);
  // [즐겨찾기] 스와이프로 '열린'(삭제 버튼 노출) 행 단일 소스. 행 key=item.text. null=모두 닫힘.
  const [openFaqKey, setOpenFaqKey] = useState(null);
  // 추가: trim·빈값/중복(text 동일)·길이(≤40) 검증. 성공 시 true 반환. 최신 등록이 맨 위(prepend).
  const addFav = (text) => {
    const t = (text || "").trim().slice(0, 40);
    if (!t) return false;
    if (favItems.some((x) => x.text === t)) return false;
    setFavItems((prev) => [{ icon: "💬", text: t }, ...prev]);
    return true;
  };
  // 삭제(가로 스와이프 → 빨간 '삭제' 버튼 탭): 2단계 제스처가 곧 확인이므로 window.confirm 없이 즉시 제거.
  //   setFavItems → favItems useEffect 가 localStorage("edupay_favorites_v1") 자동 갱신. 열린 키도 초기화.
  const deleteFav = (item) => {
    if (!item || !item.text) return;
    setFavItems((prev) => prev.filter((x) => x.text !== item.text));
    setOpenFaqKey((k) => (k === item.text ? null : k));
  };
  // 사용자(role==='user') 말풍선 long-press → 등록 확인창(faqConfirm) 표시. '추가' 선택 시에만 register 실행(오등록 방지).
  const [faqConfirm, setFaqConfirm] = useState(null); // 확인 대기 텍스트(string) | null
  const askRegisterFaq = (text) => { const t = (text || "").trim(); if (t) setFaqConfirm(t); };
  // 확인창 '추가' 확정 시: addFav(trim·중복·40자) → 성공/중복 토스트.
  const registerFaqFromBubble = (text) => {
    const t = (text || "").trim();
    if (!t) return;
    const ok = addFav(t);
    showFaqToast(ok ? "즐겨찾기에 추가했어" : "이미 즐겨찾기에 있어");
  };

  const scrollRef = useRef(null);
  const frameRef = useRef(null);
  const started = messages.length > 0;
  const [skillScrollId, setSkillScrollId] = useState(null); // 스킬(복합) 발동 시: 보고서 상단(해당 칩)을 화면 위로 스크롤. null이면 기존 맨-아래.

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 스킬 리포트는 카드 여러 장이라 맨 아래로 가면 끝에 떨어짐 → 해당 칩 상단을 화면 위(헤더 밑)로. 일반 메시지는 맨 아래.
    if (skillScrollId != null) {
      const node = el.querySelector('[data-mid="' + skillScrollId + '"]');
      if (node) { el.scrollTop += node.getBoundingClientRect().top - el.getBoundingClientRect().top - 8; return; }
    }
    el.scrollTop = el.scrollHeight;
  }, [messages, typing, skillScrollId]);

  // [빈 랜딩 키보드 고착] 입력 포커스 시 브라우저가 focus를 화면에 넣으려고 overflow-hidden 프레임에
  //   scrollTop을 주입한다(재현 관측: 프레임 scrollTop 117). AOS는 키보드 닫힘 후 dvh 복원이 늦거나
  //   콘텐츠가 근소하게 넘쳐 이 scrollTop이 남아 그룹이 바닥에 고착된다. 키보드가 닫히면(!started) 리셋.
  //   started(대화중) 하단 도킹은 영향 없음(!started 가드). rAF로 close 리플로우 뒤에 실행.
  useEffect(() => {
    if (keyboardOpen || started) return;
    const id = requestAnimationFrame(() => {
      if (frameRef.current) frameRef.current.scrollTop = 0;
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [keyboardOpen, started]);

  // [웹뷰] 채팅 스크롤 중이면 우상단 🕘 버튼 페이드아웃(말풍선 가림 방지). 마지막 스크롤 후 hideDelayMs 지나면 복귀.
  // passive + rAF 스로틀(프레임당 1회). setState는 값이 true로 동일하면 React가 리렌더 생략 → 스크롤 성능 무영향.
  const [historyHidden, setHistoryHidden] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0, timer = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setHistoryHidden(true);
        clearTimeout(timer);
        timer = setTimeout(() => setHistoryHidden(false), HISTORY_BTN.hideDelayMs);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  // [웹뷰 대화버튼 드래그] 기본=최상단 좌측(safe-area). 드래그로 이동(포인터=마우스+터치), 뷰포트 clamp.
  //   이동 6px 미만=탭(대화기록 열기), 이상=드래그(onClick 억제). 위치는 세션 메모리만(localStorage 저장 안 함).
  //   드래그 중엔 setState 대신 transform 직접 적용(rAF 스로틀)으로 부드럽게 추종, 릴리즈 시 최종 위치만 커밋.
  const [histPos, setHistPos] = useState(null); // {left,top}px | null(기본 좌상단)
  const histBtnRef = useRef(null);
  const histDrag = useRef({ active: false, moved: false, raf: null });
  const HIST_M = 12; // 뷰포트 여백
  const onHistDown = (e) => {
    const btn = e.currentTarget;
    const pr = btn.getBoundingClientRect();
    const par = btn.offsetParent ? btn.offsetParent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    histDrag.current = { active: true, moved: false, raf: null, startX: e.clientX, startY: e.clientY,
      baseLeft: pr.left - par.left, baseTop: pr.top - par.top, parentW: par.width, parentH: par.height,
      pinW: pr.width, pinH: pr.height };
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onHistMove = (e) => {
    const d = histDrag.current; if (!d.active) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 6) return; // 임계값 미만 → 탭으로 간주
    d.moved = true;
    d.lastLeft = Math.max(HIST_M, Math.min(d.baseLeft + dx, d.parentW - d.pinW - HIST_M)); // 뷰포트 clamp
    d.lastTop = Math.max(HIST_M, Math.min(d.baseTop + dy, d.parentH - d.pinH - HIST_M));
    d.tx = d.lastLeft - d.baseLeft; d.ty = d.lastTop - d.baseTop;
    if (d.raf == null) d.raf = requestAnimationFrame(() => {
      d.raf = null;
      const node = histBtnRef.current;
      if (node) node.style.transform = `translate3d(${d.tx}px, ${d.ty}px, 0)`;
    });
  };
  const onHistUp = () => {
    const d = histDrag.current; if (!d.active) return;
    d.active = false;
    if (d.raf != null) { cancelAnimationFrame(d.raf); d.raf = null; }
    const node = histBtnRef.current;
    if (node) node.style.transform = ""; // transform 제거, 위치는 아래 state(left/top)가 소유
    if (d.moved) setHistPos({ left: d.lastLeft, top: d.lastTop }); // 드래그 → clamp된 최종 위치 커밋
  };
  const onHistClick = () => {
    if (histDrag.current.moved) { histDrag.current.moved = false; return; } // 드래그였으면 탭(대화기록) 억제
    setShowHistory(true);
  };
  useEffect(() => () => { if (histDrag.current.raf != null) cancelAnimationFrame(histDrag.current.raf); }, []); // 언마운트 시 rAF 정리

  // 대화가 시작되면(메시지 존재) FAQ 패널 자동 접힘 — 채팅 가림 방지(최초 빈 화면만 펼침)
  useEffect(() => { if (started) setFaqOpen(false); }, [started]);

  // [WebView] URL ?q= 초기 질문 자동 전송 (네이티브 카드별 진입). StrictMode 중복 방지 위해 1회 가드.
  const qFired = useRef(false);
  useEffect(() => {
    if (qFired.current) return;
    qFired.current = true;
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && q.trim()) { setEntered(true); send(decodeURIComponent(q)); }
    } catch (e) {}
  }, []);

  /* 대화 기록 영속화 */
  useEffect(() => {
    try {localStorage.setItem("edupay_convos", JSON.stringify(convos));} catch (e) {}
  }, [convos]);

  /* 현재 대화를 기록에 자동 저장(upsert) */
  useEffect(() => {
    if (!started) return;
    let id = activeId;
    if (!id) {id = "c" + Date.now();setActiveId(id);}
    const firstUser = messages.find((m) => m.role === "user");
    const title = (firstUser ? firstUser.text : "새 대화").slice(0, 40);
    setConvos((prev) => {
      const others = prev.filter((c) => c.id !== id);
      return [{ id, title, updatedAt: Date.now(), messages }, ...others];
    });
  }, [messages]);

  // 대화 세대(epoch): 대화 리셋/전환 시 ++. 진행 중 send()가 이 값을 캡처해, await 후 값이 바뀌었으면
  //   (=그 사이 새 대화/전환) stale 응답·로딩을 새 대화에 반영하지 않고 무시한다(레이스 가드).
  const convoEpochRef = useRef(0);
  function resetConvoEpoch() { convoEpochRef.current++; setTyping(false); setTypingIntent(null); setTypingSkill(null); } // 진행 중 요청 무효화 + 로딩 클리어
  function newChat() {
    resetConvoEpoch();
    resetOperiaSession(); // 새 대화 = 새 세션(다음 질문에서 lazy 생성)
    setMessages([]);
    setActiveId(null);
    setShowHistory(false);
    setEntered(true);
  }
  function selectConvo(c) {
    resetConvoEpoch();
    resetOperiaSession(); // 다른 대화 로드 → 그 대화용 세션을 새로 lazy 생성
    setMessages(c.messages);
    setActiveId(c.id);
    setShowHistory(false);
    setEntered(true);
  }
  function deleteConvo(id) {
    setConvos((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {resetConvoEpoch();resetOperiaSession();setMessages([]);setActiveId(null);}
  }

  // [웹뷰 재진입 리셋] 네이티브가 웹뷰를 살려둔 채 재사용 → 숨겨졌다 다시 보일 때(뒤로가기 후 메뉴 재진입)
  //   대화중이면 newChat()으로 초기화면(랜딩) 리셋. 직전 대화는 자동저장 useEffect로 이미 히스토리에 남아 유실 없음.
  //   startedRef 로 최신 대화 상태를 읽어(리스너 1회 등록) stale closure 회피. WEBVIEW에서만 동작.
  const startedRef = useRef(started);
  startedRef.current = started;
  const hiddenAtRef = useRef(0); // 숨겨진 시각(ms). 임계값 이상 숨겨졌다 돌아올 때만 재진입 리셋.
  const REENTRY_RESET_MS = Number(import.meta.env.VITE_REENTRY_RESET_MS) || 10000; // 이 시간(ms) 이상 숨겨졌다 돌아오면 재진입=리셋. 미설정 시 10초. 짧은 화면 꺼짐은 유지
  useEffect(() => {
    if (!WEBVIEW) return;
    const resetToLanding = () => {
      // 재진입 시 started 무관하게 열려 있던 모든 오버레이를 먼저 닫는다(랜딩에서 ★ 즐겨찾기 팝업만 연 경우 포함).
      setFavOpen(false); setShowHistory(false);
      setFaqConfirm(null); setOpenFaqKey(null);
      if (!startedRef.current) return;                  // 대화 없으면 종료(오버레이는 이미 닫힘)
      newChat();                                        // 대화중이면 랜딩 리셋(직전 대화는 자동저장됨)
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { hiddenAtRef.current = Date.now(); return; }
      if (document.visibilityState === "visible") {
        const t = hiddenAtRef.current;
        hiddenAtRef.current = 0;
        if (t && Date.now() - t >= REENTRY_RESET_MS) resetToLanding(); // 짧은 화면 꺼짐(<임계값)은 대화 유지
      }
    };
    const onPageShow = (e) => { if (e && e.persisted) resetToLanding(); }; // bfcache 복귀 대비
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const CARD_KINDS = ["spending", "report", "recommend", "quiz"];

  // 질의 → 날짜 추출 (오늘/어제/그저께/N일/M월 N일)
  // Phase D: cardIntent + 기간분류(parseDay·explicitRange·periodScope) 제거 — 질의는 operia 로 직행(카드는 시그니처가 결정).

  function parseAI(raw) {
    let t = (raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const tryParse = (s) => {try {return JSON.parse(s);} catch (e) {return null;}};
    let o = tryParse(t);
    if (!o) {const m = t.match(/\{[\s\S]*\}/);if (m) o = tryParse(m[0]);}
    if (o && typeof o === "object") {
      const text = String(o.reply || o.text || "").trim();
      return { text: text || t, card: CARD_KINDS.includes(o.card) ? o.card : null, action: o.action || null };
    }
    return { text: t, card: null, action: null };
  }

  async function askAI(q, history) {
    const msgs = [
    { role: "user", content: DATA.buildSystemPrompt(grade) },
    { role: "assistant", content: "응, 준비됐어! 소비랑 용돈에 대해 무엇이든 물어봐 😊" },
    ...history.filter((m) => m.text).map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
    { role: "user", content: q }];

    // 1) 실제 서비스: 설정된 백엔드 엔드포인트로 호출 (window.FINFRIEND_AI_ENDPOINT)
    const endpoint = typeof window !== "undefined" && window.FINFRIEND_AI_ENDPOINT || "";
    if (endpoint) {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, grade })
      });
      if (!resp.ok) throw new Error("AI 서버 오류: " + resp.status);
      const data = await resp.json();
      return parseAI(data.text || data.reply || data.content || "");
    }
    // 2) 프리뷰 환경 내장 AI (다운로드한 파일엔 없음)
    if (window.claude && window.claude.complete) {
      const raw = await window.claude.complete({ messages: msgs });
      return parseAI(raw);
    }
    throw new Error("AI 연결 없음");
  }

  function fallback(q) {
    const intent = DATA.classify(q);
    return { text: DATA.answer(intent, grade), card: intent === "offtopic" ? null : intent };
  }

  // 카드 내부 lazy 질의(예: 리포트 카드 '일별' 탭) — 새 말풍선/대화턴을 만들지 않고 데이터만 가져온다.
  // NL 텍스트가 '본 신호'다(실 오페리아는 텍스트만 받음). intentHint는 시뮬(operia.js) 템플릿/컬럼계약/폴백 라우팅용일 뿐.
  async function cardQuery(text, intentHint) {
    // Phase D: cardIntent 제거 — operia 는 텍스트만 소비(intentHint 는 시뮬 라우팅용 잔여). scope 없음.
    return await queryDataSource(text, intentHint || null, null); // { result, sql, source, rawRows }
  }

  // operia 미분류(cardIntent===null) 응답 렌더 — 핵심 카드 경로(§ci useOperia)와 동일 규칙:
  //   unsupported→안내, success=false→친근/원문, 폴백 토스트, 데이터 '구조' 없음(행0+컬럼없음+plan없음)→OTHER 친근 회피,
  //   있으면 chartType(미분류→table 폴백)/reportPlan/table 카드로 렌더. ci 경로는 이 함수를 쓰지 않는다(불변).
  function renderChannelResp(resp, kind, scope, q, forceTable) {
    setTyping(false);
    if (resp && resp.unsupported) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: sanitizeAnswer(resp.message) }]);
      return;
    }
    if (resp && resp.success === false) {
      showApiToast("채널 오류(success=false)", "error");
      if (isTechErrorMessage(resp.errorMessage)) {
        setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: NET_ERROR_MSG, retry: q }]);
      } else {
        setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: resp.errorMessage }]);
      }
      return;
    }
    if (resp && resp.source === "fallback") showApiToast(`⚠️ 템플릿 폴백 · ${kind || "(미분류)"}`, "error");
    // Phase B 상태 게이트(플래그 ON+봉투 status/hilRequired 有): 렌더 전 우선 소비. 없으면 기존 추정 경로.
    {
      const _gate = statusGateMsg(resp, kind, scope, q);
      if (_gate) { setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: _gate }]); return; }
    }
    const _rows = Array.isArray(resp && resp.tableData) ? resp.tableData : [];
    const _hasCols = Array.isArray(resp && resp.columnMetadata) && resp.columnMetadata.length > 0;
    const _hasPlan = !!(resp && resp.reportPlan && Array.isArray(resp.reportPlan.sections) && resp.reportPlan.sections.length > 0);
    if (!_rows.length && !_hasCols && !_hasPlan) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: OFFTOPIC_MSG }]);
      return;
    }
    // 구조는 있으나 데이터 없음(0행/전부 null 집계) → 빈 표·0 KPI 대신 친근 안내(이 경로는 operia 전용).
    if (isEmptyResult(resp)) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: emptyMsgFor(q) }]);
      return;
    }
    // 렌더 지시(forceTable) → 범용 표. 아니면 chartType 을 non-table 센티널("card")로 둬 ChartRenderer 가
    //   forceTable=false 로 인식 → 응답 컬럼 시그니처로 카드 선택(Phase D 단일 경로). intent 는 넘기지 않음(시그니처가 결정).
    const _tf = forceTable && (_hasCols || _rows.length > 0);
    setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: sanitizeAnswer(resp.answer || ""), chartType: _tf ? "table" : "card", intent: null, sql: resp.sql, source: resp.source, scope: scope || null, reportPlan: _tf ? null : resp.reportPlan, tableData: resp.tableData, columnMetadata: resp.columnMetadata, summaryStats: resp.summaryStats, appliedPeriod: resp.appliedPeriod, queryBreakdown: resp.queryBreakdown, queryInfo: resp.queryInfo }]);
  }

  async function send(text, skillId, displayText) {
    const q = (text != null ? text : input).trim();
    if (!q || typing) return;
    // 화면 표시 텍스트(스킬은 "/명령어", 일반 전송은 질의문 그대로). operia로 가는 건 항상 q(앵커).
    const shown = displayText != null ? displayText : q;
    const myEpoch = convoEpochRef.current;              // 이 요청의 대화 세대. await 후 바뀌면(새 대화/전환) 반영 스킵.
    const stale = () => convoEpochRef.current !== myEpoch;
    setFavOpen(false); // 전송 시 즐겨찾기 팝업 닫힘
    setInput("");
    setSkillScrollId(null); // 일반 전송(+단일 스킬)은 기존 맨-아래 스크롤
    const history = messages;
    // skillId: 스킬 슬래시 런처로 보낸 메시지 태깅(v1 렌더 미사용 — 사용량 측정/v2 전용템플릿 대비). 모든 전송 경로가 이 user 메시지를 만들므로 여기서 태깅.
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: shown, ...(skillId ? { skillId } : {}) }]);
    setTyping(true);

    // Phase D: 카드 선택은 응답 컬럼 시그니처가 담당(ChartRenderer). cardIntent 데이터 분류 제거 →
    //   인사/자기소개 외 모든 질의는 operia 로 직행하고, 카드 종류는 응답 '모양'으로 결정된다.
    const tableForce = /(표|리스트|목록)\s*(으?로)\s*(보여|볼래|알려|출력|나열|정리|봐|줘|주)/.test(q);
    setTypingIntent(null);
    setTypingSkill(null); // 일반 send는 스킬 로딩 문구 해제(직전 스킬 잔상 방지)
    // 그 외(cardIntent 미분류) — operia 모드: 순수 인사/잡담만 로컬 한 줄, 나머지 null 질의는 operia로 전달(세션 맥락 누적+재조회, 오페리아팀 요청).
    //   mock/backend 모드: 기존 로컬/AI 토글 유지(operiaMode=false → 아래 신규 분기 건너뜀).
    const operiaMode = activeChannelName() === "operia";
    // 순수 인사/자기소개 화이트리스트 → 로컬(데이터 없음, 기존 인사 유지). 그 외 미분류는 operia로.
    const GREETING_RE = /^(안녕|하이|헬로|반가|고마|감사|잘가|잘 가|누구야|넌\s*누구|누구니|이름이)/;
    if (operiaMode && !GREETING_RE.test(q)) {
      showApiToast(`${activeChannelName()} · (미분류)`, "api");
      try {
        const resp = await queryDataSource(q, null, null); // 미분류 → operia 전달(kind/scope 없음). shape→reportPlan→table 폴백, 무관이면 OTHER→회피.
        if (stale()) return; // 새 대화/전환 → stale 응답·로딩 반영 금지
        renderChannelResp(resp, null, null, q, tableForce);
      } catch (e) {
        if (stale()) return; // 새 대화/전환 후 도착한 오류 → 에러 말풍선 금지
        console.error("[데이터] 호출 오류:", e);
        showApiToast("데이터 오류", "error");
        setTyping(false);
        const em = e && e.message;
        if (isTechErrorMessage(em)) {
          setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: NET_ERROR_MSG, retry: q }]);
        } else {
          setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: em }]);
        }
      }
      return;
    }

    // 인사/잡담(operia) 또는 mock/backend → 실제 AI 답변 or 로컬 fallback
    let res;
    try {
      // ★ operia 모드에선 Claude(askAI/window.claude) 호출 완전 차단 — 인사/잡담은 로컬 fallback. mock/backend는 기존 AI 토글 유지.
      const hasAI = !operiaMode && aiEnabled && (typeof window !== "undefined" && window.FINFRIEND_AI_ENDPOINT || window.claude && window.claude.complete);
      if (hasAI) {
        showApiToast("🤖 Claude API 호출", "api");
        res = await askAI(q, history);
        if (!res.text) { res = fallback(q); showApiToast("로컬 fallback · 빈 응답", "local"); }
      } else {
        res = fallback(q);
        showApiToast(operiaMode ? "로컬 응답 · operia(Claude 차단)" : aiEnabled ? "로컬 응답 · AI 미설정(키없음)" : "로컬 응답 · AI OFF", "local");
      }
    } catch (e) {
      res = fallback(q);
      showApiToast("로컬 fallback · API 오류", "error");
      console.error("[AI] 호출 오류:", e);
    }
    if (stale()) return; // 그 사이 새 대화/전환 → stale 응답 반영 금지
    setTyping(false);
    // 데이터 intent 카드는 InlineCard로 렌더하지 않는다(ChartRenderer 단일 경로). AI가 골라도 무시 → 텍스트로 답.
    const DATA_INTENTS = ["spending", "report", "catSpend", "friendCompare", "nudgeCompare", "nudgeList", "merchantMap", "balance", "channel", "merchantBreakdown", "parentCard", "schoolCompare", "timePattern"];
    if (DATA_INTENTS.includes(res.card)) res.card = null;
    setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: res.text, card: res.card }]);
  }

  // 컴포저 전송 — 입력이 "/명령어 [인자]"이고 등록된 스킬이면 스킬로 라우팅, 아니면 일반 전송.
  //   (드롭다운 선택은 입력만 채우고, 실제 발동은 여기서. 사용자가 전송을 눌러야 실행.)
  function submitComposer() {
    const t = (input || "").trim();
    if (t.startsWith("/")) {
      const body = t.slice(1);
      const cmd = body.split(/\s+/)[0] || "";
      const skill = SKILLS[cmd];
      if (skill) {
        const rest = body.slice(cmd.length).trim();
        setInput("");
        if (skill.summary) runComposite({ command: cmd, ...skill }, rest);
        else send(skill.cards[0].anchor, cmd, "/" + cmd + (rest ? " " + rest : ""));
        return;
      }
    }
    send();
  }

  // 복합 스킬(/자금보고서) 핸들러 — 앵커 N개를 앵커별 ephemeral 세션으로 (병렬) 호출 →
  //   슬롯별 강제카드 + 프론트 템플릿 요약문을 보고서 말풍선 1개로 렌더(SSOT §3). 단일 스킬은 send() 유지.
  async function runComposite(skill, periodText) {
    if (typing) return;
    const command = skill.command;
    const period = (periodText || "").trim();
    const myEpoch = convoEpochRef.current;
    const stale = () => convoEpochRef.current !== myEpoch;
    setFavOpen(false);
    // 화면 user 메시지 = /명령어(+기간). operia 로는 앵커(prompt)만 나감(description 미전송).
    const chipId = Date.now();
    setMessages((m) => [...m, { id: chipId, role: "user", text: "/" + command + (period ? " " + period : ""), skillId: command }]);
    setSkillScrollId(chipId); // 이 보고서 상단(칩)을 화면 위로 스크롤(카드 여러 장 → 위에서부터 읽게)
    setTyping(true);
    setTypingIntent(null);
    setTypingSkill(skill.label || "리포트"); // 스킬 전용 로딩 문구("자금보고서 만드는 중…")
    showApiToast(`${activeChannelName()} · /${command}`, "api");

    const cards = Array.isArray(skill.cards) ? skill.cards : [];
    // 기간 삽입: non-skipPeriod 슬롯에만 앞에 붙임(슬롯1 balance 는 skipPeriod → bare anchor).
    const anchorFor = (c) => (period && !c.skipPeriod) ? `${period} ${c.anchor}` : c.anchor;
    // 슬롯 실패 판정: 에러/미지원/실패/빈결과 → 재시도 대상.
    const badResp = (r) => !r || r.unsupported || r.success === false || isEmptyResult(r);
    // 앵커 1개 실행(실패 시 1회 자동 재시도). 성공=응답필드, 실패=error.
    const runOne = async (c) => {
      const text = anchorFor(c);
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await queryDataSource(text, null, null, { ephemeral: true }); // 앵커별 독립 세션 → SQL 교차오염 0
          if (badResp(r)) continue; // 재시도
          return { title: c.title, card: c.card, tableData: r.tableData, columnMetadata: r.columnMetadata,
            queryBreakdown: r.queryBreakdown, queryInfo: r.queryInfo, reportPlan: r.reportPlan,
            summaryStats: r.summaryStats, appliedPeriod: r.appliedPeriod, sql: r.sql, source: r.source };
        } catch (e) { /* 다음 시도 */ }
      }
      return { title: c.title, card: c.card, error: true };
    };

    let slots;
    const parallel = import.meta.env.VITE_SKILL_PARALLEL !== 'false'; // 기본 병렬. 'false' 면 순차 폴백(flaky 대비).
    if (parallel) {
      slots = await Promise.all(cards.map(runOne)); // runOne 은 내부에서 흡수 → 항상 fulfilled
    } else {
      slots = [];
      for (const c of cards) slots.push(await runOne(c));
    }

    if (stale()) return; // 그 사이 새 대화/전환 → 반영 금지
    setTyping(false);
    const summary = buildCompositeSummary(cards, slots, period);
    setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", skillId: command, report: { summary, slots } }]);
  }

  // [피그마 리스킨] 프레임 배경: 웹뷰는 투명(네이티브 배경이 비침), 일반 모드는 --app-bg 폴백 그라데이션.
  //   기존 bg-white 하드코딩을 제거하고 index.css 의 단일 변수로 일원화했다.
  return (
    <div ref={frameRef} className={"relative w-full mx-auto flex flex-col overflow-hidden phone-frame" + (WEBVIEW ? " webview-full" : "")}
    style={{ maxWidth: WEBVIEW ? undefined : 390, background: WEBVIEW ? "transparent" : "var(--app-bg)" }}>
      {/* 웹뷰에서 사용자 ID 미해석 시 비차단 안내 배너(계속 사용 가능, 원인만 안내). dev 브라우저(비웹뷰)엔 안 뜸. */}
      {WEBVIEW && noUserId &&
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 text-[13px] bg-amber-50 text-amber-800 border-b border-amber-200">
        <span aria-hidden="true">ℹ️</span>
        <span>로그인 정보를 불러오지 못했어요. 앱에서 다시 열어주세요.</span>
      </div>
      }
      {!WEBVIEW &&
      <Header grade={grade} setGrade={setGrade} tab={tab} setTab={setTab}
      canBack={tab === "금융친구" && entered} onBack={() => { if (started) { resetConvoEpoch(); resetOperiaSession(); setMessages([]); setActiveId(null); } else { setEntered(false); } }}
      onHistory={tab === "금융친구" ? () => setShowHistory(true) : null}
      aiFeature={aiFeature} aiEnabled={aiEnabled} onToggleAi={toggleAi} />
      }

      {/* webview 모드: 뒤로가기는 네이티브 앱이 제공하므로 웹 back 버튼은 두지 않음 */}

      {tab !== "금융친구" ?
      <ComingSoon tab={tab} onGoChat={() => {setEntered(true);setTab("금융친구");}} /> :
      !entered ?
      <IntroScreen points={DATA.points} onStart={() => setEntered(true)} onOpenPoints={() => setEntered(true)} /> :
      (!started && !WEBVIEW) ?
      <MenuScreen onPick={(t) => send(t)} /> :
      <>
      {/* 상단 추천칩(FavoritesBar)은 webview에선 네이티브(Flutter)가 그리므로 숨김. 일반 모드는 started시 노출(기존 동작). */}
      {started && !WEBVIEW && <FavoritesBar onPick={send} />}
      {/* 빈 랜딩(webview !started): 입력창+진입칩 묶음을 중상단으로 — 상/하 스페이서(flex-grow)로 그룹을 위로 올린다.
          대화 시작(started)되면 스페이서 0 = 콘텐츠 flex-1 + 입력창 하단 도킹(기존과 동일). */}
      {!started && <div className="flex-1" aria-hidden="true" />}
      {/* webview: 빈 상태에서도 WelcomeScreen 대신 채팅 셸(빈 대화영역). 일반 모드는 기존대로 !started→WelcomeScreen */}
      {(!started && !WEBVIEW) ?
        <WelcomeScreen onPick={send} /> :

        <div ref={scrollRef} onPointerDown={() => favOpen && setFavOpen(false)}
          className={(started ? "flex-1" : "shrink-0") + " overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3.5 edupay-noscroll"}
          style={{ paddingTop: (WEBVIEW && started) ? WEBVIEW_TOP_CSS : undefined }}>
          {/* 진입/새 대화: 카카오뱅크 스타일 중앙 랜딩(로고 + "{userId}님 반가워요" + 핵심질의 칩). 전송되면 started=true로 숨김. */}
          {WEBVIEW && !started && <IntroLanding userName={userName} onPick={send} />}
          {messages.map((m) => <div key={m.id} data-mid={m.id}><Bubble msg={m} grade={grade} onSend={send} onOpenContent={setModal} onCardQuery={cardQuery} onRegisterFaq={askRegisterFaq} /></div>)}
          {typing && <Typing intent={typingIntent} skill={typingSkill} />}
          <div className="h-1"></div>
        </div>
        }

      {/* 즐겨찾기 팝업: 입력창 왼쪽 ★ 버튼으로 토글. 하단 FAQ 접이식 패널은 제거됨. */}
      {favOpen && <FavoritesPopup items={favItems} onPick={(t) => { send(t); setFavOpen(false); }} onDelete={deleteFav} openKey={openFaqKey} setOpenKey={setOpenFaqKey} onClose={() => { setFavOpen(false); setOpenFaqKey(null); }} />}
      {/* 입력 바: relative z-10 으로 팝업 시트 위. 가로 overflow로 전송버튼이 절대 잘리지 않게 입력 래퍼 min-w-0 + 버튼 shrink-0 고정폭.
          started(대화중)일 때만 상단 구분선(border-t) — 빈 랜딩에선 중상단에 떠 있으므로 구분선 제거. */}
      <div className={"shrink-0 relative z-10 backdrop-blur" + (started ? " border-t border-gray-100" : "")}
        style={{ background: "var(--app-surface)" }}>
        {/* 슬래시(/) 스킬 런처: input이 '/'로 시작할 때만 이 relative 컨테이너 기준 위(bottom-full)로 뜸 */}
        <SlashSkillMenu ref={slashRef} input={input}
          onPick={(skill, rest) => { const cmd = "/" + skill.command; setInput(cmd + (rest ? " " + rest : "")); slashRef.current?.dismiss?.(cmd); }} />
        <div className="flex items-center gap-2.5 px-4 pt-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>
          {/* ★ 즐겨찾기 버튼 (ChatGPT '+' 위치) */}
          {/* [피그마 리스킨] 즐겨찾기 ★ — 회색 원형 채움 제거(피그마엔 아웃라인 아이콘만). 켜짐 상태는 색으로 유지. */}
          <button onClick={() => setFavOpen((o) => !o)} aria-label="즐겨찾기"
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-transparent transition active:scale-90"
            style={{ color: favOpen ? "#5B4DD6" : "#8B8FA3" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={favOpen ? "#5B4DD6" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M12 3.6l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 17.9l-5.2 2.72.99-5.8-4.21-4.1 5.82-.85z" strokeLinejoin="round" />
            </svg>
          </button>
          {/* [피그마 리스킨] 입력 pill — 투명 배경 위에서 회색 채움이 뜨므로 반투명 흰색 + 테두리로 교체 */}
          <div className="flex-1 min-w-0 flex items-center rounded-full px-4 h-11 bg-white/75 border border-white/80">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (slashRef.current?.handleKey(e)) return; // 드롭다운 열림 시 ↑↓/Enter/Esc 가로채기(Enter=선택→입력채움)
                  if (e.key === "Enter") submitComposer(); // 메뉴 닫힘 시: "/명령어"면 스킬 라우팅, 아니면 일반 전송
                }}
                placeholder="메시지를 입력하세요"
                // 슬래시 명령 입력 중이면 파란색+굵게(스킬 발동 신호). 일반 입력은 기본색.
                style={(input || "").startsWith("/") ? { color: "#5B4DD6", fontWeight: 600 } : undefined}
                className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-gray-800 placeholder-gray-400" />

          </div>
          {/* [피그마 리스킨] 전송 버튼 — 채움 원형(→ 화살표) → 종이비행기 아웃라인.
              피그마엔 원형 배경이 없다. 활성=보라 스트로크, 비활성=회색 스트로크로 상태는 유지(가독성 회귀 방지). */}
          <button onClick={() => submitComposer()} disabled={!input.trim() || typing}
            aria-label="전송"
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition active:scale-90 bg-transparent"
            style={{ color: input.trim() && !typing ? "#5B4DD6" : "#A7AAB8" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2.5L10.5 13.5" />
              <path d="M21.5 2.5l-7 19-4-8.5-8.5-4 19.5-6.5z" />
            </svg>
          </button>
        </div>
      </div>
      {/* 빈 랜딩 하단 스페이서: 상단과 동일(flex-1) → 로고+칩+입력 그룹이 화면 세로 정중앙(위아래 여백 균등). */}
      {!started && <div className="flex-1" aria-hidden="true" />}
      </>
      }


      {/* [FAQ 등록 확인창] 말풍선 long-press → '등록' 선택 시에만 추가. 딤/블러 없음(투명 오버레이, 밖 탭=취소). 카드는 테두리+그림자로 시인성 확보(새 대화 확인창과 동일). */}
      {faqConfirm &&
      <div className="absolute inset-0 z-[60] flex items-center justify-center px-8"
        onClick={() => setFaqConfirm(null)}>
        <div className="w-full max-w-[300px] bg-white rounded-2xl p-5 border border-gray-200 edupay-fade"
          style={{ boxShadow: "0 18px 44px -12px rgba(17,17,27,0.30), 0 4px 12px -4px rgba(17,17,27,0.12)" }}
          onClick={(e) => e.stopPropagation()}>
          <p className="text-[14px] font-bold text-gray-800 leading-relaxed">이 질문을 즐겨찾기에 추가할까?</p>
          <p className="mt-2 text-[12.5px] text-gray-500 leading-relaxed break-words">{faqConfirm}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setFaqConfirm(null)}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-gray-500 bg-[#F3F4F6] active:scale-95 transition">취소</button>
            <button onClick={() => { registerFaqFromBubble(faqConfirm); setFaqConfirm(null); }}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white active:scale-95 transition" style={{ background: "#5B4DD6" }}>추가</button>
          </div>
        </div>
      </div>
      }
      {/* [웹뷰] 대화기록 진입점 — 헤더는 웹뷰에 없으므로(!WEBVIEW), 좌상단 '대화' 버튼 하나로 일원화(반투명+스크롤 자동숨김). 기본=최상단 좌측, 드래그로 이동 가능(포인터=마우스+터치, 뷰포트 clamp, 6px 임계=탭/드래그 구분). 팝오버/엣지접힘은 없음(비웹뷰는 헤더 🕘 사용). */}
      {WEBVIEW && entered && tab === "금융친구" &&
      <button ref={histBtnRef} onClick={onHistClick}
        onPointerDown={onHistDown} onPointerMove={onHistMove} onPointerUp={onHistUp} onPointerCancel={onHistUp}
        aria-label="대화 기록"
        className="absolute z-20 flex items-center gap-1 rounded-full active:scale-95 select-none touch-none"
        style={{ ...(histPos ? { left: histPos.left, top: histPos.top } : { left: 12, top: WEBVIEW_TOP_CSS }),
          height: HISTORY_BTN.size, padding: "0 12px", touchAction: "none",
          background: "rgba(91,77,214,0.92)", boxShadow: "0 4px 14px rgba(91,77,214,0.35)",
          opacity: historyHidden ? 0 : HISTORY_BTN.idleOpacity, transition: "opacity .25s" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 5h16v11H8l-4 4V5z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span className="text-[12.5px] font-bold text-white">대화</span>
      </button>
      }
      {showHistory &&
      <HistoryDrawer convos={convos} activeId={activeId}
      onSelect={selectConvo} onNew={newChat} onDelete={deleteConvo} onClose={() => setShowHistory(false)} />
      }

      {/* [개발용] 응답 경로 디버그 토스트 */}
      {apiToast &&
      <div className="absolute left-1/2 -translate-x-1/2 top-16 z-50 px-3.5 py-2 rounded-full text-[12px] font-bold text-white shadow-lg edupay-fade pointer-events-none"
      style={{ background: apiToast.kind === "api" ? "#5B4DD6" : apiToast.kind === "error" ? "#CF5A5A" : "#3A3A3C" }}>
        {apiToast.msg}
      </div>
      }

      {/* [사용자] 말풍선 long-press → FAQ 등록 피드백 토스트 — prod 포함 노출, 1.6초s */}
      {faqToast &&
      <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-50 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-bold text-white shadow-lg edupay-fade pointer-events-none"
      style={{ background: "#2D2870" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {faqToast}
      </div>
      }
    </div>);

}


export default App;
