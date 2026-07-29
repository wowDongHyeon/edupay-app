// 슬래시(/) 스킬 런처 드롭다운. 입력창 바로 위 팝오버.
//   open 판정·필터·키보드네비를 자체 소유하고, App composer의 onKeyDown은 ref.handleKey로 위임한다.
//   ponytail: portal/floating-ui 없이 순수 state + 절대위치 div. 부모(relative) 기준 bottom-full.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { SKILLS } from "../skills.js"; // 통합 스키마(객체, 키=command). 명시 .js로 폴더 동명 충돌 회피.

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "");
// 객체 → 리스트(키=command 주입). 순수 데이터층(skills.js)에 로직을 두지 않으려 여기서 1회 파생.
const SKILL_LIST = Object.entries(SKILLS).map(([command, s]) => ({ command, ...s }));

const SlashSkillMenu = forwardRef(function SlashSkillMenu({ input, onPick }, ref) {
  const isSlash = (input || "").startsWith("/");
  const raw = isSlash ? input.slice(1) : "";
  // 첫 토큰=명령어 필터, 나머지=파라미터(예 "/자금보고서 지난달" → firstToken '자금보고서', rest '지난달').
  //   공백 뒤 기간을 타이핑해도 메뉴가 열린 채 유지되도록 필터는 firstToken 만 사용.
  const firstToken = raw.split(/\s+/)[0] || "";
  const rest = raw.slice(firstToken.length).trim();
  const [dismissed, setDismissed] = useState(false); // Esc/선택으로 닫음
  const [idx, setIdx] = useState(0);
  const pickedRef = useRef(null); // 선택한 명령어("/자금보고서"). 그 명령어 편집 중엔 메뉴 재오픈 안 함.

  // 입력 변경 시: 선택한 명령어를 계속 편집 중(접두 일치)이면 닫힘 유지, 아니면 재오픈(+선택 리셋).
  useEffect(() => {
    if (pickedRef.current && (input || "").startsWith(pickedRef.current)) return;
    pickedRef.current = null;
    setDismissed(false); setIdx(0);
  }, [input]);

  const filtered = useMemo(() => {
    const nq = norm(firstToken);
    if (!nq) return SKILL_LIST;
    return SKILL_LIST.filter((s) =>
      norm(s.label).includes(nq) ||
      norm(s.command).includes(nq) ||
      (s.keywords || []).some((k) => norm(k).includes(nq))
    );
  }, [firstToken]);

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
        if (filtered.length) onPick(filtered[Math.min(idx, filtered.length - 1)], rest);
        return true; // 선택=입력 채움(전송 아님). 매칭 없어도 소비 → "/xxx" 원문 전송 방지
      }
      return false;
    },
    // 선택 후 메뉴 닫기(App onPick이 호출). cmd = "/명령어" — 그 명령어 편집 중엔 재오픈 안 함.
    dismiss(cmd) { pickedRef.current = cmd || null; setDismissed(true); },
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
                  onMouseDown={(e) => { e.preventDefault(); onPick(s, rest); }} // onMouseDown: input blur 전에 선택
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
