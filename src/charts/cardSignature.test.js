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
