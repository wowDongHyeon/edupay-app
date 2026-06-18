import React from "react";
import { EDUPAY } from "../data/edupay";
/* FOX PAY AI — 날짜별 소비 시각화 카드 (AI 답변 인라인)
   "오늘/어제/N일 얼마 썼어?" → 그 날의 합계 + 카테고리 막대 + 거래 내역 */

function DailySpendCard({ ledger, date }) {
  const D = EDUPAY;
  const meta = D.CAT_META;
  const entries = (ledger || []).filter((e) => e.date === date && e.type === "expense");
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const rel = D.dayLabel(date);                 // 오늘 / 어제 / 6/6
  const [, mo, d] = date.split("-").map(Number);
  const dateStr = `${mo}월 ${d}일`;
  const relPrefix = rel === "오늘" || rel === "어제" ? rel + " · " : "";

  // 카테고리 집계
  const byCat = {};
  entries.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  const cats = Object.entries(byCat)
    .map(([name, value]) => ({ name, value, ...(meta[name] || meta["기타"]) }))
    .sort((a, b) => b.value - a.value);
  const maxCat = cats.length ? cats[0].value : 1;

  return (
    <div className="rounded-[22px] bg-white border border-violet-50 shadow-sm px-5 py-5 edupay-fade">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12.5px] text-gray-400">{relPrefix}{dateStr} 지출</div>
          <div className="text-[27px] font-extrabold text-gray-900 tracking-[-0.02em] mt-0.5">{D.num(total)}원</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-7 text-center">
          <div className="text-[15px] font-bold text-gray-700">이 날은 쓴 기록이 없어요</div>
          <div className="text-[12.5px] text-gray-400 mt-1">FOX PAY 결제가 없는 날이에요 👍</div>
        </div>
      ) : (
        <>
          {/* 카테고리별 막대 */}
          <div className="mt-4 flex flex-col gap-2.5">
            {cats.map((c, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-[60px] text-[12.5px] text-gray-500 shrink-0 truncate">{c.name}</span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.max((c.value / maxCat) * 100, 7) + "%", background: c.color }}></div>
                </div>
                <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-[52px] text-right">{D.num(c.value)}</span>
              </div>
            ))}
          </div>

          {/* 거래 내역 */}
          <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col gap-2.5">
            {entries.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{e.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] text-gray-800 font-medium truncate">{e.title}</div>
                  <div className="text-[11px] text-gray-400">{e.cat}{e.source === "auto" ? " · 자동결제" : " · 직접입력"}</div>
                </div>
                <span className="text-[13.5px] font-bold text-gray-900 tabular-nums shrink-0">-{D.num(e.amount)}원</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { DailySpendCard });

/* 기록 완료 확인 — 방금 추가한 한 건만 간단히 */
function RecordedCard({ entry, onSend }) {
  const D = EDUPAY;
  if (!entry) return null;
  const isIncome = entry.type === "income";
  const [, mo, d] = entry.date.split("-").map(Number);
  const rel = D.dayLabel(entry.date);
  const dateStr = (rel === "오늘" || rel === "어제" ? rel + " · " : "") + `${mo}월 ${d}일`;
  return (
    <div className="rounded-[22px] bg-white border border-violet-50 shadow-sm px-4 py-4 edupay-fade">
      <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-600 mb-3">
        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
        용돈기입장에 기록했어요
      </div>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-[20px] shrink-0">{entry.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-gray-900 truncate">{entry.title}</div>
          <div className="text-[12px] text-gray-400">{dateStr} · {entry.cat}</div>
        </div>
        <span className={"text-[17px] font-extrabold tabular-nums shrink-0 " + (isIncome ? "text-emerald-600" : "text-gray-900")}>
          {isIncome ? "+" : "-"}{D.num(entry.amount)}원
        </span>
      </div>
      {onSend && (
        <button onClick={() => onSend("용돈기입장 전체 보여줘")}
          className="w-full mt-3.5 py-2.5 rounded-xl bg-violet-50 text-violet-600 text-[13px] font-bold active:bg-violet-100">
          용돈기입장 전체 보기
        </button>
      )}
    </div>
  );
}

Object.assign(window, { DailySpendCard, RecordedCard });

/* 기간별 소비패턴 분석 — 요청한 기간의 카테고리 비중 + 일별 흐름 + 인사이트 */
function PeriodReportCard({ ledger, range }) {
  const D = EDUPAY;
  const meta = D.CAT_META;
  const inR = (e) => e.date >= range.start && e.date <= range.end;
  const entries = (ledger || []).filter((e) => e.type === "expense" && inR(e));
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const fmtMD = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${m}월 ${d}일`; };
  const rangeStr = range.start === range.end ? fmtMD(range.start) : `${fmtMD(range.start)} ~ ${fmtMD(range.end)}`;

  // 카테고리 집계
  const byCat = {};
  entries.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  const cats = Object.entries(byCat)
    .map(([name, value]) => ({ name, value, ...(meta[name] || meta["기타"]) }))
    .sort((a, b) => b.value - a.value);
  const maxCat = cats.length ? cats[0].value : 1;

  // 일별 흐름 (기간 길이만큼, 최대 31일)
  const days = [];
  let cur = range.start;
  for (let i = 0; i < 31 && cur <= range.end; i++) { days.push(cur); cur = D.dMinus(cur, -1); }
  const daySum = (iso) => entries.filter((e) => e.date === iso).reduce((s, e) => s + e.amount, 0);
  const dayData = days.map((iso) => ({ iso, amt: daySum(iso) }));
  const maxDay = Math.max(1, ...dayData.map((d) => d.amt));
  const peak = dayData.reduce((a, b) => (b.amt > a.amt ? b : a), dayData[0] || { iso: range.start, amt: 0 });

  const top = cats[0];
  const insight = total === 0
    ? "이 기간엔 쓴 기록이 없어. 다음에 또 확인해보자 👍"
    : `${top.name}에 가장 많이 썼어 (${D.num(top.value)}원, ${Math.round((top.value / total) * 100)}%). 한눈에 패턴이 보이지? 📊`;

  return (
    <div className="rounded-[22px] bg-white border border-violet-50 shadow-sm px-5 py-5 edupay-fade">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12.5px] font-bold text-violet-600 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-violet-50">{range.label || "기간"}</span>
            <span className="text-gray-400 font-medium">{rangeStr}{range.sub ? ` (${range.sub})` : ""}</span>
          </div>
          <div className="text-[12.5px] text-gray-400 mt-2">소비패턴 분석 · 총 지출</div>
          <div className="text-[26px] font-extrabold text-gray-900 tracking-[-0.02em]">{D.num(total)}원</div>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-7 text-center text-[14px] text-gray-500">이 기간엔 쓴 기록이 없어요 👍</div>
      ) : (
        <>
          {/* 카테고리 비중 */}
          <div className="mt-4">
            <div className="text-[12px] text-gray-400 mb-2">카테고리별</div>
            <div className="flex flex-col gap-2.5">
              {cats.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5">
                    <span className="w-[60px] text-[12.5px] text-gray-500 shrink-0 truncate">{c.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: Math.max((c.value / maxCat) * 100, 7) + "%", background: c.color }}></div>
                  </div>
                  <span className="text-[12px] text-gray-400 tabular-nums w-9 text-right">{Math.round((c.value / total) * 100)}%</span>
                  <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-[52px] text-right">{D.num(c.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
            💡 {insight}
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { DailySpendCard, RecordedCard, PeriodReportCard });

/* 특정 카테고리/가맹점 사용액 — "이번달 편의점 얼마 썼어?" */
const CATSPEND_MATCH = {
  "편의점": (e) => /편의점|gs25|cu|세븐|이마트24|미니스톱/i.test((e.title || "") + (e.merchant || "")),
  "매점·간식": (e) => e.cat === "매점·간식",
  "식비": (e) => e.cat === "식비",
  "교통": (e) => e.cat === "교통",
  "학용품": (e) => e.cat === "학용품",
  "문화": (e) => e.cat === "문화",
};
function CategorySpendCard({ ledger, range, ckey, label }) {
  const D = EDUPAY;
  const r = range || D.thisMonthRange;
  const match = CATSPEND_MATCH[ckey] || ((e) => e.cat === ckey);
  const fmt = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${m}월 ${d}일`; };
  const all = (ledger || D.ledgerSeed).filter((e) => e.type === "expense" && e.date >= r.start && e.date <= r.end);
  const hit = all.filter(match).sort((a, b) => (a.date < b.date ? 1 : -1));
  const sum = hit.reduce((s, e) => s + e.amount, 0);
  const monthSum = all.reduce((s, e) => s + e.amount, 0) || 1;
  const pct = Math.round(sum / monthSum * 100);
  const rangeStr = r.start === r.end ? fmt(r.start) : `${fmt(r.start)} ~ ${fmt(r.end)}`;
  return (
    <div className="rounded-[22px] bg-white border border-violet-50 shadow-sm px-5 py-5 edupay-fade">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full bg-violet-50 text-[11.5px] font-bold text-violet-600">{r.label || "이번 달"}</span>
          <div className="text-[14px] text-gray-400">{label} 사용 금액 · {rangeStr}</div>
          <div className="text-[30px] font-extrabold text-gray-900 tracking-[-0.02em] mt-0.5">{D.num(sum)}원</div>
        </div>
      </div>
      {hit.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-7 text-center text-[14px] text-gray-500">{r.label || "이번 달"}엔 {label} 사용 기록이 없어요 👍</div>
      ) : (
        <>
          <div className="mt-2 text-[12.5px] text-gray-400">총 {hit.length}건 · 전체 지출의 {pct}%</div>
          <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-violet-500" style={{ width: Math.max(pct, 3) + "%" }}></div>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            {hit.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{e.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-gray-800 truncate">{e.title}</div>
                  <div className="text-[11px] text-gray-400">{fmt(e.date)} · {e.cat}</div>
                </div>
                <span className="text-[13.5px] font-bold text-gray-900 tabular-nums shrink-0">-{D.num(e.amount)}원</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
            💡 {r.label || "이번 달"} {label}에 {D.num(sum)}원 썼어. 전체 소비의 {pct}%를 차지해.
          </div>
        </>
      )}
    </div>
  );
}

export { DailySpendCard, RecordedCard, PeriodReportCard, CategorySpendCard };
