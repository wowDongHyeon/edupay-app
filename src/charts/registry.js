// 차트 레지스트리 (호환 래퍼) — 템플릿 선택은 charts/intentConfig.js(INTENT_CONFIG)로 통합됨(TEMPLATE_설계.md §5.4).
// App.send()이 msg.chartType = chartTypeForIntent(intent)으로 쓰던 계약 유지: 이제 templateId를 반환.
import { INTENT_CONFIG, templateFor } from "./intentConfig";

// intent → templateId (없으면 table). 데이터 메시지 여부 판단(truthy)에도 쓰임.
export function chartTypeForIntent(intent) {
  return templateFor(intent);
}

// 구 INTENT_CHART 호환(파생): intent → templateId 맵.
export const INTENT_CHART = Object.fromEntries(
  Object.keys(INTENT_CONFIG).map((k) => [k, INTENT_CONFIG[k].template])
);

export default INTENT_CHART;
