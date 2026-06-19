import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { num, won, monthLabel, dayLabel, ChartShell, DONUT_COLORS } from "./util";
/* 오페리아 result를 입력으로 받는 type 기반 차트 컴포넌트들.
   ChartRenderer가 chartType으로 분기해 호출한다. result만 의존(차트유형은 레지스트리가 결정). */

/* ── bar : 사용 내역 (result {trend:[{month|day,amount}], byMeans?}) ──
   월별/일별 탭 토글(ChartRenderer의 ReportToggleCard가 tab/onTab/로딩·에러를 주입).
   탭은 UI 동작 — 새 말풍선 없이 카드 내부 데이터만 교체. */
export function BarChartCard({ result, tab = "month", onTab, loading, error, onRetry }) {
  const isDay = tab === "day";
  const trend = (result && result.trend) || [];
  const data = trend.map((t) => ({ label: isDay ? dayLabel(t.day) : monthLabel(t.month), amount: t.amount }));
  const max = Math.max(1, ...data.map((d) => d.amount));
  const byMeans = (!isDay && result && result.byMeans) || []; // 수단별 합계는 월별 탭에서만
  const total = byMeans.reduce((s, m) => s + (m.amount || 0), 0) || 1;
  const cur = data[data.length - 1], prev = data[data.length - 2];
  let insight = "";
  if (isDay) {
    const sum = data.reduce((s, d) => s + d.amount, 0);
    if (data.length) insight = `최근 ${data.length}일 동안 ${won(sum)} 썼어. 하루 평균 ${won(Math.round(sum / data.length))} 정도야 📊`;
  } else if (cur && prev && prev.amount) {
    const diff = cur.amount - prev.amount, pct = Math.round(Math.abs(diff) / prev.amount * 100);
    insight = diff >= 0
      ? `${prev.label}보다 ${won(diff)}(${pct}%) 더 썼어. 다음 달엔 조금 아껴볼까? 💪`
      : `${prev.label}보다 ${won(-diff)}(${pct}%) 덜 썼어. 잘하고 있어 👏`;
  } else if (cur) insight = `${cur.label}에 ${won(cur.amount)} 썼어. 계획해서 써보자 📊`;
  const MEANS_COLOR = { VOUCHER: "#188F8A", APPCARD: "#5C6B82" };
  const Toggle = onTab && (
    <div className="mt-3 inline-flex gap-0.5 bg-gray-100 rounded-full p-0.5 text-[12px] font-bold">
      {[["month", "월별"], ["day", "일별"]].map(([k, label]) => (
        <button key={k} onClick={() => onTab(k)}
          className={"px-3.5 py-1 rounded-full transition " + (tab === k ? "bg-white text-violet-600 shadow-sm" : "text-gray-400")}>
          {label}
        </button>
      ))}
    </div>
  );
  return (
    <ChartShell badge={isDay ? "최근 7일" : "최근 3개월"} title={isDay ? "일별 사용 내역" : "월별 사용 내역"} sub={isDay ? "FOX PAY 결제 · 일별 흐름" : "FOX PAY 결제 · 월별 추이"}>
      {Toggle}
      {loading ? (
        <div className="h-[150px] flex flex-col items-center justify-center gap-2.5 text-[13px] text-gray-400">
          <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin"></div>
          일별 내역 불러오는 중…
        </div>
      ) : error ? (
        <div className="h-[150px] flex flex-col items-center justify-center gap-2.5 text-[13px] text-gray-500">
          <div>일별 내역을 불러오지 못했어요.</div>
          <button onClick={onRetry} className="px-3.5 py-1.5 rounded-full bg-violet-100 text-violet-700 font-bold text-[12px] active:scale-95 transition">다시 시도</button>
        </div>
      ) : (
      <>
      <div style={{ width: "100%", height: 150 }} className="mt-2">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 4, left: 4, bottom: 0 }} barCategoryGap={36}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} interval={0} />
            <Tooltip cursor={{ fill: "rgba(59,130,246,0.06)" }} formatter={(v) => [won(v), "사용"]}
              contentStyle={{ borderRadius: 12, border: "1px solid #E0E2FA", fontSize: 12 }} />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={44} isAnimationActive={false}>
              <LabelList dataKey="amount" position="top"
                formatter={(v) => (v ? (v >= 10000 ? (Number.isInteger(v / 10000) ? v / 10000 : (v / 10000).toFixed(1)) + "만" : num(v)) : "")}
                style={{ fontSize: 10, fontWeight: 700, fill: "#6B7280" }} />
              {data.map((e, i) => <Cell key={i} fill={e.amount === max ? "#5B4DD6" : "#D7D2F2"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {byMeans.length > 0 && (
        <div className="mt-3">
          <div className="text-[12px] text-gray-400 mb-2">결제수단별 · 합계</div>
          <div className="flex h-3.5 rounded-full overflow-hidden mb-2.5">
            {byMeans.map((m, i) => (
              <div key={i} style={{ width: (m.amount / total * 100) + "%", background: MEANS_COLOR[m.means] || DONUT_COLORS[i % DONUT_COLORS.length] }}></div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {byMeans.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MEANS_COLOR[m.means] || DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                <span className="text-[12.5px] text-gray-600 flex-1">{m.label}</span>
                <span className="text-[11px] text-gray-400 tabular-nums">{m.pct != null ? m.pct + "%" : Math.round(m.amount / total * 100) + "%"}</span>
                <span className="text-[12.5px] font-bold text-gray-900 tabular-nums w-[64px] text-right">{won(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {insight && <div className="mt-3 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">💡 {insight}</div>}
      </>
      )}
    </ChartShell>
  );
}

/* ── donut : 사용처별 / 온·오프라인 (result = rows[]) ── */
export function DonutChartCard({ result }) {
  const rows = Array.isArray(result) ? result.slice() : [];
  const labelOf = (r) => r.category ?? r.label ?? r.name ?? r.channel ?? "";
  const valOf = (r) => r.amount ?? r.value ?? 0;
  rows.sort((a, b) => valOf(b) - valOf(a));
  const total = rows.reduce((s, r) => s + valOf(r), 0) || 1;
  const data = rows.map((r, i) => ({ name: labelOf(r), value: valOf(r), cnt: r.cnt, pct: r.pct, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  const top = data[0];
  // 온·오프라인(2분류)인지 업종(다분류)인지로 제목 구분
  const isChannel = rows.length > 0 && rows.every((r) => r.channel != null);
  return (
    <ChartShell badge="최근 3개월" title={isChannel ? "온·오프라인 결제 내역" : "사용처별 사용 내역"} sub={isChannel ? "결제 채널별 비중" : "업종별 사용 금액 · 가맹점 기준"}>
      <div className="mt-4 flex items-center gap-3">
        <div className="relative" style={{ width: 130, height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400">총 사용</span>
            <span className="text-[15px] font-extrabold text-gray-900">{num(total)}원</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {data.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }}></span>
              <span className="text-[12px] text-gray-600 flex-1 truncate">{e.name}</span>
              {e.cnt != null && <span className="text-[11px] text-gray-400 tabular-nums">{e.cnt}건</span>}
              <span className="text-[12px] font-semibold text-gray-900 tabular-nums w-[52px] text-right">{num(e.value)}원</span>
            </div>
          ))}
        </div>
      </div>
      {top && (
        <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
          💡 {top.name}이(가) 가장 커 ({num(top.value)}원, 전체의 {top.pct != null ? top.pct : Math.round(top.value / total * 100)}%).
        </div>
      )}
    </ChartShell>
  );
}

/* ── channel : 온·오프라인 결제 내역 (result {offline,online,rows}) ──
   상단 가로 스택바 + 오프라인/온라인 요약박스 2개 + 하단 거래 리스트(최근순). */
const CH_META = {
  OFFLINE: { label: "오프라인", color: "#5B4DD6", soft: "#EDEBFB", emoji: "🏪" },
  ONLINE: { label: "온라인", color: "#16A394", soft: "#E2F3F1", emoji: "🌐" },
};
const dayMD = (dt) => {
  const s = String(dt || ""); const mm = +s.slice(5, 7), dd = +s.slice(8, 10);
  return mm && dd ? `${mm}/${dd}` : "";
};
export function ChannelChartCard({ result }) {
  const off = (result && result.offline) || { amount: 0, count: 0, pct: 0 };
  const on = (result && result.online) || { amount: 0, count: 0, pct: 0 };
  const rows = result && Array.isArray(result.rows) ? result.rows : [];
  const total = off.amount + on.amount || 1;
  const offW = Math.round((off.amount / total) * 100);
  const SummaryBox = ({ ch, d }) => {
    const c = CH_META[ch];
    return (
      <div className="flex-1 rounded-2xl px-3.5 py-3" style={{ background: c.soft }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]">{c.emoji}</span>
          <span className="text-[12.5px] font-bold" style={{ color: c.color }}>{c.label}</span>
          <span className="ml-auto text-[11px] font-bold" style={{ color: c.color }}>{d.pct}%</span>
        </div>
        <div className="mt-1.5 text-[16px] font-extrabold text-gray-900 tabular-nums">{num(d.amount)}<span className="text-[11px] font-bold text-gray-400">원</span></div>
        <div className="text-[11px] text-gray-400">{d.count}건</div>
      </div>
    );
  };
  const shown = rows.slice(0, 8);
  return (
    <ChartShell badge="최근 내역" title="온·오프라인 결제 내역" sub="결제 채널별 · 최근 거래">
      {/* 가로 스택 바 */}
      <div className="mt-3 flex h-3.5 rounded-full overflow-hidden bg-gray-100">
        {off.amount > 0 && <div style={{ width: offW + "%", background: CH_META.OFFLINE.color }}></div>}
        {on.amount > 0 && <div style={{ width: (100 - offW) + "%", background: CH_META.ONLINE.color }}></div>}
      </div>
      {/* 요약 박스 2개 */}
      <div className="mt-3 flex gap-2.5">
        <SummaryBox ch="OFFLINE" d={off} />
        <SummaryBox ch="ONLINE" d={on} />
      </div>
      {/* 거래 리스트(최근순) */}
      <div className="mt-3.5 flex flex-col gap-1">
        {shown.map((r, i) => {
          const c = CH_META[r.channel] || CH_META.OFFLINE;
          return (
            <div key={i} className="flex items-center gap-2.5 py-1 border-b border-gray-50 last:border-0">
              <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: c.soft, color: c.color }}>{c.label}</span>
              <span className="flex-1 min-w-0 text-[13px] text-gray-800 truncate">{r.item}</span>
              <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{dayMD(r.dt)}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0 w-[74px] text-right whitespace-nowrap">−{num(r.amount)}원</span>
            </div>
          );
        })}
        {rows.length > shown.length && (
          <div className="text-[11px] text-gray-400 text-center pt-1.5">+{rows.length - shown.length}건 더</div>
        )}
      </div>
    </ChartShell>
  );
}

/* ── compare : 친구/조르기/학교 비교 (result 모양 3종 정규화) ── */
export function CompareChartCard({ result, intent }) {
  let bars = [], unit = "원", title = "사용 비교", sub = "", footer = "";
  if (Array.isArray(result)) {
    // schoolCompare: [{school, avgPerStudent, students, me}]
    bars = result.map((r) => ({ label: (r.school ?? r.label ?? r.name) + (r.me ? " 🦊" : ""), value: r.avgPerStudent ?? r.amount ?? r.value ?? 0, me: !!r.me }));
    bars.sort((a, b) => b.value - a.value);
    const mean = Math.round(bars.reduce((s, b) => s + b.value, 0) / (bars.length || 1));
    bars.push({ label: "충북 평균", value: mean, avg: true });
    title = "학교별 사용 비교"; sub = "학생 1인당 평균 · 학교별";
    const me = bars.find((b) => b.me);
    if (me) footer = me.value >= mean ? `우리 학교는 평균보다 ${num(me.value - mean)}원 더 써. 조금 아껴볼까? 💪` : `우리 학교는 평균보다 ${num(mean - me.value)}원 적게 쓰는 알뜰한 학교네! 🦊`;
  } else if (result && Array.isArray(result.bars)) {
    // friendCompare: {me, schoolGradeAvg, provinceAvg, percentile, bars:[{label, amount, me}]}
    bars = result.bars.map((b) => ({ label: b.label, value: b.amount ?? b.value ?? 0, me: !!b.me }));
    title = "친구들과 사용 비교"; sub = "같은 학년끼리 비교";
    if (result.percentile != null) footer = `같은 학년 중 상위 ${100 - result.percentile}% 수준이야.`;
  } else {
    bars = [];
  }
  const max = Math.max(1, ...bars.map((b) => b.value || 0));
  return (
    <ChartShell badge="이번 달" title={title} sub={sub}>
      <div className="mt-4 flex flex-col gap-3">
        {bars.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-[92px] shrink-0">
              <div className={"text-[12.5px] leading-tight truncate " + (b.me ? "font-extrabold text-violet-600" : b.avg ? "font-bold text-gray-500" : "text-gray-600")}>{b.label}</div>
              {b.amt != null && <div className="text-[10.5px] text-gray-400 leading-tight">{num(b.amt)}원</div>}
            </div>
            <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: Math.max((b.value || 0) / max * 100, 5) + "%", background: b.me ? "#5B4DD6" : b.avg ? "#A99DF6" : "#D7D2F2" }}></div>
            </div>
            <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-[60px] text-right whitespace-nowrap">{num(b.value)}{unit}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">💡 {footer}</div>}
    </ChartShell>
  );
}

/* ── schoolRank : 학교별 사용 비교(§5 ⑩) — 충북 중학교 결제 TOP5 랭킹 + 우리학교 등수 강조 + 충북 평균 ──
   result {ranking:[{rank,school,avgPerStudent,me}], myRank, myAvg, provinceAvg, schoolCount} */
export function SchoolRankChartCard({ result }) {
  const ranking = result && Array.isArray(result.ranking) ? result.ranking : [];
  const provinceAvg = (result && result.provinceAvg) || 0;
  const myRank = result && result.myRank;
  const myAvg = (result && result.myAvg) || 0;
  const maxV = Math.max(1, provinceAvg, ...ranking.map((r) => r.avgPerStudent || 0));
  const diff = myAvg - provinceAvg;
  const footer = myRank
    ? `우리 학교는 충북 중학교 중 ${myRank}위예요. 충북 평균보다 ${num(Math.abs(diff))}원 ${diff >= 0 ? "많이" : "적게"} 써요.`
    : "";
  return (
    <ChartShell badge="충북 중학교" title="학교별 사용 비교" sub="충청북도 중학교 결제 TOP5 · 1인당 평균">
      <div className="mt-3 flex flex-col gap-1.5">
        {ranking.map((r, i) => (
          <div key={i} className={"flex items-center gap-2 rounded-xl px-2 py-1.5 " + (r.me ? "bg-violet-50" : "")}>
            <span className={"w-5 shrink-0 text-center text-[13px] font-extrabold " + (r.me ? "text-violet-600" : r.rank === 1 ? "text-amber-500" : "text-gray-400")}>{r.rank}</span>
            <div className="w-[92px] shrink-0 flex items-center gap-1 min-w-0">
              {r.me && <span className="shrink-0">🦊</span>}
              <span className={"truncate text-[12.5px] " + (r.me ? "font-extrabold text-violet-700" : "text-gray-700")}>{r.school}</span>
            </div>
            <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: Math.max((r.avgPerStudent || 0) / maxV * 100, 5) + "%", background: r.me ? "#5B4DD6" : r.rank === 1 ? "#F5B83D" : "#D7D2F2" }}></div>
            </div>
            <span className="text-[12px] font-bold text-gray-800 tabular-nums shrink-0 w-[58px] text-right whitespace-nowrap">{num(r.avgPerStudent)}원</span>
          </div>
        ))}
      </div>
      {/* 충북 평균 (점선 구분) */}
      <div className="mt-2 pt-2.5 border-t border-dashed border-gray-200 flex items-center gap-2 px-2">
        <span className="w-5 shrink-0"></span>
        <div className="w-[92px] shrink-0 text-[12.5px] text-gray-500">충북 평균</div>
        <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: Math.max(provinceAvg / maxV * 100, 5) + "%", background: "#A99DF6" }}></div>
        </div>
        <span className="text-[12px] font-bold text-gray-500 tabular-nums shrink-0 w-[58px] text-right whitespace-nowrap">{num(provinceAvg)}원</span>
      </div>
      {footer && <div className="mt-3 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">💡 {footer}</div>}
    </ChartShell>
  );
}

/* ── nudgeTrend : 내 조르기 추이(§5 ④) — 이번 달 vs 지난달 박스 + 월별 충전 요청 리스트 ──
   result {thisMonth{cnt,amount}, lastMonth{cnt,amount}, diffCnt, monthly:[{month,cnt,amount}]} */
export function NudgeTrendChartCard({ result }) {
  const tm = (result && result.thisMonth) || { cnt: 0, amount: 0 };
  const lm = (result && result.lastMonth) || { cnt: 0, amount: 0 };
  const monthly = result && Array.isArray(result.monthly) ? result.monthly : [];
  const diffCnt = result && result.diffCnt != null ? result.diffCnt : (tm.cnt || 0) - (lm.cnt || 0);
  const maxAmt = Math.max(1, ...monthly.map((m) => m.amount || 0));
  const diffLabel = diffCnt > 0 ? `지난달보다 +${diffCnt}회` : diffCnt < 0 ? `지난달보다 ${diffCnt}회` : "지난달과 같음";
  const footer = diffCnt > 0
    ? `지난달보다 ${diffCnt}번 더 충전 요청했어. 꼭 필요한지 생각해볼까? 💪`
    : `지난달보다 충전 요청이 ${diffCnt < 0 ? "줄었어" : "늘지 않았어"}. 잘 관리하고 있어 👏`;
  return (
    <ChartShell badge="이번 달" title="내 조르기 추이" sub="이번 달 vs 지난달 · 월별 충전 요청">
      {/* 상단 박스 2개: 이번 달 횟수 / 이번 달 금액 */}
      <div className="mt-3 flex gap-2.5">
        <div className="flex-1 rounded-2xl px-3.5 py-3 bg-violet-50">
          <div className="text-[12px] font-bold text-violet-600">이번 달 충전 요청</div>
          <div className="mt-1 text-[18px] font-extrabold text-gray-900 tabular-nums">{tm.cnt}<span className="text-[12px] font-bold text-gray-400">회</span></div>
          <div className="text-[11px] text-gray-400">{diffLabel}</div>
        </div>
        <div className="flex-1 rounded-2xl px-3.5 py-3 bg-emerald-50">
          <div className="text-[12px] font-bold text-emerald-700">이번 달 충전 금액</div>
          <div className="mt-1 text-[18px] font-extrabold text-gray-900 tabular-nums">{num(tm.amount)}<span className="text-[12px] font-bold text-gray-400">원</span></div>
          <div className="text-[11px] text-gray-400">지난달 {num(lm.amount)}원</div>
        </div>
      </div>
      {/* 월별 충전 요청 리스트 (가로 바: 금액 기준, 최근 월 강조) */}
      <div className="mt-3.5">
        <div className="text-[12px] text-gray-400 mb-2">월별 충전 요청</div>
        <div className="flex flex-col gap-2">
          {monthly.map((m, i) => {
            const last = i === monthly.length - 1;
            return (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-[40px] shrink-0 text-[12px] text-gray-500">{monthLabel(m.month)}</span>
                <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.max((m.amount || 0) / maxAmt * 100, 6) + "%", background: last ? "#5B4DD6" : "#C2BAEC" }}></div>
                </div>
                <span className="text-[11px] text-gray-400 tabular-nums shrink-0 w-[34px] text-right">{m.cnt}회</span>
                <span className="text-[12.5px] font-bold text-gray-800 tabular-nums shrink-0 w-[64px] text-right whitespace-nowrap">{num(m.amount)}원</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3.5 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">💡 {footer}</div>
    </ChartShell>
  );
}

/* ── balanceList : 지금 쓸 수 있는 금액(§5 ⑥) — 합계/도넛 없이 항목 3개 '남은 금액'만 ──
   result {voucher{label,sub,limit,used,balance}, charge{...,received,used,balance}, points{label,sub,balance,unit}} */
export function BalanceListCard({ result }) {
  const v = (result && result.voucher) || {};
  const c = (result && result.charge) || {};
  const pt = (result && result.points) || {};
  const Row = ({ icon, label, sub, value, unit, tint, ink }) => (
    <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: tint }}>
      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[17px] shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold" style={{ color: ink }}>{label}</div>
        <div className="text-[11px]" style={{ color: ink, opacity: 0.7 }}>{sub}</div>
      </div>
      <div className="text-[17px] font-extrabold tracking-[-0.02em] tabular-nums shrink-0" style={{ color: ink }}>{num(value)}<span className="text-[12px] font-bold">{unit}</span></div>
    </div>
  );
  return (
    <ChartShell badge="실시간" title="지금 쓸 수 있는 금액" sub="항목별 남은 금액 · 합산되지 않아요">
      <div className="mt-3 flex flex-col gap-2.5">
        <Row icon="🎫" label={v.label || "바우처(지원금)"} sub={v.sub || "학생 복지 지원금"} value={v.balance} unit="원" tint="#E2F3F2" ink="#0F5A57" />
        <Row icon="💸" label={c.label || "용돈 충전금"} sub={c.sub || "보호자가 충전한 용돈"} value={c.balance} unit="원" tint="#FAEAF1" ink="#8E2F52" />
        <Row icon="⭐" label={pt.label || "에듀포인트"} sub={pt.sub || "질문·퀴즈로 모은 포인트"} value={pt.balance} unit={pt.unit || "P"} tint="#FFF4E0" ink="#8A5A12" />
      </div>
      <div className="mt-3 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed" style={{ background: "#F6F6FB", color: "#6B6E78" }}>
        💡 바우처와 용돈 충전금은 따로 관리돼요. 포인트는 결제와 별개로 쌓이는 거예요!
      </div>
    </ChartShell>
  );
}

/* ── barlist : 어디에 주로(가맹점별 비율) (result = rows[{merchant, amount, pct}]) ── */
export function BarListChartCard({ result }) {
  const rows = Array.isArray(result) ? result.slice() : [];
  const labelOf = (r) => r.merchant ?? r.name ?? r.label ?? "";
  const valOf = (r) => r.amount ?? r.value ?? 0;
  rows.sort((a, b) => valOf(b) - valOf(a));
  const total = rows.reduce((s, r) => s + valOf(r), 0) || 1;
  const max = Math.max(1, ...rows.map(valOf));
  const top = rows[0];
  return (
    <ChartShell badge="최근 3개월" title="주로 어디에 썼을까?" sub="가맹점별 사용 금액 순">
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((m, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-5 text-[12px] font-extrabold text-gray-400 text-center shrink-0">{i + 1}</span>
            <span className="w-[96px] text-[12.5px] text-gray-700 shrink-0 truncate">{labelOf(m)}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: Math.max(valOf(m) / max * 100, 6) + "%", background: "#5B4DD6" }}></div></div>
            <span className="text-[11px] text-gray-400 w-8 text-right tabular-nums">{m.pct != null ? m.pct + "%" : Math.round(valOf(m) / total * 100) + "%"}</span>
            <span className="text-[12.5px] font-bold text-gray-800 w-[52px] text-right tabular-nums">{num(valOf(m))}</span>
          </div>
        ))}
      </div>
      {top && (
        <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
          💡 {labelOf(top)}에서 제일 많이 썼어 ({num(valOf(top))}원, 전체의 {top.pct != null ? top.pct : Math.round(valOf(top) / total * 100)}%). 자주 가는 곳이네!
        </div>
      )}
    </ChartShell>
  );
}

/* ── list : 부모카드 사용 내역 (result {total, count, rows:[{date, merchant, amount}]}) ── */
export function ListChartCard({ result }) {
  const rows = (result && Array.isArray(result.rows) ? result.rows : []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = result && result.total != null ? result.total : rows.reduce((s, r) => s + (r.amount || 0), 0);
  const count = result && result.count != null ? result.count : rows.length;
  const fmt = (iso) => { const [, m, d] = String(iso).split("-").map(Number); return `${m}월 ${d}일`; };
  return (
    <ChartShell badge="보호자 카드" title="부모 카드 사용 내역" sub="연계된 보호자 카드 결제">
      <div className="mt-3 text-[26px] font-extrabold text-gray-900">{num(total)}원</div>
      <div className="text-[12px] text-gray-400 mb-3">총 {count}건 · 본인 지원금과 분리 표기</div>
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-[13px] text-gray-400">보호자 카드 결제 내역이 없어요 👍</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((e, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">💳</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-gray-800 truncate">{e.merchant}</div>
                <div className="text-[11px] text-gray-400">{fmt(e.date)} · 부모카드</div>
              </div>
              <span className="text-[13.5px] font-bold text-gray-900 tabular-nums shrink-0">-{num(e.amount)}원</span>
            </div>
          ))}
        </div>
      )}
    </ChartShell>
  );
}
