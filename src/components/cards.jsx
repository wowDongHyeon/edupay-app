import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { EDUPAY } from "../data/edupay";
// Phase D: 로컬 카드(quiz/recommend)는 _archive 로 이동·라우팅 제거. InlineCard 는 더 이상 이들을 렌더하지 않음.
// ※ 데이터 카드(merchantMap/balance/channel/… 10개 + spending/report/catSpend/timePattern)는
//   새 경로 ChartRenderer→charts/* 로만 렌더한다. 옛 components/extras 데이터 카드는 제거됨.
/* FOX PAY AI — AI 답변에 인라인으로 붙는 데이터 카드들 (Recharts) */
const D = EDUPAY;
const { useState: useStateC } = React;

function CardShell({ title, sub, right, children }) {
  return (
    <div className="mt-2 rounded-2xl bg-white border border-violet-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-bold text-gray-900">{title}</div>
          {sub && <div className="text-[11.5px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
        {right}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

/* 주간/월간 토글 */
function PeriodTabs({ period, setPeriod, labels }) {
  const L = labels || { week: "주간", month: "월간" };
  return (
    <div className="flex bg-gray-100 rounded-full p-0.5 text-[11.5px] font-bold shrink-0">
      {[["week", L.week], ["month", L.month]].map(([k, label]) => (
        <button key={k} onClick={() => setPeriod(k)}
          className={"px-3 py-1 rounded-full transition " + (period === k ? "bg-white text-violet-600 shadow-sm" : "text-gray-400")}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── 도넛: 카테고리별 소비 (주간/월간) ─────────────────── */
function DonutCard() {
  const [period, setPeriod] = useStateC("month");
  const isMonth = period === "month";
  const data = isMonth ? D.monthCategories : D.weekCategories;
  const total = isMonth ? D.monthTotal : D.weekTotal;
  return (
    <CardShell title="카테고리별 소비" sub={isMonth ? "FOX PAY 결제 · 6월" : "FOX PAY 결제 · 이번 주"}
               right={<PeriodTabs period={period} setPeriod={setPeriod} />}>
      <div className="flex items-center gap-3">
        <div className="relative" style={{ width: 130, height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                   innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400">총 지출</span>
            <span className="text-[15px] font-extrabold text-gray-900">{D.num(total)}원</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {data.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }}></span>
              <span className="text-[12px] text-gray-600 flex-1 truncate">{e.name}</span>
              <span className="text-[12px] font-semibold text-gray-900">{D.num(e.value)}원</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-[12px]">
        {isMonth ? (
          <>
            <span className="text-gray-400">전월 대비</span>
            <span className="font-bold text-red-500">▲ +{D.deltaPct}% ({D.num(D.monthTotal - D.lastMonthTotal)}원)</span>
          </>
        ) : (
          <>
            <span className="text-gray-400">바우처 잔액</span>
            <span className="font-bold text-emerald-600">{D.won(D.voucherBalance)}</span>
          </>
        )}
      </div>
    </CardShell>
  );
}

/* ── 막대: 소비 리포트 (주간/월간 + AI 인사이트) ───────── */
const REPORT_INSIGHT = {
  month: {
    초등: "3개월 동안 소비가 조금씩 늘었어요. 다음 달엔 조금 아껴볼까요? 💪",
    중학: "최근 3개월 소비가 꾸준히 늘고 있어. 매점·간식 지출을 줄이면 효과가 클 거야 📈",
    고등: "최근 3개월 우상향 추세입니다. 매점·간식의 변동성이 증가를 견인했어요.",
  },
};

function BarCard({ grade, view, months, result }) {
  const [period, setPeriod] = useStateC(view === "month" ? "month" : "week");
  const isWeek = period === "week";
  // 오페리아 result(월별 추이) 우선 사용 — 없으면 기존 EDUPAY 모델로 폴백
  const resTrend = result && Array.isArray(result.trend)
    ? result.trend.map((t) => { const mo = +(t.month || "").slice(5, 7); return { label: (mo || "") + "월", amount: t.amount }; })
    : null;
  const n = resTrend ? resTrend.length : Math.max(2, Math.min(months || 3, 12));
  const monthData = resTrend || (D.monthlyTrendAll || D.monthlyTrend).slice(-n);
  const data = isWeek ? D.dailySpending : monthData;
  const max = Math.max(...data.map((d) => d.amount));
  const maxItem = data.reduce((a, b) => (b.amount > a.amount ? b : a), data[0]);
  const insight = isWeek
    ? `최근 7일 중 ${maxItem.label}에 가장 많이 썼어 (${D.won(maxItem.amount)}). 큰 지출은 미리 계획해보자 📊`
    : (() => {
        const cur = data[data.length - 1], prev = data[data.length - 2];
        if (!prev || prev.amount === 0) return `${cur.label}에 ${D.won(cur.amount)} 썼어. 다음 달도 계획해서 써보자 📊`;
        const diff = cur.amount - prev.amount, pct = Math.round(Math.abs(diff) / prev.amount * 100);
        return diff > 0
          ? `${prev.label}보다 ${D.won(diff)}(${pct}%) 더 썼어. 다음 달엔 조금 아껴볼까? 💪`
          : `${prev.label}보다 ${D.won(-diff)}(${pct}%) 덜 썼어. 잘하고 있어 👏`;
      })();
  // 결제수단별(바우처/지원금 vs 부모카드) — result.byMeans 우선, 없으면 ledger 집계
  const payerBreak = isWeek ? null : (
    (result && Array.isArray(result.byMeans)) ? (() => {
      const find = (k) => (result.byMeans.find((x) => x.means === k) || {}).amount || 0;
      const voucher = find("VOUCHER"), card = find("APPCARD");
      return { voucher, card, total: (voucher + card) || 1 };
    })() : (monthData.length && monthData[0].start ? (() => {
      const span = { start: monthData[0].start, end: monthData[monthData.length - 1].end };
      const ex = D.ledgerSeed.filter((e) => e.type === "expense" && e.date >= span.start && e.date <= span.end);
      const voucher = ex.filter((e) => e.payer !== "부모카드").reduce((s, e) => s + e.amount, 0);
      const card = ex.filter((e) => e.payer === "부모카드").reduce((s, e) => s + e.amount, 0);
      return { voucher, card, total: (voucher + card) || 1 };
    })() : null)
  );
  return (
    <CardShell title="소비 리포트" sub={isWeek ? "최근 7일 일별 흐름" : `최근 ${n}개월 추이`}
               right={<PeriodTabs period={period} setPeriod={setPeriod} labels={{ week: "일별", month: "월별" }} />}>
      <div style={{ width: "100%", height: 150 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 4, left: 4, bottom: 0 }} barCategoryGap={isWeek ? 14 : (n > 6 ? 12 : 36)}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: n > 6 ? 9 : 11, fill: "#9CA3AF" }} interval={0} />
            <Tooltip cursor={{ fill: "rgba(59,130,246,0.06)" }}
                     formatter={(v) => [D.won(v), "지출"]}
                     contentStyle={{ borderRadius: 12, border: "1px solid #E0E2FA", fontSize: 12 }} />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={isWeek ? 26 : (n > 6 ? 22 : 44)} isAnimationActive={false}>
              <LabelList dataKey="amount" position="top"
                         formatter={(v) => (v && v < 1e7 ? D.num(v) : "")}
                         style={{ fontSize: n > 6 ? 8.5 : 10, fontWeight: 700, fill: "#6B7280" }} />
              {data.map((e, i) => <Cell key={i} fill={e.amount === max ? "#5B4DD6" : "#D7D2F2"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {payerBreak && (
        <div className="mt-3">
          <div className="text-[12px] text-gray-400 mb-2">결제수단별 · 최근 {n}개월 합계</div>
          <div className="flex h-3.5 rounded-full overflow-hidden mb-2.5">
            <div style={{ width: (payerBreak.voucher / payerBreak.total * 100) + "%", background: "#188F8A" }}></div>
            <div style={{ width: (payerBreak.card / payerBreak.total * 100) + "%", background: "#5C6B82" }}></div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#188F8A" }}></span>
              <span className="text-[12.5px] text-gray-600 flex-1">바우처(지원금)</span>
              <span className="text-[11px] text-gray-400 tabular-nums">{Math.round(payerBreak.voucher / payerBreak.total * 100)}%</span>
              <span className="text-[12.5px] font-bold text-gray-900 tabular-nums w-[64px] text-right">{D.num(payerBreak.voucher)}원</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#5C6B82" }}></span>
              <span className="text-[12.5px] text-gray-600 flex-1">부모 카드</span>
              <span className="text-[11px] text-gray-400 tabular-nums">{Math.round(payerBreak.card / payerBreak.total * 100)}%</span>
              <span className="text-[12.5px] font-bold text-gray-900 tabular-nums w-[64px] text-right">{D.num(payerBreak.card)}원</span>
            </div>
          </div>
        </div>
      )}
      <div className="mt-2 flex gap-2 items-start bg-violet-50 rounded-xl px-3 py-2.5">
        <span className="text-[14px] shrink-0">💡</span>
        <p className="text-[12px] text-violet-900 leading-relaxed flex-1">{insight}</p>
      </div>
    </CardShell>
  );
}

// InlineCard — 비데이터 UI 카드 전용(recommend/quiz).
// 데이터 intent(report/catSpend/merchantMap/balance/channel/merchantBreakdown/parentCard/
//   friendCompare/nudgeCompare/schoolCompare/spending/timePattern/nudgeList)는 여기서 렌더하지 않고
//   App.send()가 항상 chartType 메시지로 push → ChartRenderer→charts/* 가 렌더한다(단일 경로).
function InlineCard() {
  // Phase D: 로컬 카드 라우팅 제거 — 렌더 대상 없음(시그니처 단일 경로). 심볼은 App 참조 정리 후 제거 예정.
  return null;
}

Object.assign(window, { InlineCard, CardShell });

export { InlineCard };
