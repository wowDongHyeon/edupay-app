import React from "react";
import { EDUPAY } from "../data/edupay";
/* FOX PAY AI — 맞춤 금융 퀴즈 카드 (내 소비 데이터 기반 · 인라인 진행) */
  const { useState } = React;
  const QD = EDUPAY;
  const ACCENT = "#5B4DD6";

  function QuizCard({ grade }) {
    const [qs] = useState(() => QD.buildQuiz(grade));
    const [idx, setIdx] = useState(0);
    const [picked, setPicked] = useState(null);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);

    const total = qs.length;
    const q = qs[idx];
    const answered = picked !== null;
    const isOX = q && q.kind === "ox";
    const isCorrect = answered && q.options[picked].correct;
    const correctIdx = q ? q.options.findIndex((o) => o.correct) : -1;

    function choose(i) {
      if (answered) return;
      setPicked(i);
      if (q.options[i].correct) setScore((s) => s + 1);
    }
    function next() {
      if (idx + 1 >= total) { setDone(true); return; }
      setIdx(idx + 1); setPicked(null);
    }
    function restart() { setIdx(0); setPicked(null); setScore(0); setDone(false); }

    /* ── 결과 화면 ── */
    if (done) {
      const pts = score * 10;
      const allRight = score === total;
      return (
        <div className="mt-2 rounded-2xl bg-white border border-violet-100 shadow-sm px-5 py-6 text-center edupay-fade">
          <div className="text-[34px] mb-1">{allRight ? "🏆" : score >= total / 2 ? "🎉" : "💪"}</div>
          <div className="text-[16px] font-extrabold text-gray-900">{allRight ? "전부 맞혔어요!" : "퀴즈 완료!"}</div>
          <div className="mt-1 text-[13px] text-gray-500">{total}문제 중 <span className="font-bold" style={{ color: ACCENT }}>{score}개</span> 정답</div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold"
               style={{ background: "#F0EBFB", color: "#4A2F8E" }}>
            <span>⭐</span> 에듀포인트 +{pts}P 적립
          </div>
          <button onClick={restart}
            className="mt-5 w-full py-3 rounded-xl text-white text-[13.5px] font-bold active:scale-[.98] transition"
            style={{ background: ACCENT }}>다시 풀기</button>
        </div>
      );
    }

    /* ── 문제 화면 ── */
    return (
      <div className="mt-2 rounded-2xl bg-white border border-violet-100 shadow-sm px-5 py-5 edupay-fade">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[15px] font-extrabold text-gray-900 tracking-[-0.01em]">맞춤 금융 퀴즈</div>
            <div className="text-[12px] text-gray-400 mt-0.5">내 소비 데이터로 만든 문제</div>
          </div>
          <span className="shrink-0 text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#EEEBFA", color: ACCENT }}>{idx + 1} / {total}</span>
        </div>
        {/* 진행 막대 */}
        <div className="flex gap-1.5 mb-4">
          {qs.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= idx ? ACCENT : "#E6E7EC" }}></div>
          ))}
        </div>

        <p className="text-[14px] font-bold text-gray-800 mb-3 leading-relaxed">Q{idx + 1}. {q.q}</p>
        <div className={isOX ? "flex gap-2" : "flex flex-col gap-2"}>
          {q.options.map((o, i) => {
            const chosen = picked === i;
            let cls = "bg-gray-100 text-gray-700 border-2 border-transparent";
            if (answered) {
              if (o.correct) cls = "border-2 text-white";
              else if (chosen) cls = "border-2 text-white";
              else cls = "bg-gray-50 text-gray-400 border-2 border-transparent";
            }
            const st = answered && o.correct ? { background: "#2E9E7B", borderColor: "#2E9E7B" }
              : answered && chosen ? { background: "#D99A36", borderColor: "#D99A36" } : {};
            return (
              <button key={i} onClick={() => choose(i)} disabled={answered}
                className={"rounded-xl font-bold transition active:scale-[.98] " + (isOX ? "flex-1 py-3.5 text-[14px]" : "w-full text-left px-4 py-3 text-[13.5px]") + " " + cls}
                style={st}>
                {answered && o.correct ? "✓ " : answered && chosen ? "✕ " : ""}{o.label}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-3 rounded-xl px-3.5 py-3 edupay-fade" style={{ background: isCorrect ? "#E8F5F0" : "#FBF3E4" }}>
            <div className="text-[13px] font-extrabold mb-0.5" style={{ color: isCorrect ? "#247E62" : "#A66C20" }}>
              {isCorrect ? "🎉 정답이에요!" : "아쉬워요!"}
            </div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: isCorrect ? "#247E62" : "#A66C20" }}>{q.explain}</p>
          </div>
        )}

        <button onClick={next} disabled={!answered}
          className="mt-4 w-full py-3 rounded-xl text-white text-[13.5px] font-bold transition active:scale-[.98] disabled:opacity-40"
          style={{ background: answered ? ACCENT : "#9CA3AF" }}>
          {idx + 1 >= total ? "결과 보기" : "다음 문제"}
        </button>
      </div>
    );
  }

export { QuizCard };
