// ──────────────────────────────────────────────────────────────
// 앱 설정 — AI(Claude) 답변 기능
//
// VITE_AI_ENABLED (.env):
//   - "false"(기본): AI 기능 자체 OFF. 토글도 숨김. 모든 답변 로컬 하드코딩.
//   - "true"       : AI 기능 ON. 헤더 메뉴에 토글 노출(기본 켜짐),
//                    런타임으로 켜고 끌 수 있음(localStorage 유지).
// ──────────────────────────────────────────────────────────────
const AI_FEATURE = import.meta.env.VITE_AI_ENABLED === "true";
const KEY = "edupay_ai_enabled";

// AI 기능(및 토글) 자체가 활성화되어 있는지
export function isAiFeatureOn() {
  return AI_FEATURE;
}

// 현재 AI 답변 사용 여부 (기능 OFF면 무조건 false)
export function getAiEnabled() {
  if (!AI_FEATURE) return false;
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === "true"; // 기능 켜져 있으면 기본 ON
  } catch (e) {
    return true;
  }
}

export function setAiEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? "true" : "false");
  } catch (e) {
    /* ignore */
  }
}
