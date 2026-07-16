import React from "react";
import { EDUPAY } from "../data/edupay";
/* 에듀페이 AI — 금융교육 추천 카드 + 슬라이드업 모달 (퀴즈 / 예산·복리 계산기) */
  const { useState, useEffect, useRef } = React;
  const RD = EDUPAY;
  const won = RD.won, num = RD.num;

  /* 카운트업 애니메이션 — rAF가 멈춰도 커밋 값은 항상 target (정확) */
  function useCountUp(target, dur = 700) {
    const [v, setV] = useState(target);
    const fromRef = useRef(target);
    useEffect(() => {
      const from = fromRef.current;
      setV(target);            // 폴백: 합성/ rAF가 멈춰도 최종 값은 target
      fromRef.current = target;
      if (from === target) return;
      let raf, start;
      const tick = (t) => {
        if (start == null) start = t;
        const p = Math.min(1, (t - start) / dur);
        setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [target]);
    return v;
  }

  function Slider({ label, value, set, min, max, step, fmt, accent }) {
    return (
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[12px] font-semibold text-gray-500">{label}</span>
          <span className="text-[13px] font-extrabold" style={{ color: accent }}>{fmt(value)}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => set(+e.target.value)}
          className="w-full edupay-range" style={{ accentColor: accent }} />
      </div>
    );
  }

  /* ── 예산 50/30/20 계산기 (중학) ─────────────────────── */
  function BudgetCalc() {
    const [allowance, setAllowance] = useState(50000);
    const need = Math.round(allowance * 0.5), want = Math.round(allowance * 0.3), save = Math.round(allowance * 0.2);
    const rows = [
      { label: "필수 (50%)", v: need, c: "#5B4DD6", desc: "교통·준비물 등" },
      { label: "갖고 싶은 것 (30%)", v: want, c: "#D99A36", desc: "간식·취미" },
      { label: "저축 (20%)", v: save, c: "#2E9E7B", desc: "모으기" },
    ];
    return (
      <div className="rounded-2xl bg-gray-50 p-4">
        <Slider label="월 용돈" value={allowance} set={setAllowance} min={10000} max={200000} step={5000}
          fmt={won} accent="#5B4DD6" />
        <div className="flex flex-col gap-2 mt-3">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-1.5 self-stretch rounded-full" style={{ background: r.c }}></div>
              <div className="flex-1">
                <div className="text-[12.5px] font-bold text-gray-800">{r.label}</div>
                <div className="text-[10.5px] text-gray-400">{r.desc}</div>
              </div>
              <div className="text-[14px] font-extrabold tabular-nums" style={{ color: r.c }}>{won(r.v)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 text-[11.5px] text-gray-500 flex items-center justify-between">
          <span>내 월 평균 지출</span>
          <span className="font-bold text-gray-700">{won(RD.avgMonthlySpend)}</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: need * 1 < RD.avgMonthlySpend ? "#D96A6A" : "#2E9E7B" }}>
          {allowance < RD.avgMonthlySpend
            ? "지금 용돈은 평균 지출보다 적어요. 저축 20%부터 먼저 떼어두는 게 좋아요!"
            : "좋아요! 저축 20%를 지키면 한 달에 " + won(save) + "을 모을 수 있어요 💰"}
        </p>
      </div>
    );
  }

  /* ── 복리 시뮬레이터 (고등) ──────────────────────────── */
  function CompoundCalc() {
    const [monthly, setMonthly] = useState(30000);
    const [years, setYears] = useState(5);
    const [rate, setRate] = useState(3);
    const n = years * 12, r = rate / 100 / 12;
    const fv = r === 0 ? monthly * n : Math.round(monthly * ((Math.pow(1 + r, n) - 1) / r));
    const principal = monthly * n;
    const interest = fv - principal;
    const shown = useCountUp(fv, 650);
    return (
      <div className="rounded-2xl bg-gray-50 p-4">
        <Slider label="월 저축액" value={monthly} set={setMonthly} min={10000} max={200000} step={5000} fmt={won} accent="#5B4DD6" />
        <Slider label="기간" value={years} set={setYears} min={1} max={10} step={1} fmt={(v) => v + "년"} accent="#8E82E0" />
        <Slider label="연 이율" value={rate} set={setRate} min={1} max={7} step={0.5} fmt={(v) => v + "%"} accent="#2E9E7B" />
        <div className="mt-3 rounded-xl bg-white border border-violet-100 p-3.5 text-center">
          <div className="text-[11px] text-gray-400 mb-0.5">{years}년 후 예상 금액</div>
          <div className="text-[24px] font-extrabold text-violet-600 tabular-nums">{num(shown)}원</div>
          <div className="flex justify-center gap-4 mt-2 text-[11px]">
            <span className="text-gray-500">원금 <b className="text-gray-700">{num(principal)}</b></span>
            <span className="text-emerald-600">이자 <b>+{num(interest)}</b></span>
          </div>
        </div>
      </div>
    );
  }

  /* ── 진단 위젯 (소비 데이터 요약 바) ─────────────────── */
  function DiagnoseWidget() {
    const cats = RD.monthCategories;
    const total = RD.monthTotal;
    return (
      <div className="rounded-2xl bg-gray-50 p-4">
        <div className="text-[12px] font-bold text-gray-700 mb-2.5">이번 달 소비 구성</div>
        <div className="flex flex-col gap-2">
          {cats.map((c, i) => {
            const pct = Math.round((c.value / total) * 100);
            return (
              <div key={i}>
                <div className="flex justify-between text-[11.5px] mb-1">
                  <span className="text-gray-600">{c.name}</span>
                  <span className="font-bold text-gray-800">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: pct + "%", background: c.color }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── 목표 설정 ───────────────────────────────────────── */
  function GoalInput({ label, accent }) {
    const [val, setVal] = useState("");
    const [set, setSet] = useState(false);
    const amt = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    if (set) {
      return (
        <div className="rounded-2xl bg-emerald-50 p-4 flex items-center gap-2.5 edupay-fade">
          <span className="text-[20px]">🎯</span>
          <div className="flex-1">
            <div className="text-[12.5px] font-bold text-emerald-700">목표가 설정됐어요!</div>
            <div className="text-[11.5px] text-emerald-600">{label} · {won(amt)}</div>
          </div>
          <button onClick={() => { setSet(false); setVal(""); }} className="text-[11.5px] text-emerald-500 font-semibold underline">다시</button>
        </div>
      );
    }
    return (
      <div>
        <div className="text-[12px] font-semibold text-gray-500 mb-1.5">{label}</div>
        <div className="flex gap-2">
          <div className="flex-1 flex items-baseline bg-gray-100 rounded-xl px-3.5 py-2.5">
            <input inputMode="numeric" value={amt ? num(val.replace(/[^0-9]/g, "")) : ""}
              onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
              className="flex-1 bg-transparent outline-none text-[15px] font-bold text-gray-800 text-right tabular-nums min-w-0" />
            <span className="text-[12px] text-gray-500 ml-1">원</span>
          </div>
          <button onClick={() => amt && setSet(true)} disabled={!amt}
            className="px-4 rounded-xl text-white text-[13px] font-bold disabled:opacity-40 active:scale-95"
            style={{ background: accent }}>설정</button>
        </div>
      </div>
    );
  }

  /* ── 퀴즈 (OX / 객관식) + 정답 시 🎉 ─────────────────── */
  function Quiz({ quiz, accent }) {
    const [picked, setPicked] = useState(null);
    const correctIdx = quiz.options.findIndex((o) => o.correct);
    const isCorrect = picked !== null && quiz.options[picked].correct;
    const isOX = quiz.kind === "ox";
    return (
      <div className="relative">
        <p className="text-[13px] font-bold text-gray-800 mb-2.5 leading-relaxed">Q. {quiz.q}</p>
        <div className={isOX ? "flex gap-2" : "flex flex-col gap-2"}>
          {quiz.options.map((o, i) => {
            const chosen = picked === i;
            let cls = "bg-gray-100 text-gray-700 border-transparent";
            if (picked !== null) {
              if (i === correctIdx) cls = "bg-emerald-50 text-emerald-700 border-emerald-300";
              else if (chosen) cls = "bg-red-50 text-red-600 border-red-300";
              else cls = "bg-gray-50 text-gray-400 border-transparent";
            }
            return (
              <button key={i} onClick={() => picked === null && setPicked(i)}
                className={"border-2 rounded-xl font-bold transition active:scale-[0.98] " + cls +
                  (isOX ? " flex-1 py-3 text-[14px]" : " py-2.5 px-3.5 text-[13px] text-left")}>
                {o.label}
                {picked !== null && i === correctIdx && " ✓"}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className={"mt-3 rounded-xl px-3.5 py-3 edupay-fade " + (isCorrect ? "bg-emerald-50" : "bg-amber-50")}>
            <div className={"text-[12.5px] font-bold mb-0.5 " + (isCorrect ? "text-emerald-700" : "text-amber-700")}>
              {isCorrect ? "🎉 정답이에요!" : "아쉬워요! 다시 볼까요?"}
            </div>
            <p className={"text-[12px] leading-relaxed " + (isCorrect ? "text-emerald-600" : "text-amber-600")}>{quiz.explain}</p>
            {!isCorrect && (
              <button onClick={() => setPicked(null)} className="mt-2 text-[12px] font-bold text-amber-700 underline">다시 풀기</button>
            )}
          </div>
        )}
        {isCorrect && (
          <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 flex gap-3">
            {["🎉", "✨", "🎊", "⭐", "💫"].map((e, i) => (
              <span key={i} className="edupay-confetti text-[20px]" style={{ animationDelay: i * 60 + "ms" }}>{e}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Section({ icon, title, children }) {
    return (
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[13px]">{icon}</span>
          <h4 className="text-[13px] font-extrabold text-gray-900">{title}</h4>
        </div>
        {children}
      </div>
    );
  }

  /* ── 슬라이드업 모달 ─────────────────────────────────── */
  function RecommendModal({ content: c, grade, onClose }) {
    // transition + state flip: 합성이 멈춰도 최종 커밋 상태(보임)는 유지됨
    const [open, setOpen] = useState(false);
    useEffect(() => { const id = setTimeout(() => setOpen(true), 20); return () => clearTimeout(id); }, []);
    return (
      <div className="absolute inset-0 z-40 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" style={{ opacity: open ? 1 : 0 }} onClick={onClose}></div>
        <div className="relative bg-white rounded-t-3xl max-h-[90%] flex flex-col overflow-hidden transition-transform duration-300 ease-out"
             style={{ transform: open ? "translateY(0)" : "translateY(100%)" }}>
          {/* 헤더 */}
          <div className="px-5 pt-3 pb-3 border-b border-gray-100 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-3"></div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[24px] shrink-0" style={{ background: c.color + "1A" }}>{c.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9.5px] font-bold px-1.5 py-[1px] rounded-full text-white" style={{ background: c.color }}>{c.badge}</span>
                  <span className="text-[10.5px] font-semibold" style={{ color: c.color }}>{c.tag}</span>
                </div>
                <h3 className="text-[15.5px] font-extrabold text-gray-900 truncate">{c.title}</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[15px] active:scale-90 shrink-0">✕</button>
            </div>
          </div>

          {/* 본문 */}
          <div className="px-5 py-4 overflow-y-auto edupay-noscroll">
            <Section icon="📊" title="내 소비 데이터">
              <div className="rounded-2xl p-3.5 text-[12.5px] leading-relaxed font-medium" style={{ background: c.color + "12", color: "#1f2937" }}>
                {c.summary}
              </div>
            </Section>

            <Section icon="💡" title="개념 설명">
              <p className="text-[12.5px] text-gray-600 leading-relaxed whitespace-pre-line">{c.concept}</p>
            </Section>

            {c.widget === "budget" && <Section icon="🧮" title="예산 계산기"><BudgetCalc /></Section>}
            {c.widget === "compound" && <Section icon="🧮" title="복리 시뮬레이터"><CompoundCalc /></Section>}
            {c.widget === "diagnose" && <Section icon="📈" title="데이터 진단"><DiagnoseWidget /></Section>}

            <Section icon="✅" title="실천 팁">
              <div className="flex flex-col gap-2">
                {c.tips.map((t, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                      style={{ background: c.color + "1A", color: c.color }}>{i + 1}</span>
                    <span className="text-[12.5px] text-gray-700 leading-relaxed flex-1">{t}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section icon="🎯" title="목표 설정">
              <GoalInput label={c.goalLabel} accent={c.color} />
            </Section>

            <Section icon="📝" title="확인 퀴즈">
              <Quiz quiz={c.quiz} accent={c.color} />
            </Section>
          </div>
        </div>
      </div>
    );
  }

  /* ── 추천 카드 리스트 ────────────────────────────────── */
  function RecommendCard({ grade, onOpenContent }) {
    const items = RD.recommendContent[grade] || RD.recommendContent["중학"];
    const [hidden, setHidden] = useState([]);
    const visible = items.filter((it) => !hidden.includes(it.id));
    return (
      <div className="mt-2 flex flex-col gap-2.5">
        {visible.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white border border-violet-100 shadow-sm p-3.5">
            <div className="flex gap-3 items-start">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] shrink-0" style={{ background: c.color + "1A" }}>{c.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9.5px] font-bold px-1.5 py-[1px] rounded-full text-white" style={{ background: c.color }}>{c.badge}</span>
                  <span className="text-[10px] font-semibold" style={{ color: c.color }}>{c.tag}</span>
                </div>
                <div className="text-[14px] font-extrabold text-gray-900 leading-snug">{c.title}</div>
              </div>
            </div>
            <div className="mt-2.5 rounded-xl px-3 py-2 text-[11.5px] font-semibold flex items-center gap-1.5"
              style={{ background: c.color + "12", color: c.color }}>
              <span>📌</span><span className="flex-1">{c.highlight}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-gray-400">⏱ {c.readTime}</span>
              <div className="flex gap-2">
                <button onClick={() => setHidden((h) => [...h, c.id])}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-[12.5px] font-bold active:scale-95">나중에</button>
                <button onClick={() => onOpenContent(c)}
                  className="px-4 py-2 rounded-xl text-white text-[12.5px] font-bold active:scale-95" style={{ background: c.color }}>자세히 보기</button>
              </div>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="rounded-2xl bg-gray-50 p-4 text-center text-[12.5px] text-gray-400">추천 콘텐츠를 모두 확인했어요 👍</div>
        )}
      </div>
    );
  }

export { RecommendCard, RecommendModal };
