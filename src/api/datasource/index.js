// 데이터창구 팩토리 — DATASOURCE_설계.md §3, §10
//
// 채널 분기는 "오직 여기 한 곳". 렌더/상태/화면은 채널을 모른 채 계약(contract.js)만 소비한다.
// 교체는 VITE_DATA_SOURCE 한 줄: operia | backend | mock. 미설정/오타 → mock 폴백(화면 안 깨짐).
//
// mock(Phase A) · backend(Phase C) · operia(Phase C 골격) 어댑터를 VITE_DATA_SOURCE 로 선택.
//   operia/backend 선택인데 베이스 URL 이 비면 경고 후 mock 폴백(§3 안전장치 — 화면 안 깨짐).

import { mockSource } from "./mock";
import { backendSource } from "./backend";
import { operiaSource } from "./operia";

const SOURCE = import.meta.env.VITE_DATA_SOURCE;

let warned = false;
function warnFallback(name, reason) {
  if (warned) return;
  warned = true;
  if (import.meta.env.DEV) {
    console.warn(`[datasource] '${name}' ${reason} — mock 으로 폴백합니다.`);
  }
}

/**
 * 활성 데이터 창구 어댑터를 반환. 모든 어댑터는 동일 인터페이스:
 *   query({ userInput, context:{companyId}, hints? }, { onData, onResult, onError }, signal) => Promise<void>
 * @returns {{ query: Function }}
 */
export function getDataSource() {
  switch (SOURCE) {
    case "operia":
      if (!import.meta.env.VITE_OPERIA_API) { warnFallback("operia", "VITE_OPERIA_API 미설정"); return mockSource; }
      return operiaSource;
    case "backend":
      if (!import.meta.env.VITE_BACKEND_API) { warnFallback("backend", "VITE_BACKEND_API 미설정"); return mockSource; }
      return backendSource;
    case "mock":
    default:
      // 미설정/오타 포함 → mock 폴백
      return mockSource;
  }
}

/** 현재 활성 채널명(폴백 반영). dev 표식/로그용. → "operia" | "backend" | "mock" */
export function activeChannelName() {
  switch (SOURCE) {
    case "operia": return import.meta.env.VITE_OPERIA_API ? "operia" : "mock";
    case "backend": return import.meta.env.VITE_BACKEND_API ? "backend" : "mock";
    default: return "mock";
  }
}

export default getDataSource;
