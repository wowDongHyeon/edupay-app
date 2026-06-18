// 차트 레지스트리 — 차트 유형은 오페리아 응답이 아니라 프론트가 intent(질문)로 결정.
// (WORKFLOW §7: "차트 유형은 응답이 아니라 프론트가 결정(INTENT_CHART)")
//
// intent 키는 App.jsx cardIntent(q)가 반환하는 kind 값과 동일.
// 매핑에 없는 intent는 'table'(범용 표)로 폴백 → ChartRenderer default.
export const INTENT_CHART = {
  report: "bar", // 월별 사용 내역
  catSpend: "donut", // 사용처별(업종)
  friendCompare: "compare", // 친구 비교
  nudgeCompare: "compare", // 조르기 비교
  schoolCompare: "compare", // 학교별 비교
  merchantMap: "map", // 근처 가맹점(지도)
  balance: "gauge", // 남은 금액(잔액)
  channel: "donut", // 온/오프라인
  merchantBreakdown: "barlist", // 어디에 주로(가맹점별)
  parentCard: "list", // 부모카드 내역
};

export function chartTypeForIntent(intent) {
  return INTENT_CHART[intent] || "table";
}
