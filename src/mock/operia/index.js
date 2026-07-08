// 오페리아 목업 응답 매핑 — intent(kind) → { question, sql, result, chart }
// intent 키는 App.jsx cardIntent(q)가 반환하는 kind 값과 동일.
// (① monthlyUsage 의 intent 키는 'report')
import monthlyUsage from "./monthlyUsage";
import catSpend from "./catSpend";
import friendCompare from "./friendCompare";
import nudgeCompare from "./nudgeCompare";
import merchantMap from "./merchantMap";
import balance from "./balance";
import channel from "./channel";
import merchantBreakdown from "./merchantBreakdown";
import parentCard from "./parentCard";
import schoolCompare from "./schoolCompare";

const results = {
  report: monthlyUsage,
  catSpend,
  friendCompare,
  nudgeCompare,
  merchantMap,
  balance,
  channel,
  merchantBreakdown,
  parentCard,
  schoolCompare,
};

// 오페리아(목업) 대상 데이터 intent 목록 — App.jsx 라우팅에서 사용.
//   dayTxns(하루 건별 거래 리스트)는 mock 응답 모듈 없이 operia 실채널 전용(cardIntent 가 operia 에서만 반환) → 라우팅 게이트에만 추가.
export const OPERIA_KINDS = [...Object.keys(results), "dayTxns"];

export default results;
