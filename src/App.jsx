import React from "react";
import { EDUPAY, dragScroll } from "./data/edupay";
import { InlineCard } from "./components/cards";
import { RecommendModal } from "./components/recommend";
import { HistoryDrawer } from "./components/history";
import { getAiEnabled, setAiEnabled as persistAiEnabled, isAiFeatureOn } from "./config";
import { isOperiaAiMode } from "./api/operia";
import { getDataSource } from "./api/datasource";
import { computeSummaryStats } from "./api/datasource/stats";
import { OPERIA_KINDS } from "./mock/operia";
import { ChartRenderer, SqlChip } from "./charts/ChartRenderer";
import { chartTypeForIntent } from "./charts/registry";
/* FOX PAY AI 금융친구 — 메인 앱 */
const { useState, useRef, useEffect } = React;
const DATA = EDUPAY;

// [데이터창구] context.companyId (§3 — 값은 추후 주입, 없으면 기본)
const COMPANY_ID = import.meta.env.VITE_OPERIA_COMPANY_ID || "OPERIA";

// 데이터 질문 1건 → 데이터창구 어댑터의 SSE 이벤트(data 청크 → result) 소비.
// StreamState: data 의 tableData 를 rows 에 누적, isLast 로 종료. 데이터 확정 시 computeSummaryStats 계산(§4.4, §8).
// ★Phase A 브리지: result 이벤트를 "기존 렌더가 기대하는 입력"{ result, rawRows, sql, source } 로 변환해 resolve.
//   (Phase B 에서 reportPlan 렌더러로 전환하며 이 브리지를 제거한다.)
function queryDataSource(userInput, intent, scope) {
  const ds = getDataSource();
  return new Promise((resolve, reject) => {
    const state = { rows: [], columnMetadata: null, done: false };
    let settled = false;
    Promise.resolve(
      ds.query(
        { userInput, context: { companyId: COMPANY_ID }, hints: { intent, scope } },
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
            const columnMetadata = state.columnMetadata || (e && e.columnMetadata) || [];
            const summaryStats = computeSummaryStats(state.rows, columnMetadata);
            const qi = (e && e.queryInfo) || {};
            resolve({
              tableData: state.rows,       // 전용 2개(report/map)는 ChartRenderer 가 shape, generic 은 reportPlan 렌더
              columnMetadata,
              reportPlan: e && e.reportPlan,
              summaryStats,
              answer: (e && e.answer) || "",
              sql: qi.sql || null,         // §9 SQL 칩
              source: qi.source || "api",  // 칩 라벨용(mock=template, backend/operia=자기 값)
              unsupported: !!(e && e.unsupported),
              message: (e && e.answer) || "",
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

const GRADES = ["초등", "중학", "고등"];
const GRADE_LABELS = { "초등": "초등학생", "중학": "중학생", "고등": "고등학생" };

const SUGGESTIONS = [
{ icon: "📝", label: "용돈기입장 작성", text: "용돈기입장에 기록하고 싶어" },
{ icon: "📊", label: "소비패턴 분석", text: "내 소비 패턴 분석해줘" },
{ icon: "🧩", label: "금융퀴즈 풀기", text: "금융 퀴즈 풀고 싶어" },
{ icon: "🎓", label: "추천금융쇼츠", text: "나한테 맞는 금융 공부 추천해줘" }];


const FAVORITES = SUGGESTIONS;

/* 입력창 위 고정 빠른 질문 (사용자 지정) */
const QUICK_QUERIES = [
{ icon: "💰", text: "현재 사용할 수 있는 금액 알려줘" },
{ icon: "📅", text: "월별 사용 내역 알려줘" },
{ icon: "📍", text: "근처 사용 가능 가맹점 알려줘" },
{ icon: "🧾", text: "사용처별 내역 알려줘" }];



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
  const MENU = [
  { key: "ledger", label: "용돈기입장\n작성", text: "용돈기입장에 기록하고 싶어" },
  { key: "analysis", label: "소비패턴\n분석", text: "내 소비 패턴 분석해줘" },
  { key: "quiz", label: "금융퀴즈\n풀기", text: "금융 퀴즈 풀고 싶어" },
  { key: "shorts", label: "추천 금융\n쇼츠", text: "나한테 맞는 금융 공부 추천해줘" },
  { key: "content", label: "콘텐츠 몰", text: "추천 콘텐츠 보여줘" },
  { key: "local", label: "지역상생 몰", text: "근처 사용 가능 가맹점 알려줘" }];

  return (
    <div className="flex-1 flex flex-col overflow-hidden edupay-fade px-5 pt-8 pb-6"
    style={{ background: "linear-gradient(165deg, #ECE7FA 0%, #F1E9FA 30%, #FBEAF2 68%, #FCEFE7 100%)" }}>
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

/* ── webview 빈 채팅 인사 (AI 첫 말풍선처럼) — 실제 메시지는 아님 ───────── */
function WebviewWelcome() {
  return (
    <div className="flex gap-2 items-start edupay-fade">
      <div className="w-7 h-7 rounded-[9px] shrink-0 flex items-center justify-center mt-0.5"
      style={{ background: "linear-gradient(140deg,#6E61DE,#5B4DD6)" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 5l4 3h8l4-3-1.6 7.2A8 8 0 0 1 12 19a8 8 0 0 1-6.4-6.8L4 5Z" fill="#fff" /><circle cx="9.5" cy="11.5" r="1.2" fill="#5B4DD6" /><circle cx="14.5" cy="11.5" r="1.2" fill="#5B4DD6" /></svg>
      </div>
      <div className="max-w-[85%] bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-md text-[14px] text-gray-800 leading-relaxed whitespace-pre-line shadow-sm">
        {"안녕! 난 너의 금융친구야 😊\n이번 달 소비, 같이 살펴볼까?\n아래 추천 질문에서 골라보거나 직접 물어봐 👇"}
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

/* ── 채팅 말풍선 ──────────────────────────────────────── */
function Bubble({ msg, grade, ledger, onAdd, onUpdate, onDelete, onSend, onOpenContent, onCardQuery }) {
  // 아바타 아래 SQL 칩이 보여줄 데이터. 기본은 메시지 응답(월별 등), 리포트 카드는 현재 탭으로 setChip 동기화.
  const [chip, setChip] = React.useState({ sql: msg.sql, source: msg.source, rawRows: msg.tableData });
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-[14px] leading-relaxed whitespace-pre-line shadow-sm" style={{ background: "#E0E2FA", color: "#2D2870" }}>
          {msg.text}
        </div>
      </div>);

  }
  const isChart = !!msg.chartType; // 오페리아 데이터 메시지(ChartRenderer 렌더)
  const bigCard = isChart || ["spending", "report", "recorded", "friendCompare", "nudgeCompare", "nudgeList", "merchantMap", "balance", "channel", "merchantBreakdown", "parentCard", "schoolCompare", "catSpend", "timePattern", "quiz", "recommend"].includes(msg.card);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2 items-start">
        <div className="w-7 h-7 rounded-[9px] shrink-0 flex items-center justify-center mt-0.5"
        style={{ background: "linear-gradient(140deg,#6E61DE,#5B4DD6)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 5l4 3h8l4-3-1.6 7.2A8 8 0 0 1 12 19a8 8 0 0 1-6.4-6.8L4 5Z" fill="#fff" /><circle cx="9.5" cy="11.5" r="1.2" fill="#5B4DD6" /><circle cx="14.5" cy="11.5" r="1.2" fill="#5B4DD6" /></svg>
        </div>
        <div className={bigCard ? "flex-1 min-w-0" : "max-w-[85%]"}>
          {msg.text &&
          <div className="bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-md text-[14px] text-gray-800 leading-relaxed whitespace-pre-line shadow-sm">
            {msg.text}
          </div>
          }
          {isChart && <ChartRenderer intent={msg.intent} sql={msg.sql} source={msg.source} tableData={msg.tableData} columnMetadata={msg.columnMetadata} reportPlan={msg.reportPlan} summaryStats={msg.summaryStats} onCardQuery={onCardQuery} onActiveSql={setChip} />}
          {msg.card && <InlineCard kind={msg.card} scope={msg.scope} entry={msg.entry} only={msg.only} grade={grade} ledger={ledger} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} onSend={onSend} onOpenContent={onOpenContent} />}
        </div>
      </div>
      {/* §9 SQL 칩 — 카드 밖, 어시스턴트 아바타 아래(메시지 좌측 영역). 리포트 카드는 현재 탭(월/일) SQL로 setChip 동기화 */}
      {isChart && <SqlChip sql={chip.sql} source={chip.source} rawRows={chip.rawRows} />}
    </div>);

}

function Typing() {
  return (
    <div className="flex gap-2 items-start edupay-fade">
      <div className="w-7 h-7 rounded-[9px] shrink-0 flex items-center justify-center mt-0.5"
      style={{ background: "linear-gradient(140deg,#6E61DE,#5B4DD6)" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 5l4 3h8l4-3-1.6 7.2A8 8 0 0 1 12 19a8 8 0 0 1-6.4-6.8L4 5Z" fill="#fff" /><circle cx="9.5" cy="11.5" r="1.2" fill="#5B4DD6" /><circle cx="14.5" cy="11.5" r="1.2" fill="#5B4DD6" /></svg>
      </div>
      <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm flex gap-1 items-center">
        {[0, 1, 2].map((i) =>
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 edupay-dot" style={{ animationDelay: i * 0.16 + "s" }}></span>
        )}
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

/* ── 입력창 위 빠른 질문 패널 (접기/펼치기) ──────────── */
function QuickReplyPanel({ onPick }) {
  const [open, setOpen] = useState(false);
  // 기본은 헤더만(질문 0개) → 채팅 가림 방지. 더보기=4개 전부, 접기=전부 숨김.
  const shown = open ? QUICK_QUERIES : [];
  return (
    <div className="shrink-0 bg-white rounded-t-2xl" style={{ boxShadow: "0 -6px 18px -8px rgba(45,40,112,0.16)" }}>
      {/* 핸들 (탭하면 펼침/접힘) */}
      <button onClick={() => setOpen((o) => !o)}
      className="w-full flex items-center justify-center pt-2 pb-1.5 active:opacity-60 transition" aria-label={open ? "질문 접기" : "질문 더보기"}>
        <span className="w-9 h-1 rounded-full bg-gray-300"></span>
      </button>
      <div className="px-4 pb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-bold text-gray-400">자주 묻는 질문</span>
        <button onClick={() => setOpen((o) => !o)} className="text-[11.5px] font-bold text-violet-500 active:opacity-60">{open ? "접기" : "더보기"}</button>
      </div>
      {open &&
      <div className="px-2 pb-1.5">
        {shown.map((s, i) =>
        <button key={i} onClick={() => onPick(s.text)}
        className={"w-full flex items-center gap-2.5 px-3 py-[11px] active:bg-violet-50 rounded-xl transition text-left " + (i < shown.length - 1 ? "border-b border-gray-100/80" : "")}>
            <span className="flex-1 text-[13.5px] font-medium text-gray-700">{s.text}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M9 6l6 6-6 6" stroke="#C4C4CC" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      }
    </div>);

}

/* ── 메인 앱 ──────────────────────────────────────────── */
function App() {
  const [grade, setGrade] = useState("중학");
  const [entered, setEntered] = useState(WEBVIEW); // webview면 인트로 건너뛰고 바로 진입
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false); // 입력 포커스(키보드 올라옴) 시 FAQ 패널 숨김
  const [typing, setTyping] = useState(false);
  const [ledger, setLedger] = useState(() => DATA.ledgerSeed.map((x) => ({ ...x })));
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("금융친구");
  const [convos, setConvos] = useState(() => {
    try {return JSON.parse(localStorage.getItem("edupay_convos") || "[]");} catch (e) {return [];}
  });
  const [activeId, setActiveId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // AI(Claude) 답변 — VITE_AI_ENABLED=true 일 때만 기능/토글 노출. 런타임 토글은 localStorage 유지
  const aiFeature = isAiFeatureOn();
  const [aiEnabled, setAiEnabled] = useState(() => getAiEnabled());
  const toggleAi = (on) => { persistAiEnabled(on); setAiEnabled(on); };
  // [개발용] 응답 경로 디버그 토스트 (API / 로컬). dev 모드에서만 표시
  const [apiToast, setApiToast] = useState(null);
  const showApiToast = (msg, kind = "info") => {
    if (!import.meta.env.DEV) return;
    const id = Date.now();
    setApiToast({ msg, kind, id });
    setTimeout(() => setApiToast((cur) => (cur && cur.id === id ? null : cur)), 2600);
  };
  const scrollRef = useRef(null);
  const started = messages.length > 0;

  const addEntry = (e) => setLedger((l) => [e, ...l]);
  const updateEntry = (e) => setLedger((l) => l.map((x) => x.id === e.id ? e : x));
  const deleteEntry = (id) => setLedger((l) => l.filter((x) => x.id !== id));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

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

  function newChat() {
    setMessages([]);
    setActiveId(null);
    setShowHistory(false);
    setEntered(true);
  }
  function selectConvo(c) {
    setMessages(c.messages);
    setActiveId(c.id);
    setShowHistory(false);
    setEntered(true);
  }
  function deleteConvo(id) {
    setConvos((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {setMessages([]);setActiveId(null);}
  }

  const CARD_KINDS = ["spending", "report", "ledger", "recommend", "quiz"];

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
    // 기록(쓰기) 의도 판별:
    //  - 명시적 명령("기록해/적어줘/입력/추가/등록") 이거나
    //  - 금액(숫자+원)과 거래 동사가 함께 있을 때 ("오늘 4000원 사용했어")
    // ※ "지난주 뭐 샀어?"처럼 금액 없는 과거형은 '질문'이므로 기록으로 보지 않는다.
    const hasAmount = /\d[\d,]*\s*원/.test(q) || /(만원|천원)/.test(q);
    const recordCmd = /(기록(해|할|하고|해줘|하자|좀|부탁)|적어(줘|놔)?|입력(해|할|좀)?|추가(해|좀)?|등록(해|좀)?)/.test(t);
    const txnVerb = /(썼|샀|사용|냈|받았|결제|지출|구매|구입)/.test(t);
    if (recordCmd || hasAmount && txnVerb) return null;

    // ── 특수 인텐트 (비교·지원금·가맹점·채널·결제자) — 우선 매칭 ──
    const psX = periodScope(t);
    const rangeOf = () => psX ? { type: "range", ...psX } : null;
    if (/(부모|보호자|엄마|아빠|가족).*(카드|결제|사용|내역)/.test(t)) return { kind: "parentCard" };
    if (/(조르기|조른|충전.*요청|보채)/.test(t)) return { kind: /(비교|보다|대비|또래|친구|학교|충북)/.test(t) ? "nudgeCompare" : "nudgeList" };
    if (/학교.*(별|비교|마다)/.test(t) || /(다른|타)학교/.test(t)) return { kind: "schoolCompare" };
    if (/(친구|또래|애들|학우|반친구|다른학생).*(비교|보다|대비|랑|와|과)/.test(t) || /(또래|친구).*비교/.test(t)) return { kind: "friendCompare" };
    if (/(가맹점|쓸수있는곳|사용가능.*곳|근처|주변|어디서쓸|지도)/.test(t)) return { kind: "merchantMap" };
    if (/((사용가능|쓸수있|사용할수있|남은|남아있).{0,4}(돈|금액|지원금|바우처|포인트))|잔액|지원금.*얼마|얼마.*(남|있|쓸)|쓸돈/.test(t)) return { kind: "balance" };
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
    if (/(월별|달별)/.test(t) || moCount) return { kind: "report", scope: { type: "trend", view: "month", months: moCount ? +moCount[1] : 3 } };
    if (/(일별|날짜별)/.test(t)) return { kind: "report", scope: { type: "trend", view: "week" } };

    const wantsList = /(내역|리스트|목록|기입장|가계부)/.test(t);
    const spend = /(얼마|소비|지출|사용|썼|쓴|샀|구매|구입|결제|쓴돈)/.test(t);
    const ps = periodScope(t);

    // 0) '카테고리별/분류별/항목별' → 카테고리 비중 분석 카드 (기간 없으면 이번 달)
    if (/(카테고리별|분류별|항목별|뭐에)/.test(t)) {
      const rp = ps || { ...DATA.monthRangeOf(DATA.TODAY), label: "이번 달", single: false };
      return { kind: "report", scope: { type: "range", ...rp } };
    }

    // 1) '내역/리스트/기입장' 요청 → 기간별 기입장 리스트 카드
    if (wantsList) return { kind: "ledger", scope: ps ? { type: "range", ...ps } : null };

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
    { role: "user", content: DATA.buildSystemPrompt(grade, ledger) },
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

  // 오프라인(실시간 AI 없음)에서도 간단한 기록 문장을 직접 파싱해 기록
  function parseRecord(q) {
    const t = (q || "").replace(/\s/g, "");
    let amount = 0;
    let m = t.match(/([\d,]+)\s*원/) || t.match(/([\d,]+)/);
    if (m) amount = parseInt(m[1].replace(/,/g, ""), 10) || 0;
    if (/만원/.test(t) && amount < 1000) amount = (amount || 1) * 10000;else
    if (/천원/.test(t) && amount < 1000) amount = (amount || 1) * 1000;
    if (!amount) return null;
    const isIncome = /(받았|받음|용돈|충전|입금|선물|세뱃|벌었|생겼)/.test(t);
    const date = parseDay(t) || DATA.TODAY;
    let cat, title;
    if (isIncome) {
      cat = /선물|세뱃/.test(t) ? "선물" : /용돈/.test(t) ? "용돈" : "기타수입";
      title = cat;
    } else {
      const map = [
      [/편의점|gs25|cu|매점|간식|과자|음료|김밥|떡볶이|분식|햄버거|밥|급식|간식|아이스크림|젤리/, "식비"],
      [/버스|지하철|택시|교통/, "교통"],
      [/문구|문제집|참고서|볼펜|노트|책|학용품/, "학용품"],
      [/영화|웹툰|게임|만화|문화|코인/, "문화"]];

      const hit = map.find(([re]) => re.test(t));
      cat = hit ? hit[1] : "기타";
      title = (q.match(/[가-힣A-Za-z0-9]+(?=에서|에|을|를|샀|먹|사용|썼|구매)/) || [])[0] || cat;
    }
    return { op: "addLedger", type: isIncome ? "income" : "expense", date, cat, title, amount, memo: "" };
  }

  function fallback(q) {
    const t = (q || "").replace(/\s/g, "");
    // 금액이 있는 기록 문장 → 직접 파싱해 기록 (오프라인 대비)
    const rec = parseRecord(q);
    if (rec) {
      const dStr = (() => {const [, mo, d] = rec.date.split("-").map(Number);const rel = rec.date === DATA.TODAY ? "오늘" : rec.date === DATA.dMinus(DATA.TODAY, 1) ? "어제" : `${mo}월 ${d}일`;return rel;})();
      return { text: `${dStr} ${rec.title} ${rec.type === "income" ? "수입" : "지출"} ${DATA.num(rec.amount)}원 기록했어!`, action: rec, card: null };
    }
    // 상세 없는 기록 요청("기록하고 싶어/기록해줘") → 전체 기입장 대신 되묻기(텍스트만)
    if (/(기록|적|입력|추가|써).{0,3}(하고싶|할래|하고파|해줘|해|싶어|할게|좀)/.test(t) && !/\d/.test(t)) {
      return { text: "좋아! 뭘 기록하고 싶은데? 날짜, 금액, 뭘 샀는지(식비/교통 같은 종류) 알려줘.", card: null };
    }
    const intent = DATA.classify(q);
    return { text: DATA.answer(intent, grade), card: intent === "offtopic" ? null : intent };
  }

  const EMOJI_BY_CAT = { 식비: "🍱", 교통: "🚌", 학용품: "📚", 문화: "🎮", 기타: "💡", 용돈: "💸", 선물: "🎁", 기타수입: "💰" };
  function runAction(a) {
    if (!a || a.op !== "addLedger") return null;
    const amount = Math.round(Number(String(a.amount).replace(/[^0-9.]/g, "")) || 0);
    if (!amount) return null;
    const type = a.type === "income" ? "income" : "expense";
    const cat = a.cat || (type === "income" ? "기타수입" : "기타");
    const entry = {
      id: "ai" + Date.now(),
      type, date: a.date || DATA.TODAY, cat,
      emoji: EMOJI_BY_CAT[cat] || (type === "income" ? "💰" : "💡"),
      title: a.title || cat, amount, source: "ai", memo: a.memo || ""
    };
    addEntry(entry);
    return entry;
  }

  // 카드 내부 lazy 질의(예: 리포트 카드 '일별' 탭) — 새 말풍선/대화턴을 만들지 않고 데이터만 가져온다.
  // NL 텍스트가 '본 신호'다(실 오페리아는 텍스트만 받음). intentHint는 시뮬(operia.js) 템플릿/컬럼계약/폴백 라우팅용일 뿐.
  async function cardQuery(text, intentHint) {
    const ci = cardIntent(text);
    const intent = intentHint || (ci && ci.kind) || null;
    return await queryDataSource(text, intent, ci ? ci.scope : null); // { result, sql, source, rawRows }
  }

  async function send(text) {
    const q = (text != null ? text : input).trim();
    if (!q || typing) return;
    setInput("");
    const history = messages;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: q }]);
    setTyping(true);

    // 소비 조회/분석 질의 → 시각화 카드로 바로 응답
    const ci = cardIntent(q);
    if (ci) {
      // ── 데이터 질문 → 오페리아 API 호출 → ChartRenderer 렌더 ──
      // 차트 유형은 응답이 아니라 프론트가 결정(chartTypeForIntent). 응답은 {question,sql,result}.
      // 정적/실서버 모드: 알려진 10개 intent만. AI 시뮬 모드(§8): 미지정 데이터질문도 보내 table로 렌더
      //   (recommend/quiz/ledger 같은 UI/비데이터 카드는 항상 로컬 보존).
      const NON_OPERIA = ["recommend", "quiz", "ledger", "recorded"];
      const useOperia = OPERIA_KINDS.includes(ci.kind) || (isOperiaAiMode() && !NON_OPERIA.includes(ci.kind));
      if (useOperia) {
        showApiToast(`오페리아${isOperiaAiMode() ? "AI" : ""} · ${ci.kind}`, "api");
        try {
          // ↓↓↓ [DEV MOCK] 채널 분기는 getDataSource() 한 곳: VITE_DATA_SOURCE(operia|backend|mock, 미설정→mock) ↓↓↓
          const resp = await queryDataSource(q, ci.kind, ci.scope); // SSE(data→result) 시뮬 소비 → 브리지 resp
          // ↑↑↑ [DEV MOCK] END ↑↑↑
          setTyping(false);
          // §8.5 키 게이팅: 미지원(키 없음) → 차트 대신 친절 텍스트 안내(에러 아님)
          if (resp && resp.unsupported) {
            setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: resp.message }]);
            return;
          }
          // §4.5/§8 오류: 채널이 success=false 로 응답 → errorMessage 표시(backend/operia). mock 은 항상 true.
          if (resp && resp.success === false) {
            showApiToast("채널 오류(success=false)", "error");
            setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: resp.errorMessage || "요청 처리 중 오류가 발생했어. 잠시 후 다시 시도해줘." }]);
            return;
          }
          // §9.5 폴백 가시화: Claude 시도 실패로 템플릿 사용된 경우 dev 토스트
          if (resp && resp.source === "fallback") showApiToast(`⚠️ 템플릿 폴백 · ${ci.kind}`, "error");
          // answer 말풍선(§6/§9): 있으면 카드 위 텍스트, 없으면 생략(10개 intent 는 빈 answer → 기존과 동일, 시각 보존).
          setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: resp.answer || "", chartType: chartTypeForIntent(ci.kind), intent: ci.kind, sql: resp.sql, source: resp.source, scope: ci.scope || null, reportPlan: resp.reportPlan, tableData: resp.tableData, columnMetadata: resp.columnMetadata, summaryStats: resp.summaryStats }]);
        } catch (e) {
          console.error("[데이터] 호출 오류:", e);
          showApiToast("데이터 오류", "error");
          setTyping(false);
          // 스트림 전 HTTP 오류(401/422 등)는 채널 errorMessage 를 그대로 표시(§4.5), generic/네트워크는 기본 안내
          const em = e && e.message;
          setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: em && em !== "datasource error" ? em : "데이터를 불러오지 못했어. 잠시 후 다시 시도해줘." }]);
        }
        return;
      }
      // ── 비데이터 카드(추천/퀴즈/용돈기입장 등) → 기존 로컬 로직 유지 ──
      showApiToast(`로컬 카드 · ${ci.kind}`, "local");
      await new Promise((r) => setTimeout(r, 450));
      setTyping(false);
      setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: ci.kind === "recommend" ? DATA.recommendIntro[grade] || "" : "", card: ci.kind, scope: ci.scope || null, only: ci.only || null }]);
      return;
    }

    // 그 외 → 실제 AI 답변
    let res;
    try {
      const hasAI = aiEnabled && (typeof window !== "undefined" && window.FINFRIEND_AI_ENDPOINT || window.claude && window.claude.complete);
      if (hasAI) {
        showApiToast("🤖 Claude API 호출", "api");
        res = await askAI(q, history);
        if (!res.text) { res = fallback(q); showApiToast("로컬 fallback · 빈 응답", "local"); }
      } else {
        res = fallback(q);
        showApiToast(aiEnabled ? "로컬 응답 · AI 미설정(키없음)" : "로컬 응답 · AI OFF", "local");
      }
    } catch (e) {
      res = fallback(q);
      showApiToast("로컬 fallback · API 오류", "error");
      console.error("[AI] 호출 오류:", e);
    }
    setTyping(false);
    const recorded = res.action ? runAction(res.action) : null;
    // 기록이 됐으면 → 전체 기입장 대신 '방금 기록한 한 건'만 간단히 확인
    if (recorded) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: res.text, card: "recorded", entry: recorded }]);
      return;
    }
    // 데이터 intent 카드는 InlineCard로 렌더하지 않는다(ChartRenderer 단일 경로). AI가 골라도 무시 → 텍스트로 답.
    const DATA_INTENTS = ["spending", "report", "catSpend", "friendCompare", "nudgeCompare", "nudgeList", "merchantMap", "balance", "channel", "merchantBreakdown", "parentCard", "schoolCompare", "timePattern"];
    if (DATA_INTENTS.includes(res.card)) res.card = null;
    setMessages((m) => [...m, { id: Date.now() + 1, role: "ai", text: res.text, card: res.card }]);
  }

  return (
    <div className="relative w-full mx-auto bg-[#F6F6FB] flex flex-col overflow-hidden phone-frame"
    style={{ maxWidth: 390 }}>
      {!WEBVIEW &&
      <Header grade={grade} setGrade={setGrade} tab={tab} setTab={setTab}
      canBack={tab === "금융친구" && entered} onBack={() => { if (started) { setMessages([]); setActiveId(null); } else { setEntered(false); } }}
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3.5 edupay-noscroll">
          {WEBVIEW && !started && <WebviewWelcome />}
          {messages.map((m) => <Bubble key={m.id} msg={m} grade={grade} ledger={ledger} onAdd={addEntry} onUpdate={updateEntry} onDelete={deleteEntry} onSend={send} onOpenContent={setModal} onCardQuery={cardQuery} />)}
          {typing && <Typing />}
          <div className="h-1"></div>
        </div>
        }

      {(started || WEBVIEW) && !inputFocused && <QuickReplyPanel onPick={send} />}
      {/* 입력 바: relative z-10 으로 QuickReplyPanel 위. 가로 overflow로 전송버튼이 절대 잘리지 않게 입력 래퍼 min-w-0 + 버튼 shrink-0 고정폭. */}
      <div className="shrink-0 relative z-10 bg-white/95 backdrop-blur border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-4 pt-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
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
    </div>);

}


export default App;
