// 슬래시(/) 스킬 런처 드롭다운. 입력창 바로 위 팝오버.
//   open 판정·필터·키보드네비를 자체 소유하고, App composer의 onKeyDown은 ref.handleKey로 위임한다.
//   ponytail: portal/floating-ui 없이 순수 state + 절대위치 div. 부모(relative) 기준 bottom-full.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { SKILLS } from "./registry";

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "");

const SlashSkillMenu = forwardRef(function SlashSkillMenu({ input, onPick }, ref) {
  const isSlash = (input || "").startsWith("/");
  const q = isSlash ? input.slice(1) : "";
  const [dismissed, setDismissed] = useState(false); // Esc로 닫음 → 다음 입력까지 유지
  const [idx, setIdx] = useState(0);

  // 사용자가 타이핑하면(입력 변경) Esc 닫힘 해제 + 선택 리셋
  useEffect(() => { setDismissed(false); setIdx(0); }, [input]);

  const filtered = useMemo(() => {
    const nq = norm(q);
    if (!nq) return SKILLS;
    return SKILLS.filter((s) =>
      norm(s.label).includes(nq) ||
      norm(s.command).includes(nq) ||
      (s.keywords || []).some((k) => norm(k).includes(nq))
    );
  }, [q]);

  const open = isSlash && !dismissed;

  useImperativeHandle(ref, () => ({
    // App composer onKeyDown이 호출. 메뉴가 키를 소비하면 true 반환(→ 기존 Enter/send 가로채기).
    handleKey(e) {
      if (!open) return false;
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0))); return true; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); return true; }
      if (e.key === "Escape")    { e.preventDefault(); setDismissed(true); return true; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered.length) onPick(filtered[Math.min(idx, filtered.length - 1)]);
        return true; // 매칭 없어도 소비 → "/xxx" 원문 전송 방지
      }
      return false;
    },
  }), [open, filtered, idx, onPick]);

  if (!open) return null;

  return (
    <div className="absolute left-0 right-0 bottom-full px-4 pb-2 z-20">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={{ boxShadow: "0 12px 32px -10px rgba(17,17,27,0.24), 0 3px 10px -4px rgba(17,17,27,0.12)" }}>
        {filtered.length === 0 ? (
          <div className="px-4 py-3 text-[13px] text-gray-400">일치하는 스킬 없음</div>
        ) : (
          <ul className="max-h-[280px] overflow-y-auto py-1">
            {filtered.map((s, i) => (
              <li key={s.command}>
                <button
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onMouseDown={(e) => { e.preventDefault(); onPick(s); }} // onMouseDown: input blur 전에 선택
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition"
                  style={{ background: i === idx ? "#F3F4F6" : "transparent" }}>
                  <span className="text-[18px] shrink-0">{s.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold text-gray-800 truncate">{s.label}</span>
                    <span className="block text-[12px] text-gray-400 truncate">{s.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

export default SlashSkillMenu;
