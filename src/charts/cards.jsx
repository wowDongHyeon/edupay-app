import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { num, won, monthLabel, ChartShell, DONUT_COLORS } from "./util";
/* 오페리아 result를 입력으로 받는 type 기반 차트 컴포넌트들.
   ChartRenderer가 chartType으로 분기해 호출한다. result만 의존(차트유형은 레지스트리가 결정). */

/* ── bar : 월별 사용 내역 (result {trend:[{month,amount}], byMeans:[{means,label,amount,pct}]}) ── */
export function BarChartCard({ result }) {
  const trend = (result && result.trend) || [];
  const data = trend.map((t) => ({ label: monthLabel(t.month), amount: t.amount }));
  const max = Math.max(1, ...data.map((d) => d.amount));
  const byMeans = (result && result.byMeans) || [];
  const total = byMeans.reduce((s, m) => s + (m.amount || 0), 0) || 1;
  const cur = data[data.length - 1], prev = data[data.length - 2];
  let insight = "";
  if (cur && prev && prev.amount) {
    const diff = cur.amount - prev.amount, pct = Math.round(Math.abs(diff) / prev.amount * 100);
    insight = diff >= 0
      ? `${prev.label}보다 ${won(diff)}(${pct}%) 더 썼어. 다음 달엔 조금 아껴볼까? 💪`
      : `${prev.label}보다 ${won(-diff)}(${pct}%) 덜 썼어. 잘하고 있어 👏`;
  } else if (cur) insight = `${cur.label}에 ${won(cur.amount)} 썼어. 계획해서 써보자 📊`;
  const MEANS_COLOR = { VOUCHER: "#188F8A", APPCARD: "#5C6B82" };
  return (
    <ChartShell badge="최근 3개월" title="월별 사용 내역" sub="FOX PAY 결제 · 월별 추이">
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
  } else if (result && result.me && typeof result.me === "object") {
    // nudgeCompare: {me:{count,amount}, schoolGradeAvg:{count,amount}, provinceAvg:{count,amount}, monthly:[...]}
    unit = "회";
    bars = [
      { label: "나", value: result.me.count, me: true, amt: result.me.amount },
      { label: "우리학교 같은학년", value: result.schoolGradeAvg && result.schoolGradeAvg.count, amt: result.schoolGradeAvg && result.schoolGradeAvg.amount },
      { label: "충북 평균", value: result.provinceAvg && result.provinceAvg.count, amt: result.provinceAvg && result.provinceAvg.amount },
    ];
    title = "조르기 내역 비교"; sub = "충전 요청 횟수 · 같은 학년/충북 평균";
    const diff = (result.me.count || 0) - ((result.schoolGradeAvg && result.schoolGradeAvg.count) || 0);
    footer = diff > 0 ? `같은 학년 평균보다 ${Math.round(diff * 10) / 10}회 더 졸랐어. 꼭 필요한지 생각해볼까? 💪` : "같은 학년 평균보다 조르기가 적어. 잘 관리하고 있어 👏";
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
      {/* nudgeCompare 월별 미니바 */}
      {result && Array.isArray(result.monthly) && result.monthly.length > 0 && (
        <div className="mt-4">
          <div className="text-[12px] text-gray-400 mb-2">월별 조르기 횟수</div>
          <div className="flex items-end justify-between gap-2" style={{ height: 64 }}>
            {result.monthly.map((m, i) => {
              const mx = Math.max(1, ...result.monthly.map((x) => x.count));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-violet-600">{m.count}</span>
                  <div className="w-full rounded-t-md" style={{ height: Math.max(m.count / mx * 40, 6) + "px", background: i === result.monthly.length - 1 ? "#5B4DD6" : "#C2BAEC" }}></div>
                  <span className="text-[11px] text-gray-400">{monthLabel(m.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {footer && <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">💡 {footer}</div>}
    </ChartShell>
  );
}

/* ── gauge : 남은 금액(잔액) (result {voucher, beg, appcard, totalAvailable}) ── */
export function GaugeChartCard({ result }) {
  const v = (result && result.voucher) || { limit: 0, used: 0, balance: 0 };
  const beg = (result && result.beg) || { received: 0, used: 0, balance: 0 };
  const vPct = v.limit ? Math.round(v.balance / v.limit * 100) : 0;
  // 도넛형 게이지 (바우처 잔액/한도)
  const R = 34, C = 2 * Math.PI * R, off = C * (1 - vPct / 100);
  const Row = ({ icon, label, sub, value, tint, ink }) => (
    <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: tint }}>
      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[17px] shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold" style={{ color: ink }}>{label}</div>
        <div className="text-[11px]" style={{ color: ink, opacity: 0.7 }}>{sub}</div>
      </div>
      <div className="text-[17px] font-extrabold tracking-[-0.02em] tabular-nums shrink-0" style={{ color: ink }}>{num(value)}<span className="text-[12px] font-bold">원</span></div>
    </div>
  );
  return (
    <ChartShell badge="실시간" title="지금 쓸 수 있는 금액" sub="바우처·조르기 잔액 합산">
      <div className="mt-3 flex items-center gap-4 rounded-2xl px-4 py-4" style={{ background: "linear-gradient(135deg,#5B4DD6,#4A3FB0)" }}>
        <div className="relative shrink-0" style={{ width: 86, height: 86 }}>
          <svg width="86" height="86" viewBox="0 0 86 86">
            <circle cx="43" cy="43" r={R} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="9" />
            <circle cx="43" cy="43" r={R} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 43 43)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[17px] font-extrabold text-white leading-none">{vPct}%</span>
            <span className="text-[9px] text-white/70 mt-0.5">바우처</span>
          </div>
        </div>
        <div>
          <div className="text-[12px] font-bold text-white/75">사용 가능 합계</div>
          <div className="mt-1 text-[28px] font-extrabold text-white tracking-[-0.02em]">{num(result && result.totalAvailable)}<span className="text-[15px] font-bold">원</span></div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        <Row icon="🎫" label="바우처(지원금)" sub={`한도 ${num(v.limit)}원 중 ${num(v.used)}원 사용`} value={v.balance} tint="#E2F3F2" ink="#0F5A57" />
        <Row icon="💸" label="조르기 받은 금액" sub={`받음 ${num(beg.received)}원 중 ${num(beg.used)}원 사용`} value={beg.balance} tint="#FAEAF1" ink="#8E2F52" />
      </div>
      <div className="mt-3 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed" style={{ background: "#F6F6FB", color: "#6B6E78" }}>
        💡 바우처 잔액은 한도의 {vPct}%가 남았어. {(result && result.appcard && result.appcard.note) || "부모카드는 카드사 한도(외부)"} 라 여기엔 합산되지 않아!
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
