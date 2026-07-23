// 골든 시그니처 테스트 — §4 매핑표(현행 SLOTS/roleOf/각 카드 SQL 시그니처에서 역산).
//   질의 텍스트가 아니라 operia 응답 '컬럼 시그니처'가 카드를 결정한다.
//   러너: node --test (stdlib, 새 의존성 없음).  실행:  node --test src/charts/cardSignature.test.js
//   대상은 순수 분류기 classifyCard 뿐 — shapedData(셰이핑)는 fallbackShape.pickCardSignature 가 위임하며
//   기존 shapeForIntent/pickFallbackShape 로 패리티가 보장되므로 여기서 검증하지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyCard } from "./cardSignature.js";

const eq = (rows, meta, expected, msg) => assert.equal(classifyCard(rows, meta), expected, msg);

test("report: 시간축(YYYY-MM) + 금액 → report", () => {
  eq([{ DLNG_YM: "2026-01", SUM_PAY_DLNG_AMT: 12000 }, { DLNG_YM: "2026-02", SUM_PAY_DLNG_AMT: 8000 }], null, "report");
});

test("reportDaily: 시간축(YYYY-MM-DD) + 금액 → reportDaily", () => {
  eq([{ DLNG_DT: "2026-01-01", SUM_PAY_DLNG_AMT: 3000 }, { DLNG_DT: "2026-01-02", SUM_PAY_DLNG_AMT: 5000 }], null, "reportDaily");
});

test("merchantMap: 좌표(위/경도) + 가맹점명 → merchantMap", () => {
  eq([{ MERCHANT_NM: "GS25", LATITUDE: 36.63, LONGITUDE: 127.48 }], null, "merchantMap");
});

test("schoolCompare: 학교(SCH_NM) + 총액 → schoolCompare", () => {
  eq([{ SCH_NM: "흥덕중", tot: 50000, students: 30 }, { SCH_NM: "봉명중", tot: 42000, students: 28 }], null, "schoolCompare");
});

test("schoolCompare: 학년별(grade 문자열) + 총액/인원/1인평균 → schoolCompare (코어50 #34)", () => {
  eq([
    { grade: "1", sum_dlng_amt: 50000, user_cnt: 30, avg_per_user: 1666 },
    { grade: "2", sum_dlng_amt: 42000, user_cnt: 28, avg_per_user: 1500 },
    { grade: "3", sum_dlng_amt: 38000, user_cnt: 25, avg_per_user: 1520 },
  ], null, "schoolCompare");
});

test("schoolCompare 회귀 가드: grade 정수(값)로 오면 범주 없음 → generic (operia 조정 필요 케이스)", () => {
  eq([
    { grade: 1, sum_dlng_amt: 50000, user_cnt: 30, avg_per_user: 1666 },
    { grade: 2, sum_dlng_amt: 42000, user_cnt: 28, avg_per_user: 1500 },
  ], null, "generic");
});

test("friendCompare: scope(나/우리 학교 평균/충북 전체 평균) 범주 + avg_amt → friendCompare", () => {
  eq([{ scope: "나", avg_amt: 115000 }, { scope: "우리 학교 평균", avg_amt: 98000 }, { scope: "충북 전체 평균", avg_amt: 104000 }], null, "friendCompare");
});

test("friendCompare 회귀 가드: 'scope' 아닌 범주+금액은 삼키지 않고 merchantBreakdown 유지", () => {
  eq([{ CATEGORY_NM: "편의점", amount: 12000 }, { CATEGORY_NM: "음식", amount: 8000 }], null, "merchantBreakdown");
});

test("dayTxns(L): 건별 거래(gds_nm 상품명 + dlng_tm 시각) 다행 → dayTxns", () => {
  eq([
    { dlng_dt: "2026-07-01", dlng_tm: "120000", merchant_nm: "GS25", dlng_amt: 3000, gds_nm: "삼각김밥", channel_nm: "오프라인" },
    { dlng_dt: "2026-07-01", dlng_tm: "184500", merchant_nm: "CU", dlng_amt: 5000, gds_nm: "우유", channel_nm: "온라인" },
  ], null, "dayTxns");
});

test("dayTxns 회귀 가드: CH(channel_nm 있으나 gds_nm 없음) 는 dayTxns 로 새지 않고 channel 유지", () => {
  eq([
    { channel: "온라인", merchant_nm: "GS25", dlng_amt: 3000, dlng_dt: "2026-07-01", dlng_tm: "120000", category_nm: "편의점" },
    { channel: "오프라인", merchant_nm: "CU", dlng_amt: 9000, dlng_dt: "2026-07-01", dlng_tm: "184500", category_nm: "편의점" },
  ], null, "channel");
});

test("channel: 채널값(ONLINE/OFFLINE) 범주 + 금액 → channel", () => {
  eq([{ channel: "ONLINE", amount: 3000 }, { channel: "OFFLINE", amount: 9000 }], null, "channel");
});

test("channel: 코드값(ON/OFF)이어도 채널 → channel", () => {
  eq([{ PAY_CHANNEL: "ON", amount: 3000 }, { PAY_CHANNEL: "OFF", amount: 9000 }], null, "channel");
});

test("merchantBreakdown: 가맹점명 + 금액 → merchantBreakdown", () => {
  eq([{ MERCHANT_NM: "GS25", amount: 12000 }, { MERCHANT_NM: "CU", amount: 8000 }], null, "merchantBreakdown");
});

test("모호 병합(D6): 업종(category) + 금액 + 비율 → merchantBreakdown 로 병합(catSpend 흡수)", () => {
  eq([{ CATEGORY_NM: "편의점", amount: 12000, RATIO_PCT: 60 }, { CATEGORY_NM: "음식", amount: 8000, RATIO_PCT: 40 }], null, "merchantBreakdown");
});

test("balance: mock 계산형 {k,v}(used/recv/points) → balance", () => {
  eq([{ k: "voucher_used", v: 30000 }, { k: "charge_recv", v: 20000 }, { k: "points", v: 150 }], null, "balance");
});

test("balance: operia 3열 잔액(단일행, 신컬럼) → balance", () => {
  eq([{ CARD_VOUCHER_BLNC: 45000, CARD_ADD_CHARG_BLNC: 12000, CURRENT_POINT: 300 }], null, "balance");
});

test("balance: 잔액 총액 단일 컬럼(ACCOUNT_BALANCE_AMT) → balance", () => {
  eq([{ ACCOUNT_BALANCE_AMT: 57000 }], null, "balance");
});

test("balance: 3열 + CARD_YN/CARD_DAY_LIMIT_AMT(카드 발급여부 4번째 항목)이 섞여도 balance 유지(회귀 0)", () => {
  eq([{ CARD_VOUCHER_BLNC: 45000, CARD_ADD_CHARG_BLNC: 12000, CURRENT_POINT: 300, CARD_YN: "Y", CARD_DAY_LIMIT_AMT: 63000 }], null, "balance");
  eq([{ CARD_VOUCHER_BLNC: 45000, CARD_ADD_CHARG_BLNC: 12000, CURRENT_POINT: 300, CARD_YN: "N", CARD_DAY_LIMIT_AMT: null }], null, "balance");
});

test("단일KPI: 범주 없는 스칼라 1개(잔액명 아님) → kpi", () => {
  eq([{ TOTAL_COUNT: 42 }], null, "kpi");
});

test("generic: 단일행 다중 숫자(잔액 아님) → generic(멀티KPI/표는 폴백이 판단)", () => {
  eq([{ FOO_CNT: 3, BAR_CNT: 5, BAZ_CNT: 7 }], null, "generic");
});

test("generic: 빈 응답 → generic", () => {
  eq([], null, "generic");
  eq(null, null, "generic");
});

test("식별자(_NO/_ID)는 범주로 치지 않음: MERCHANT_NO만 있는 범주+금액도 merchantBreakdown 폴백 안 함 → 값만이면 kpi", () => {
  // MERCHANT_NO(식별자) 제외 → 의미범주 0, 값 1개, 단일행 → kpi (범주 오인 방지)
  eq([{ MERCHANT_NO: "M001", amount: 12000 }], null, "kpi");
});
