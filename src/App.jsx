import React from "react";
// [브랜드 에셋] Vite가 URL로 번들 — 하드코딩 경로 금지. 로고는 icons/(프로젝트 root 하위)에서 import.
import logoFoxpay from "../icons/logo_foxpay.svg";           // 컬러 워드마크(170×62) — 흰 배경 랜딩용
import aiAvatar from "../icons/ai_avatar.png"; // 원형 AI 아바타(자체 보라 배경+흰 심볼)
import { EDUPAY, dragScroll } from "./data/edupay";
import { InlineCard } from "./components/cards";
import { RecommendModal } from "./components/recommend";
import { HistoryDrawer } from "./components/history";
import { getAiEnabled, setAiEnabled as persistAiEnabled, isAiFeatureOn } from "./config";
import { isOperiaAiMode } from "./api/operia";
import { getDataSource, activeChannelName } from "./api/datasource";
import { resetOperiaSession } from "./api/datasource/operia";
import { getUserId } from "./api/session";
import { computeSummaryStats } from "./api/datasource/stats";
import { OPERIA_KINDS } from "./mock/operia";
import { ChartRenderer, SqlChip } from "./charts/ChartRenderer";
import { chartTypeForIntent } from "./charts/registry";
import { balanceIntent } from "./util/balanceIntent";
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
function queryDataSource(userInput, intent, scope) {
  const ds = getDataSource();
  return new Promise((resolve, reject) => {
    const state = { rows: [], columnMetadata: null, done: false };
    let settled = false;
    // [세션] userId 는 이 경로에서 1회 조회(session.getUserId 가 캐시) → context 에 주입.
    // 어댑터(operia/backend)는 context 를 스프레드로 그대로 실어 보낸다(companyId 만 채널값으로 덮음). mock 은 context 무시.
    getUserId().then((userId) =>
      ds.query(
        { userInput, context: { companyId: COMPANY_ID, userId }, hints: { intent, scope } },
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

// [개발용 디버그 표시 토글] 독립 플래그 2개(단일 출처). 기본 OFF(데모/실배포 깔끔), .env.local 에서 개별 ON.
//   VITE_SHOW_SQL          → SQL/조회조건 칩 노출 여부
//   VITE_SHOW_SOURCE_BADGE → "operia · balance" 데이터소스 배지 토스트 여부
// 파싱: 'true' 문자열만 true(미설정/그 외 = false).
const SHOW_SQL = import.meta.env.VITE_SHOW_SQL === "true";
const SHOW_SOURCE_BADGE = import.meta.env.VITE_SHOW_SOURCE_BADGE === "true";
const FOX_LOADER_ENABLED = import.meta.env.VITE_FOX_LOADER_ENABLED === "true"; // 미설정=false(여우 OFF→점3개 폴백). 'true'면 FoxRunner 여우 로더 표시.

const GRADES = ["초등", "중학", "고등"];
const GRADE_LABELS = { "초등": "초등학생", "중학": "중학생", "고등": "고등학생" };

// 시그니처 축 플래그(모듈 상단 — SUGGESTIONS 등 모듈-레벨 초기화에서 참조하므로 TDZ 회피 위해 먼저 정의).
//   Phase C: 기본 ON(env 미설정=ON). 롤백은 VITE_CARD_SIGNATURE=false → 현행 cardIntent 경로 100% 복귀.
//   ON이면 ① 로컬 카드(recommend/quiz/ledger) de-route ② 로컬 카드 칩 제거 ③ 상태 게이트(봉투 status 우선).
const CARD_SIGNATURE_ON = import.meta.env.VITE_CARD_SIGNATURE !== "false";
// Phase C: 로컬(비데이터) 카드 종류 — 플래그 ON이면 진입 차단(컴포넌트 파일은 보존, Phase D 삭제 대상).
const LOCAL_CARD_KINDS = ["recommend", "quiz", "ledger"];

const SUGGESTIONS_ALL = [
{ icon: "📊", label: "소비패턴 분석", text: "내 소비 패턴 분석해줘" },
{ icon: "🧩", label: "금융퀴즈 풀기", text: "금융 퀴즈 풀고 싶어" },
{ icon: "🎓", label: "추천금융쇼츠", text: "나한테 맞는 금융 공부 추천해줘" }];
// Phase C: 플래그 ON이면 로컬 카드 칩(퀴즈·추천쇼츠) 제거, 데이터 칩(소비패턴 분석)만 노출. OFF면 원본.
const LOCAL_CHIP_LABELS = ["금융퀴즈 풀기", "추천금융쇼츠"];
const SUGGESTIONS = CARD_SIGNATURE_ON ? SUGGESTIONS_ALL.filter((s) => !LOCAL_CHIP_LABELS.includes(s.label)) : SUGGESTIONS_ALL;


const FAVORITES = SUGGESTIONS;

/* 입력창 위 고정 빠른 질문 (사용자 지정) */
// 진입 랜딩·즐겨찾기 공용 질의. 플래그 하나로 4개(핵심)↔8개(전체) 토글.
//   SHOW_ALL_QUICK_QUERIES = false → 핵심 4개(기본/운영), true → 전체 8개(테스트).
//   메인 칩(IntroLanding)·즐겨찾기 시드 모두 QUICK_QUERIES 참조 → 이 값 하나로 둘 다 바뀜.
const SHOW_ALL_QUICK_QUERIES = import.meta.env.VITE_SHOW_ALL_QUICK_QUERIES === 'true'; // .env.local 로 4↔8 전환(미설정=4개). QUICK_QUERIES·FAV_KEY 자동 연동.
const QUICK_QUERIES_ALL = [
{ icon: "💰", text: "현재 사용할 수 있는 금액 알려줘" },
{ icon: "📅", text: "월별 사용 내역 알려줘" },
{ icon: "📍", text: "근처 사용 가능 가맹점 알려줘" },
{ icon: "🧾", text: "사용처별 내역 알려줘" },
{ icon: "👫", text: "친구랑 사용내역 비교 해줘" },
{ icon: "🛒", text: "온라인/오프라인 결제내역 확인해줘" },
{ icon: "📊", text: "어디에 주로 쓰고 있는지 알려줘" },
{ icon: "🏫", text: "학교별 사용 내역 비교해줘" }];
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
  // Phase C: 플래그 ON이면 로컬(비데이터) 카드 칩(퀴즈·추천쇼츠·콘텐츠몰) 진입 제거. 데이터 칩(분석·지역상생몰)은 유지.
  const LOCAL_CHIP_KEYS = ["quiz", "shorts", "content"];
  const MENU = [
  { key: "analysis", label: "소비패턴\n분석", text: "내 소비 패턴 분석해줘" },
  { key: "quiz", label: "금융퀴즈\n풀기", text: "금융 퀴즈 풀고 싶어" },
  { key: "shorts", label: "추천 금융\n쇼츠", text: "나한테 맞는 금융 공부 추천해줘" },
  { key: "content", label: "콘텐츠 몰", text: "추천 콘텐츠 보여줘" },
  { key: "local", label: "지역상생 몰", text: "근처 사용 가능 가맹점 알려줘" }]
  .filter((m) => !(CARD_SIGNATURE_ON && LOCAL_CHIP_KEYS.includes(m.key)));

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

/* ── webview 진입 랜딩 (카카오뱅크 AI 스타일 중앙 정렬) — 실제 메시지는 아님 ─────────
   빈 대화(진입/새 대화)에서만 노출: 로고 + "{userName}님 반가워요"(2줄, 볼드) + 핵심질의 4개 칩(중앙정렬).
   userName 없으면 "반가워요"로 폴백. 전송되면 started=true → 숨김(호출부 조건). */
function IntroLanding({ userName, onPick }) {
  return (
    <div className="flex-1 flex flex-col items-center pt-14 px-6 edupay-fade">
      <img src={logoFoxpay} alt="FOX PAY" className="w-[150px] h-auto" />
      <h2 className="mt-6 text-[22px] font-extrabold text-gray-900 text-center leading-snug tracking-[-0.02em]">
        {userName ? <>{userName}님<br />반가워요</> : "반가워요"}
      </h2>
      {/* 핵심질의 4개 칩 — 세로 스택, full-width 왼쪽정렬(items-stretch), 넉넉한 간격. 인사말과의 간격 확대(iPhone에서 붙어보임 방지). 탭 → 전송 */}
      <div className="mt-14 w-full flex flex-col items-stretch gap-3">
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
  if (!CARD_SIGNATURE_ON || !resp) return null;
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
function emptyMsgFor(q) {
  const t = String(q || "");
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
    return <UserBubble text={msg.text} onRegisterFaq={onRegisterFaq} />;
  }
  const isChart = !!msg.chartType; // 오페리아 데이터 메시지(ChartRenderer 렌더)
  const bigCard = isChart || ["spending", "report", "friendCompare", "nudgeCompare", "nudgeList", "merchantMap", "balance", "channel", "merchantBreakdown", "parentCard", "schoolCompare", "catSpend", "timePattern", "quiz", "recommend"].includes(msg.card);
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
          {isChart && <ChartRenderer intent={msg.intent} sql={msg.sql} source={msg.source} tableData={msg.tableData} columnMetadata={msg.columnMetadata} reportPlan={msg.reportPlan} summaryStats={msg.summaryStats} scope={msg.scope} forceTable={msg.chartType === "table"} onCardQuery={onCardQuery} onActiveSql={setChip} />}
          {msg.card && <InlineCard kind={msg.card} scope={msg.scope} entry={msg.entry} only={msg.only} grade={grade} onSend={onSend} onOpenContent={onOpenContent} />}
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

function Typing({ intent }) {
  const runPool = LOADING_POOLS[poolKeyForIntent(intent)] || LOADING_POOLS["기타"];
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // 마운트/intent 변경 시 리셋 후, 경과시간(단계 판정)·문구순환 두 타이머. 언마운트 시 clear. (달리기 리듬은 CSS)
  useEffect(() => {
    setIdx(0); setElapsed(0);
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Date.now() - start), 250);
    const msg = setInterval(() => setIdx((i) => i + 1), 1800);
    return () => { clearInterval(tick); clearInterval(msg); };
  }, [intent]);
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
  // [진입 랜딩] 인사 표시용 이름 — 세션에 name 등 표시이름 필드가 없으므로 getUserId() 결과(userId) 사용.
  //   폴백: name(없음) → userId → null(→ "반가워요"). getUserId 는 캐시 Promise(session.js).
  const [userName, setUserName] = useState(null);
  // 웹뷰에서 브릿지·URL·env 폴백 다 실패해 ID를 못 받으면 상단 안내 배너 노출용. 해석 후에만 세팅(초기 null 플래시 방지).
  const [noUserId, setNoUserId] = useState(false);
  useEffect(() => {
    let alive = true;
    getUserId().then((u) => { if (alive) { setUserName(u || null); setNoUserId(u == null); } }).catch(() => { if (alive) setNoUserId(true); });
    return () => { alive = false; };
  }, []);
  const [typing, setTyping] = useState(false);
  const [typingIntent, setTypingIntent] = useState(null); // 로딩 말풍선 문구 풀 선택용(send 에서 cardIntent 결과 저장)
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("금융친구");
  const [convos, setConvos] = useState(() => {
    try {return JSON.parse(localStorage.getItem("edupay_convos") || "[]");} catch (e) {return [];}
  });
  const [activeId, setActiveId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // [웹뷰 대화 진입점] 엣지 핀 팝오버(＋새 대화 / 🕘 지난 대화) · 새 대화 확인창 · 스크롤 시 핀 축소.
  //   히스토리 시트(showHistory)·newChat·selectConvo·deleteConvo 로직은 재사용, 진입점 UI만 추가.
  const [histPop, setHistPop] = useState(false);     // 핀 팝오버 열림
  const [newChatAsk, setNewChatAsk] = useState(false); // 새 대화 확인창
  const [pinMini, setPinMini] = useState(false);     // 채팅 스크롤 y>24 → 핀 원형 축소
  const [pinXY, setPinXY] = useState(null);          // 핀 위치 {left,top}px | null(기본=우측 상단). localStorage 저장 안 함
  const [pinDragging, setPinDragging] = useState(false); // 드래그 중(전환 애니 끔)
  const pinDragRef = useRef({ active: false, moved: false });
  const pinBtnRef = useRef(null);                    // 핀 DOM(드래그 중 transform 직접 적용용)
  const [popPos, setPopPos] = useState(null);        // 팝오버 위치 {left|right, top, origin} | null(기본=우측 상단)
  const [pinMinimized, setPinMinimized] = useState(false); // 핀을 가장자리 밖으로 밀면 얇은 탭으로 접힘
  const [pinEdge, setPinEdge] = useState("right");   // 접힌 방향('left'|'right')
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
  const started = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

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
  function resetConvoEpoch() { convoEpochRef.current++; setTyping(false); setTypingIntent(null); } // 진행 중 요청 무효화 + 로딩 클리어
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
      setFavOpen(false); setHistPop(false); setNewChatAsk(false); setShowHistory(false);
      setFaqConfirm(null); setOpenFaqKey(null);
      setPinXY(null); setPinMinimized(false);           // 핀 위치·접힘 항상 기본(우측 상단 전체 핀)으로 복귀
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

  // [핀 드래그+스냅] pointer 이동 6px 미만=탭(팝오버 토글), 이상=드래그. 채팅영역 clamp 후 놓으면 가까운 좌/우 가장자리 스냅.
  //   위치는 pinXY(메모리)만 — localStorage 저장 안 함. 재진입 리셋 시 setPinXY(null)로 기본 복귀.
  const PIN_M = 12; // 가장자리 여백
  const onPinDown = (e) => {
    const btn = e.currentTarget;
    const pr = btn.getBoundingClientRect();
    const par = btn.offsetParent ? btn.offsetParent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    pinDragRef.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY,
      baseLeft: pr.left - par.left, baseTop: pr.top - par.top, parentW: par.width, parentH: par.height,
      pinW: pr.width, pinH: pr.height, lastLeft: pr.left - par.left, lastTop: pr.top - par.top };
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    setPinDragging(true);
  };
  const onPinMove = (e) => {
    const d = pinDragRef.current; if (!d.active) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 6) return; // 임계값 미만 → 탭으로 간주
    d.moved = true;
    // 좌우는 가장자리 밖으로 살짝 밀 수 있게 clamp 완화(접기 트리거용). 세로는 화면 안 유지.
    const OVER = d.pinW * 0.7;
    const left = Math.max(-OVER, Math.min(d.baseLeft + dx, d.parentW - d.pinW + OVER));
    const top = Math.max(PIN_M, Math.min(d.baseTop + dy, d.parentH - d.pinH - PIN_M));
    d.lastLeft = left; d.lastTop = top;
    // 드래그 중엔 리렌더(setPinXY) 대신 핀 DOM에 transform 직접 적용(rAF 스로틀) → 끊김 없이 부드럽게 추종.
    d.tx = left - d.baseLeft; d.ty = top - d.baseTop;
    if (d.raf == null) {
      d.raf = requestAnimationFrame(() => {
        d.raf = null;
        const node = pinBtnRef.current;
        if (node) node.style.transform = `translate3d(${d.tx}px, ${d.ty}px, 0)`;
      });
    }
  };
  const onPinUp = () => {
    const d = pinDragRef.current; if (!d.active) return;
    d.active = false;
    if (d.raf != null) { cancelAnimationFrame(d.raf); d.raf = null; }
    const node = pinBtnRef.current;
    if (d.moved) {
      // 릴리즈 시 핀이 가장자리 밖으로 절반 이상 밀렸으면 → 얇은 탭으로 최소화(접기).
      const offLeft = d.lastLeft <= -d.pinW / 2;
      const offRight = d.lastLeft >= d.parentW - d.pinW / 2;
      if (offLeft || offRight) {
        if (node) node.style.transform = "";
        const edge = offLeft ? "left" : "right";
        // 복원 시 전체 핀이 그 가장자리·현재 높이로 오도록 pinXY 저장.
        setPinXY({ left: edge === "left" ? PIN_M : (d.parentW - d.pinW - PIN_M), top: d.lastTop });
        setPinEdge(edge);
        setPinMinimized(true);
        setHistPop(false);
        setPinDragging(false);
        return;
      }
      // 놓을 때 가까운 좌/우 가장자리로 스냅(세로 유지)
      const center = d.lastLeft + d.pinW / 2;
      const snapLeft = center < d.parentW / 2 ? PIN_M : (d.parentW - d.pinW - PIN_M);
      if (node) {
        // 릴리즈 지점을 left/top 으로 고정 + transform 제거(점프 방지) → reflow 후 스냅으로 transition(부드러운 안착).
        node.style.transition = "none";
        node.style.transform = "";
        node.style.right = "";
        node.style.left = d.lastLeft + "px";
        node.style.top = d.lastTop + "px";
        void node.offsetWidth; // 릴리즈 지점을 transition 시작값으로 커밋
        node.style.transition = "left .22s ease, top .22s ease, width .2s ease, padding .2s ease";
        node.style.left = snapLeft + "px";
      }
      setPinXY({ left: snapLeft, top: d.lastTop }); // 상태는 스냅 위치만 커밋(React 소유 복귀)
    } else if (node) {
      node.style.transform = ""; // 탭(미이동)이면 잔여 transform 정리
    }
    setPinDragging(false);
  };
  const onPinClick = () => {
    if (pinDragRef.current.moved) { pinDragRef.current.moved = false; return; } // 드래그였으면 팝오버 토글 안 함
    setNewChatAsk(false); setShowHistory(false);
    if (histPop) { setHistPop(false); return; }
    // 팝오버를 핀 현재 위치 바로 아래에 배치(핀을 좌/하단으로 옮겨도 따라옴). 핀 rect 기준 좌/우 정렬 + clamp.
    const node = pinBtnRef.current;
    if (node) {
      const par = node.offsetParent ? node.offsetParent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth };
      const r = node.getBoundingClientRect();
      const pinLeft = r.left - par.left, pinTop = r.top - par.top, pinW = r.width;
      const GAP = 8, POP_W = 156, M = 12;
      const top = pinTop + r.height + GAP;
      const isLeft = (pinLeft + pinW / 2) < par.width / 2;
      if (isLeft) {
        const left = Math.max(M, Math.min(pinLeft, par.width - POP_W - M));
        setPopPos({ left, top, origin: "top left" });
      } else {
        const right = Math.max(M, Math.min(par.width - (pinLeft + pinW), par.width - POP_W - M));
        setPopPos({ right, top, origin: "top right" });
      }
    } else {
      setPopPos(null); // 폴백: 기본 우측 상단
    }
    setHistPop(true);
  };
  // 접힌 탭 탭 → 전체 핀 복원(저장된 가장자리·높이). 복원 후 다시 드래그/탭(팝오버) 정상. 접힌 상태에선 팝오버 안 열림.
  const restorePin = () => { setPinMinimized(false); setHistPop(false); };

  const CARD_KINDS = ["spending", "report", "recommend", "quiz"];

  // 질의 → 날짜 추출 (오늘/어제/그저께/N일/M월 N일)
  function parseDay(t) {
    const T = DATA.TODAY;
    const yr = T.slice(0, 4),ym = T.slice(0, 7),p2 = (n) => String(n).padStart(2, "0");
    if (/(그끄제|그끄저께)/.test(t)) return DATA.dMinus(T, 3);
    if (/(그저께|그제)/.test(t)) return DATA.dMinus(T, 2);
    if (/(어제|어저께)/.test(t)) return DATA.dMinus(T, 1);
    if (/오늘/.test(t)) return T;
    // N일 전 / 한글 수 + 전
    let m = t.match(/(\d{1,2})일전/);
    if (m) return DATA.dMinus(T, +m[1]);
    const wordN = { 하루: 1, 이틀: 2, 사흘: 3, 나흘: 4, 닷새: 5, 엿새: 6, 이레: 7 };
    m = t.match(/(하루|이틀|사흘|나흘|닷새|엿새|이레)전/);
    if (m) return DATA.dMinus(T, wordN[m[1]]);
    m = t.match(/(\d{1,2})월(\d{1,2})일/);
    if (m) return `${yr}-${p2(+m[1])}-${p2(+m[2])}`;
    // 한국식 M/D (5/10 = 5월 10일)
    m = t.match(/(\d{1,2})\/(\d{1,2})/);
    if (m) return `${yr}-${p2(+m[1])}-${p2(+m[2])}`;
    m = t.match(/(\d{1,2})일/);
    if (m) return `${ym}-${p2(+m[1])}`;
    return null;
  }

  // 명시적 기간 파싱: "6월3일부터 7일까지", "6/1~6/10", "최근 7일", "최근 2주"
  function explicitRange(t) {
    const T = DATA.TODAY,yr = T.slice(0, 4),p2 = (n) => String(n).padStart(2, "0");
    // 최근 N일 / 일주일 / N주 / 한달
    let m = t.match(/최근(\d{1,2})일/);
    if (m) return { start: DATA.dMinus(T, +m[1] - 1), end: T, label: `최근 ${m[1]}일` };
    if (/최근(일주일|한주|1주)/.test(t)) return { start: DATA.dMinus(T, 6), end: T, label: "최근 7일" };
    m = t.match(/최근(\d{1,2})주/) || (/최근(이|두)주/.test(t) ? [0, "2"] : null);
    if (m) return { start: DATA.dMinus(T, +m[1] * 7 - 1), end: T, label: `최근 ${+m[1] * 7}일` };
    if (/최근(한달|1달|30일)/.test(t)) return { start: DATA.dMinus(T, 29), end: T, label: "최근 30일" };
    if (/(최근|요즘)/.test(t)) return { start: DATA.dMinus(T, 6), end: T, label: "최근 7일" };
    // M월D일 ~ M월D일
    m = t.match(/(\d{1,2})월(\d{1,2})일.*?(?:부터|에서|~|-|–).*?(\d{1,2})월(\d{1,2})일/);
    if (m) return { start: `${yr}-${p2(+m[1])}-${p2(+m[2])}`, end: `${yr}-${p2(+m[3])}-${p2(+m[4])}`, label: "선택 기간" };
    // M/D ~ M/D
    m = t.match(/(\d{1,2})\/(\d{1,2}).*?(?:부터|~|-|–).*?(\d{1,2})\/(\d{1,2})/);
    if (m) return { start: `${yr}-${p2(+m[1])}-${p2(+m[2])}`, end: `${yr}-${p2(+m[3])}-${p2(+m[4])}`, label: "선택 기간" };
    // 같은 달: D일 ~ D일
    m = t.match(/(\d{1,2})일.*?(?:부터|~|-|–).*?(\d{1,2})일/);
    if (m) {const mo = T.slice(5, 7);return { start: `${yr}-${mo}-${p2(+m[1])}`, end: `${yr}-${mo}-${p2(+m[2])}`, label: "선택 기간" };}
    return null;
  }

  // 질의 → 시각화 카드 결정. 날짜 특정 → 일별 카드, 월 단위 → 도넛, 분석 → 막대.
  // ※ 금액이 적힌 문장("오늘 4000원 썼어")은 '기록' 요청이므로 카드 조회로 가로채지 않는다.
  // 질의에서 기간을 추출 → {start,end,label,sub,single} (없으면 null)
  function periodScope(t) {
    const T = DATA.TODAY;
    const exp = explicitRange(t);
    if (exp) return { ...exp, single: exp.start === exp.end };
    if (/지지난주/.test(t)) return { ...DATA.weekRangeOf(DATA.dMinus(T, 14)), label: "지지난 주", sub: "월~일", single: false };
    if (/(지난주|저번주|전주)/.test(t)) return { ...DATA.weekRangeOf(DATA.dMinus(T, 7)), label: "지난 주", sub: "월~일", single: false };
    if (/(이번주|금주|한주|이번한주|일주일|이번주의)/.test(t)) return { ...DATA.weekRange, label: "이번 주", sub: "월~일", single: false };
    if (/(지난달|저번달|전월)/.test(t)) {const a = DATA.dMinus(DATA.monthRangeOf(T).start, 1);return { ...DATA.monthRangeOf(a), label: "지난 달", single: false };}
    if (/(이번달|이달|당월|금월)/.test(t)) return { ...DATA.monthRangeOf(T), label: "이번 달", single: false };
    // "N월" 전체 (단, "N월 D일" 형태가 아닐 때만)
    let mm = t.match(/(\d{1,2})월/);
    if (mm && !/(\d{1,2})월(\d{1,2})일/.test(t)) {
      const mo = +mm[1],curY = +T.slice(0, 4),curMo = +T.slice(5, 7);
      const y = mo > curMo ? curY - 1 : curY; // 미래 달이면 작년으로 간주
      return { ...DATA.monthRangeOf(`${y}-${String(mo).padStart(2, "0")}-01`), label: `${mo}월`, single: false };
    }
    const day = parseDay(t);
    if (day) {
      const rel = day === T ? "오늘" : day === DATA.dMinus(T, 1) ? "어제" : day === DATA.dMinus(T, 2) ? "그저께" : null;
      return { start: day, end: day, label: rel || "선택 날짜", single: true };
    }
    return null;
  }

  function cardIntent(q) {
    const t = (q || "").replace(/\s/g, "");
    // ── 특수 인텐트 (비교·지원금·가맹점·채널·결제자) — 우선 매칭 ──
    const psX = periodScope(t);
    const rangeOf = () => psX ? { type: "range", ...psX } : null;
    if (/(부모|보호자|엄마|아빠|가족).*(카드|결제|사용|내역)/.test(t)) return { kind: "parentCard" };
    if (/(조르기|조른|충전.*요청|보채)/.test(t)) return { kind: /(비교|보다|대비|또래|친구|학교|충북)/.test(t) ? "nudgeCompare" : "nudgeList" };
    if (/학교.*(별|비교|마다)/.test(t) || /(다른|타)학교/.test(t)) return { kind: "schoolCompare" };
    if (/(친구|또래|애들|학우|반친구|다른학생).*(비교|보다|대비|랑|와|과)/.test(t) || /(또래|친구).*비교/.test(t)) return { kind: "friendCompare" };
    if (/(가맹점|쓸수있는곳|사용가능.*곳|근처|주변|어디서쓸|지도)/.test(t)) return { kind: "merchantMap" };
    // balance(잔액/포인트) — 자산 토큰 앵커(바레 '얼마'·소비질의 제외). 지목형은 scope.focus 로 단일-KPI 렌더.
    { const _b = balanceIntent(t); if (_b) return { kind: "balance", scope: _b.focus ? { focus: _b.focus } : null }; }
    if (/(온라인|오프라인|결제채널|어떻게결제)/.test(t)) {
      const hasOn = /온라인/.test(t),hasOff = /오프라인/.test(t);
      const only = hasOn && !hasOff ? "online" : hasOff && !hasOn ? "offline" : null;
      return { kind: "channel", scope: rangeOf(), only };
    }
    if (/(가맹점별|가게별|상점별|사용처|주로어디|어디에주로|어디다주로|어디에많이|어디에썼|어디서썼|어디에|어디서|어디다)/.test(t)) return { kind: "merchantBreakdown", scope: rangeOf() };
    // 금융퀴즈 → 내 소비 데이터 기반 맞춤 퀴즈 카드
    if (/(금융퀴즈|퀴즈|문제풀|퀴즈풀)/.test(t)) return { kind: "quiz" };
    // 금융공부/콘텐츠 추천 → 맞춤 추천 카드 (텍스트 설명 대신 보기 쉬운 카드로)
    if (/(금융.*(공부|학습|교육|배우)|(공부|학습|콘텐츠|영상|쇼츠|금융).{0,3}추천|추천.{0,3}(공부|학습|콘텐츠|영상|쇼츠|금융)|금융교육|뭐.{0,2}배워|배울.{0,2}거)/.test(t)) return { kind: "recommend" };
    // 11) 주로 언제 / 요일·시간대 패턴
    if (/(언제|요일|시간대|몇시|시간별|주로.*쓰|주로.*써)/.test(t) && !/어디/.test(t)) return { kind: "timePattern", scope: rangeOf() };

    // 특정 카테고리/가맹점 사용액 ("편의점 얼마 썼어", "교통비 얼마")
    const CAT_KW = [
    { re: /편의점|gs25|cu|세븐|이마트24|미니스톱/i, key: "편의점", label: "편의점" },
    { re: /매점|간식/, key: "매점·간식", label: "매점·간식" },
    { re: /식비|밥값|음식|분식|떡볶이|김밥|햄버거|급식/, key: "식비", label: "식비" },
    { re: /교통|버스|지하철|택시|교통비/, key: "교통", label: "교통" },
    { re: /학용품|문구|문제집|참고서|볼펜|노트/, key: "학용품", label: "학용품" },
    { re: /문화|영화|웹툰|게임|공연|만화/, key: "문화", label: "문화" }];

    const ckw = CAT_KW.find((c) => c.re.test(t));
    if (ckw && /얼마|금액|썼|쓴|지출|사용|소비/.test(t)) {
      return { kind: "catSpend", scope: { type: "cat", key: ckw.key, label: ckw.label, range: psX ? { start: psX.start, end: psX.end, label: psX.label } : null } };
    }

    // N개월 (예: "6개월") → 월별 추이 N개월
    const moCount = t.match(/(\d{1,2})개월/);
    // 소비패턴 분석 → 리포트. 기간이 있으면 그 기간 분석 카드, N개월이면 월별 추이, 없으면 기본 추이
    if (/(소비패턴|패턴분석|소비습관|소비.*분석|분석.*소비|소비추이|추이분석|소비리포트|리포트|보고서)/.test(t)) {
      const rp = periodScope(t);
      if (rp) return { kind: "report", scope: { type: "range", ...rp } };
      if (moCount) return { kind: "report", scope: { type: "trend", view: "month", months: +moCount[1] } };
      return { kind: "report", scope: null };
    }
    // "월별/달별" 또는 "N개월" → 달별 추이 요약(막대), "일별/날짜별" → 일별 추이
    if (/(월별|달별|매달|매월|달마다|월마다)/.test(t) || moCount) return { kind: "report", scope: { type: "trend", view: "month", months: moCount ? +moCount[1] : 3 } };
    if (/(일별|날짜별)/.test(t)) return { kind: "report", scope: { type: "trend", view: "week" } };

    const wantsList = /(내역|리스트|목록|기입장|가계부)/.test(t);
    const spend = /(얼마|소비|지출|사용|썼|쓴|샀|구매|구입|결제|쓴돈)/.test(t);
    const ps = periodScope(t);

    // 하루 스코프(오늘/어제/특정일) + 사용/내역 → 건별 거래 리스트(dayTxns). operia 만(mock/backend 는 아래 기존 report 경로 유지 → 회귀 0).
    //   질의는 operia 로 그대로 전달(userInput). 월별/달별·기간 추이는 위(1263~64)에서 이미 분기되어 여기 안 옴.
    if (ps && ps.single && (wantsList || spend) && activeChannelName() === "operia") {
      return { kind: "dayTxns", scope: { type: "day", date: ps.start, label: ps.label } };
    }

    // 0) '카테고리별/분류별/항목별' → 카테고리 비중 분석 카드 (기간 없으면 이번 달)
    if (/(카테고리별|분류별|항목별|뭐에)/.test(t)) {
      const rp = ps || { ...DATA.monthRangeOf(DATA.TODAY), label: "이번 달", single: false };
      return { kind: "report", scope: { type: "range", ...rp } };
    }

    // 1) '내역/리스트/기입장/가계부' 요청 → 오페리아 결제 데이터 조회(report). 기간 없으면 이번 달 범위.
    if (wantsList) return { kind: "report", scope: ps ? { type: "range", ...ps } : (DATA.monthRangeOf ? { type: "range", ...DATA.monthRangeOf(DATA.TODAY), label: "이번 달" } : null) };

    // 2) 기간 + 소비 질의 → 금액 요약(리스트 X). 리스트는 '내역/리스트' 요청 때만
    if (ps && spend) {
      if (ps.single) return { kind: "spending", scope: { type: "day", date: ps.start } };
      if (ps.label === "이번 달") return { kind: "spending", scope: { type: "month" } }; // 도넛(카테고리 비중)
      return { kind: "report", scope: { type: "range", ...ps } }; // 주/지난달/명시기간 → 금액 요약 카드
    }

    // 3) 날짜/기간만 있는 짧은 후속 질문("5/14일은?", "지난주는?", "6월은?") → 기입장 리스트 카드(동일 형식)
    //    ※ "오늘 날씨 어때?"처럼 날짜 외 다른 주제어가 섞이면 카드로 가로채지 않고 AI가 처리
    if (ps) {
      const leftover = t.
      replace(/오늘|어제|어저께|그저께|그제|그끄제|이번주|지난주|저번주|전주|이번달|지난달|저번달|당월|금월|이번|최근|요즘|월별|일별|날짜별|\d{1,2}개월|\d{1,2}월|\d{1,2}일|\d{1,2}\/\d{1,2}|하루전|이틀전|사흘전/g, "").
      replace(/[은는을를이가의에도만][\s]?|보여줘|보여|알려줘|알려|어때|어떰|뭐|머|줘|해줘|확인|해|좀|\?|!|\.|,/g, "");
      if (leftover.length <= 1) return { kind: "report", scope: { type: "range", ...ps } };
      return null; // 날짜 + 다른 주제 → AI가 판단(소비 외 주제면 정중히 거절)
    }

    // 4) 기간 없이 '이번 달 소비' 류 → 도넛
    if (spend && /(이번달|이달|한달|월간|이번주|주간)/.test(t)) return { kind: "spending", scope: { type: "month" } };
    return null;
  }



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
    const ci = cardIntent(text);
    const intent = intentHint || (ci && ci.kind) || null;
    return await queryDataSource(text, intent, ci ? ci.scope : null); // { result, sql, source, rawRows }
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
    // 렌더 지시(forceTable) + 표 데이터 有 → 카드/plan 스킵하고 범용 표. 미분류(kind=null)는 원래 table 폴백이라 reportPlan 억제만 유효.
    const _tf = forceTable && (_hasCols || _rows.length > 0);
    setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: sanitizeAnswer(resp.answer || ""), chartType: _tf ? "table" : chartTypeForIntent(kind), intent: _tf ? null : kind, sql: resp.sql, source: resp.source, scope: scope || null, reportPlan: _tf ? null : resp.reportPlan, tableData: resp.tableData, columnMetadata: resp.columnMetadata, summaryStats: resp.summaryStats, queryInfo: resp.queryInfo }]);
  }

  async function send(text) {
    const q = (text != null ? text : input).trim();
    if (!q || typing) return;
    const myEpoch = convoEpochRef.current;              // 이 요청의 대화 세대. await 후 바뀌면(새 대화/전환) 반영 스킵.
    const stale = () => convoEpochRef.current !== myEpoch;
    setFavOpen(false); // 전송 시 즐겨찾기 팝업 닫힘
    setInput("");
    const history = messages;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: q }]);
    setTyping(true);

    // 소비 조회/분석 질의 → 시각화 카드로 바로 응답
    let ci = cardIntent(q);
    // Phase C: 플래그 ON이면 로컬(비데이터) 카드 진입 차단 → ci 무효화해 operia 경로로 흘림(데이터 카드/거절). OFF면 현행 유지.
    if (CARD_SIGNATURE_ON && ci && LOCAL_CARD_KINDS.includes(ci.kind)) ci = null;
    // 렌더 지시("표/리스트/목록으로 보여줘") → 카드 템플릿·reportPlan 건너뛰고 범용 표로 강제(표현 계층만; 질의는 그대로 operia로 감).
    //   채널 무관(operia/mock/backend 동일). 표 데이터가 있을 때만 적용 → plan-only 응답은 기존 렌더 유지.
    const tableForce = /(표|리스트|목록)\s*(으?로)\s*(보여|볼래|알려|출력|나열|정리|봐|줘|주)/.test(q);
    setTypingIntent(ci ? ci.kind : null); // 로딩 말풍선 문구 풀 선택(미매칭/잡담 → 기타)
    if (ci) {
      // ── 데이터 질문 → 오페리아 API 호출 → ChartRenderer 렌더 ──
      // 차트 유형은 응답이 아니라 프론트가 결정(chartTypeForIntent). 응답은 {question,sql,result}.
      // 정적/실서버 모드: 알려진 10개 intent만. AI 시뮬 모드(§8): 미지정 데이터질문도 보내 table로 렌더
      //   (recommend/quiz 같은 UI/비데이터 카드는 항상 로컬 보존).
      const NON_OPERIA = ["recommend", "quiz"];
      const useOperia = OPERIA_KINDS.includes(ci.kind) || (isOperiaAiMode() && !NON_OPERIA.includes(ci.kind));
      if (useOperia) {
        showApiToast(`${activeChannelName()} · ${ci.kind}`, "api");
        try {
          // ↓↓↓ [DEV MOCK] 채널 분기는 getDataSource() 한 곳: VITE_DATA_SOURCE(operia|backend|mock, 미설정→mock) ↓↓↓
          const resp = await queryDataSource(q, ci.kind, ci.scope); // SSE(data→result) 시뮬 소비 → 브리지 resp
          // ↑↑↑ [DEV MOCK] END ↑↑↑
          if (stale()) return; // 그 사이 새 대화/전환 → stale 응답·로딩 반영 금지
          setTyping(false);
          // §8.5 키 게이팅: 미지원(키 없음) → 차트 대신 친절 텍스트 안내(에러 아님)
          if (resp && resp.unsupported) {
            setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: sanitizeAnswer(resp.message) }]);
            return;
          }
          // §4.5/§8 오류: 채널이 success=false 로 응답 → errorMessage 표시(backend/operia). mock 은 항상 true.
          if (resp && resp.success === false) {
            showApiToast("채널 오류(success=false)", "error");
            // 백엔드 한글 안내는 그대로, 영문/기술/빈값 errorMessage 는 친근 문구 + 다시 시도.
            if (isTechErrorMessage(resp.errorMessage)) {
              setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: NET_ERROR_MSG, retry: q }]);
            } else {
              setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: resp.errorMessage }]);
            }
            return;
          }
          // §9.5 폴백 가시화: Claude 시도 실패로 템플릿 사용된 경우 dev 토스트
          if (resp && resp.source === "fallback") showApiToast(`⚠️ 템플릿 폴백 · ${ci.kind}`, "error");
          // Phase B 상태 게이트(플래그 ON+봉투 status/hilRequired 有): 렌더 전 우선 소비. 없으면 null→기존 추정 경로.
          {
            const _gate = statusGateMsg(resp, ci.kind, ci.scope, q);
            if (_gate) { setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: _gate }]); return; }
          }
          // OTHER/비관련 거절: 데이터 '구조' 자체가 없는 텍스트 응답(행 0 + columnMetadata 없음 + reportPlan 없음)
          //   → 빈 "조회 결과가 없어요" 카드 대신 친근 회피 말풍선(chartType 미설정 = isChart false). 오페리아 사무적 answer 는 숨김.
          //   ※ 진짜 0행 데이터 조회는 columnMetadata(또는 reportPlan)가 있어 아래 카드 경로 유지("조회 결과가 없어요").
          const _rows = Array.isArray(resp && resp.tableData) ? resp.tableData : [];
          const _hasCols = Array.isArray(resp && resp.columnMetadata) && resp.columnMetadata.length > 0;
          const _hasPlan = !!(resp && resp.reportPlan && Array.isArray(resp.reportPlan.sections) && resp.reportPlan.sections.length > 0);
          if (!_rows.length && !_hasCols && !_hasPlan) {
            setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: OFFTOPIC_MSG }]);
            return;
          }
          // 구조는 있으나 데이터 없음(0행/전부 null 집계) → 빈 표·0 KPI 대신 친근 안내(operia 만; mock/backend 는 기존 렌더 유지 → 회귀 0).
          if (activeChannelName() === "operia" && isEmptyResult(resp)) {
            // balance: 행 자체가 없음(모름)이면 "0원" 단정 금지 → "아직 정보가 없어요"(지목형이면 그 자산 기준).
            //   ※ 값 0 행이 실제로 있으면 isEmptyResult=false → 아래 카드 경로로 '0원/0P' 표시(참).
            if (ci.kind === "balance") {
              const _fl = { voucher: "바우처(지원금)", charge: "용돈 충전금", point: "에듀포인트" }[ci.scope && ci.scope.focus];
              setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: _fl ? `아직 ${_fl} 정보가 없어요.` : "아직 정보가 없어요." }]);
              return;
            }
            setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: emptyMsgFor(q) }]);
            return;
          }
          // answer 말풍선(§6/§9): 있으면 카드 위 텍스트, 없으면 생략(10개 intent 는 빈 answer → 기존과 동일, 시각 보존).
          // 렌더 지시(tableForce) + 표 데이터 有 → 카드/plan 스킵하고 범용 표(intent:null·reportPlan:null → ChartRenderer TEMPLATES.table, 한글 헤더). 지시 없으면 기존 카드 그대로.
          const _tf = tableForce && (_hasCols || _rows.length > 0);
          setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: sanitizeAnswer(resp.answer || ""), chartType: _tf ? "table" : chartTypeForIntent(ci.kind), intent: _tf ? null : ci.kind, sql: resp.sql, source: resp.source, scope: ci.scope || null, reportPlan: _tf ? null : resp.reportPlan, tableData: resp.tableData, columnMetadata: resp.columnMetadata, summaryStats: resp.summaryStats, queryInfo: resp.queryInfo }]);
        } catch (e) {
          if (stale()) return; // 새 대화/전환 후 도착한 오류 → 새 대화에 에러 말풍선 금지
          console.error("[데이터] 호출 오류:", e);
          showApiToast("데이터 오류", "error");
          setTyping(false);
          // 스트림 전 HTTP 오류(401/422 등)의 채널 한글 안내는 그대로 표시(§4.5).
          // 네트워크/기술 문자열(Failed to fetch, datasource error, timeout 등)·빈값 → 친근 문구 + 다시 시도.
          const em = e && e.message;
          if (isTechErrorMessage(em)) {
            setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: NET_ERROR_MSG, retry: q }]);
          } else {
            setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: em }]);
          }
        }
        return;
      }
      // ── 비데이터 카드(추천/퀴즈/용돈기입장 등) → 기존 로컬 로직 유지 ──
      showApiToast(`로컬 카드 · ${ci.kind}`, "local");
      await new Promise((r) => setTimeout(r, 450));
      if (stale()) return; // 그 사이 새 대화/전환 → stale 카드 반영 금지
      setTyping(false);
      setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: ci.kind === "recommend" ? DATA.recommendIntro[grade] || "" : "", card: ci.kind, scope: ci.scope || null, only: ci.only || null }]);
      return;
    }

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

  return (
    <div className={"relative w-full mx-auto bg-white flex flex-col overflow-hidden phone-frame" + (WEBVIEW ? " webview-full" : "")}
    style={{ maxWidth: WEBVIEW ? undefined : 390 }}>
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
      {/* webview: 빈 상태에서도 WelcomeScreen 대신 채팅 셸(빈 대화영역). 일반 모드는 기존대로 !started→WelcomeScreen */}
      {(!started && !WEBVIEW) ?
        <WelcomeScreen onPick={send} /> :

        <div ref={scrollRef} onPointerDown={() => favOpen && setFavOpen(false)}
          onScroll={(e) => { if (WEBVIEW) setPinMini(e.currentTarget.scrollTop > 24); }}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3.5 edupay-noscroll">
          {/* 진입/새 대화: 카카오뱅크 스타일 중앙 랜딩(로고 + "{userId}님 반가워요" + 핵심질의 칩). 전송되면 started=true로 숨김. */}
          {WEBVIEW && !started && <IntroLanding userName={userName} onPick={send} />}
          {messages.map((m) => <Bubble key={m.id} msg={m} grade={grade} onSend={send} onOpenContent={setModal} onCardQuery={cardQuery} onRegisterFaq={askRegisterFaq} />)}
          {typing && <Typing intent={typingIntent} />}
          <div className="h-1"></div>
        </div>
        }

      {/* 즐겨찾기 팝업: 입력창 왼쪽 ★ 버튼으로 토글. 하단 FAQ 접이식 패널은 제거됨. */}
      {favOpen && <FavoritesPopup items={favItems} onPick={(t) => { send(t); setFavOpen(false); }} onDelete={deleteFav} openKey={openFaqKey} setOpenKey={setOpenFaqKey} onClose={() => { setFavOpen(false); setOpenFaqKey(null); }} />}
      {/* 입력 바: relative z-10 으로 팝업 시트 위. 가로 overflow로 전송버튼이 절대 잘리지 않게 입력 래퍼 min-w-0 + 버튼 shrink-0 고정폭. */}
      <div className="shrink-0 relative z-10 bg-white/95 backdrop-blur border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-4 pt-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
          {/* ★ 즐겨찾기 버튼 (ChatGPT '+' 위치) */}
          <button onClick={() => setFavOpen((o) => !o)} aria-label="즐겨찾기"
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-[#F3F4F6] transition active:scale-90"
            style={{ color: favOpen ? "#5B4DD6" : "#8B8FA3" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={favOpen ? "#5B4DD6" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M12 3.6l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 17.9l-5.2 2.72.99-5.8-4.21-4.1 5.82-.85z" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0 flex items-center bg-[#F3F4F6] rounded-full px-4 h-11">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {if (e.key === "Enter") send();}}
                placeholder="메시지를 입력하세요"
                className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-gray-800 placeholder-gray-400" />

          </div>
          {/* 전송 버튼: 항상 보이게 — shrink-0 고정폭, 비활성도 흐리게(opacity) 하지 않고 선명한 회색배경+흰 화살표 유지 */}
          <button onClick={() => send()} disabled={!input.trim() || typing}
            aria-label="전송"
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition active:scale-90"
            style={{ background: input.trim() && !typing ? "linear-gradient(135deg,#5B4DD6,#4A3FB0)" : "#A7AAB8" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      </>
      }

      {modal && <RecommendModal content={modal} grade={grade} onClose={() => setModal(null)} />}

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
      {/* [웹뷰] 대화 기록 진입점 — 우측 상단 엣지 핀 + 팝오버 + 새 대화 확인창. 비웹뷰는 헤더 '대화 기록' 버튼 사용(불변). */}
      {WEBVIEW && entered && tab === "금융친구" &&
      <>
        {/* 엣지 핀: 드래그로 이동+가장자리 스냅. 탭(6px 미만)=팝오버 토글. 스크롤 y>24 → 44px 원형 축소. 가장자리 밖으로 밀면 접힘. */}
        {!pinMinimized &&
        <button ref={pinBtnRef} onClick={onPinClick} onPointerDown={onPinDown} onPointerMove={onPinMove}
          onPointerUp={onPinUp} onPointerCancel={onPinUp}
          aria-label="대화 메뉴"
          className="absolute z-20 flex items-center justify-center gap-1.5 text-white font-bold text-[13px] rounded-full active:scale-95"
          style={{
            ...(pinXY ? { left: pinXY.left, top: pinXY.top } : { right: 12, top: "max(env(safe-area-inset-top), 12px)" }),
            height: 44, width: pinMini ? 44 : "auto", padding: pinMini ? 0 : "0 14px",
            background: "rgba(91,77,214,0.92)",
            boxShadow: "0 4px 14px rgba(91,77,214,0.35)",
            touchAction: "none", willChange: "transform",
            transition: pinDragging ? "none" : "left .22s ease, top .22s ease, width .2s ease, padding .2s ease" }}>
          <span className="text-[15px]">🕘</span>
          {!pinMini && <span>대화</span>}
        </button>
        }
        {/* 접힘 탭: 가장자리에 얇은 반투명 손잡이만 살짝. 탭하면 전체 핀 복원(팝오버 안 열림). */}
        {pinMinimized &&
        <button onClick={restorePin} aria-label="대화 메뉴 펼치기"
          className="absolute z-20 flex items-center justify-center text-white font-bold active:scale-95"
          style={{
            top: pinXY ? pinXY.top : "max(env(safe-area-inset-top), 12px)",
            ...(pinEdge === "left" ? { left: 0, borderRadius: "0 10px 10px 0" } : { right: 0, borderRadius: "10px 0 0 10px" }),
            width: 14, height: 48, fontSize: 11,
            background: "rgba(91,77,214,0.45)",
            boxShadow: "0 2px 8px rgba(91,77,214,0.22)",
            touchAction: "none",
            transition: "background .2s ease" }}>
          <span style={{ opacity: 0.9 }}>{pinEdge === "left" ? "›" : "‹"}</span>
        </button>
        }
        {/* 팝오버: 바깥(투명 오버레이) 탭 → 닫힘. */}
        {histPop &&
        <>
          <div className="absolute inset-0 z-[30]" onClick={() => setHistPop(false)}></div>
          <div className="absolute z-[31] bg-white rounded-2xl overflow-hidden edupay-fade"
            style={{ ...(popPos
                ? { left: popPos.left, right: popPos.right, top: popPos.top }
                : { right: 12, top: "calc(max(env(safe-area-inset-top), 12px) + 52px)" }),
              minWidth: 156, boxShadow: "0 12px 34px rgba(17,17,27,0.22)", transformOrigin: popPos ? popPos.origin : "top right" }}>
            <button onClick={() => { setHistPop(false); setNewChatAsk(true); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] font-semibold text-gray-800 active:bg-violet-50 transition text-left">
              <span className="text-[15px] w-4 text-center">＋</span>새 대화
            </button>
            <div className="h-px bg-gray-100 mx-2"></div>
            <button onClick={() => { setHistPop(false); setShowHistory(true); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] font-semibold text-gray-800 active:bg-violet-50 transition text-left">
              <span className="text-[15px] w-4 text-center">🕘</span>지난 대화
            </button>
          </div>
        </>
        }
        {/* 새 대화 확인창 — 딤/블러 없음(투명 오버레이, 밖 탭=닫기). 카드는 테두리+그림자로 시인성 확보. */}
        {newChatAsk &&
        <div className="absolute inset-0 z-[60] flex items-center justify-center px-8"
          onClick={() => setNewChatAsk(false)}>
          <div className="w-full max-w-[300px] bg-white rounded-2xl p-5 border border-gray-200 edupay-fade text-center"
            style={{ boxShadow: "0 18px 44px -12px rgba(17,17,27,0.30), 0 4px 12px -4px rgba(17,17,27,0.12)" }}
            onClick={(e) => e.stopPropagation()}>
            <h4 className="text-[16px] font-extrabold text-gray-900">새 대화를 시작할까?</h4>
            <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">지금 대화는 <b className="text-gray-600">지난 대화</b>에 저장돼.<br />새로 시작하면 화면이 초기화돼요.</p>
            <div className="mt-5 flex gap-2.5">
              <button onClick={() => setNewChatAsk(false)}
                className="flex-1 h-11 rounded-xl text-[14px] font-bold text-gray-500 bg-[#F3F4F6] active:scale-95 transition">취소</button>
              <button onClick={() => { setNewChatAsk(false); newChat(); }}
                className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white active:scale-95 transition" style={{ background: "#5B4DD6" }}>새로 시작</button>
            </div>
          </div>
        </div>
        }
      </>
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
