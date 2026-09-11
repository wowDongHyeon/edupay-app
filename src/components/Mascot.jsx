import React from "react";
// [마스코트] 앱팀 제공 웹 이식본(2026-09-10). ?raw 로 문자열을 받아 인라인 주입한다 —
//   <img> 로는 JS 가 내부 엘리먼트를 못 잡아 눈조차 안 그려진다(제공 README).
import mascotSvgRaw from "../../icons/ai-mascot.svg?raw";
import { AiMascot } from "./ai-mascot-idle";

/* SVG 내부 id 는 문서 전역이라, 같은 마스코트를 두 군데(랜딩·말풍선 아바타) 넣으면
   url(#filter0_ii_1_141) 같은 참조가 서로 엉킨다 — 앞선 하나가 사라지면 나머지가 깨진다.
   그래서 인스턴스마다 id 에 접미사를 붙여 격리한다.
   단, AiMascot 이 querySelector 로 찾는 기능 id 는 그대로 둬야 한다(svg 스코프 조회라 충돌하지 않음). */
const KEEP_IDS = new Set(["mascot-root", "mascot-face", "eye-l", "eye-l-glow", "eye-r", "eye-r-glow"]);

function uniquifyIds(raw, uid) {
  return raw
    .replace(/id="([^"]+)"/g, (m, id) => (KEEP_IDS.has(id) ? m : `id="${id}-${uid}"`))
    .replace(/url\(#([^)]+)\)/g, (m, id) => (KEEP_IDS.has(id) ? m : `url(#${id}-${uid})`));
}

let seq = 0;

/**
 * AI 마스코트.
 * @param {number} width   렌더 폭(px). viewBox 231×179 라 높이는 약 width/1.29 가 된다.
 * @param {boolean} animated  true=대기 애니메이션 구동, false=기본 포즈로 정지.
 *   ⚠ false 여도 프레임을 한 번은 그려야 한다 — 눈은 JS 가 그리므로 안 그리면 눈이 없는 채로 남는다.
 *   말풍선 아바타는 개수만큼 rAF 루프가 늘어나므로 정지로 쓴다(모바일 배터리).
 */
export function Mascot({ width, animated = true, className = "", label = "AI 금융친구" }) {
  const hostRef = React.useRef(null);
  const html = React.useMemo(() => uniquifyIds(mascotSvgRaw, `m${++seq}`), []);

  React.useEffect(() => {
    const svg = hostRef.current && hostRef.current.querySelector("svg");
    if (!svg) return;
    const m = new AiMascot(svg);
    if (animated) {
      m.start();
      return () => m.destroy(); // 화면에서 사라질 때 필수(제공 README) — rAF 루프 누수 방지
    }
    // 정지 모드: 기본 포즈 1프레임만 그리고 루프는 띄우지 않는다.
    m._tick(performance.now());
    if (m.raf !== null) { cancelAnimationFrame(m.raf); m.raf = null; }
    return undefined;
  }, [animated]);

  return (
    <div ref={hostRef} role="img" aria-label={label}
      style={{ width }}
      className={"select-none pointer-events-none [&>svg]:w-full [&>svg]:h-auto " + className}
      dangerouslySetInnerHTML={{ __html: html }} />);

}

export default Mascot;
