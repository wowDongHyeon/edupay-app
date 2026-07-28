// 맥락 분기(catContext) 단위 테스트 — 감지(dow/hour/grade)·적용(제목/부제/행라벨/푸터)·회귀(기본 유지).
//   러너: node --test (stdlib, 새 의존성 없음).  실행: node --test src/charts/catContext.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCatContext, applyCatContext, catKindOf, measureKind, measureKindFromBreakdown, classifyMeasureName, orderDirection } from "./catContext.js";

test("measureKindFromBreakdown: func 있으면 func, 없으면 metric.name alias 폴백", () => {
  assert.equal(measureKindFromBreakdown({ metrics: [{ name: "max_amt", aggregated: true, func: "MAX" }] }), "max");
  // 라이브 avg KPI: func 누락 + name='avg_amt' → name 으로 avg 추론
  assert.equal(measureKindFromBreakdown({ metrics: [{ name: "avg_amt", aggregated: true, source_column: "dlng_amt" }] }), "avg");
  assert.equal(measureKindFromBreakdown({ metrics: [{ name: "sum_dlng_amt", aggregated: true }] }), "sum");
  assert.equal(measureKindFromBreakdown({ metrics: [] }), null);
  assert.equal(measureKindFromBreakdown(null), null);
});

// intentConfig.contexts 미러(문자열 소유는 intentConfig, 여기선 적용 검증만)
const MB = { title: "주로 어디에 썼을까?", subtitle: "가맹점별 사용 금액 순", contexts: {
  dow:     { title: "요일별 사용", subtitle: "요일별 사용 금액" },
  hour:    { title: "시간대별 사용", subtitle: "시간대별 사용 금액" },
  channel: { title: "채널별 사용", subtitle: "온·오프라인별 금액" },
  gds:     { title: "상품별 사용", subtitle: "상품별 사용 금액" },
  biz:     { title: "업종별 사용", subtitle: "업종별 사용 금액" },
} };
const SC = { title: "학교별 사용 비교", subtitle: "충청북도 중학교 결제 TOP5 · 1인당 평균", contexts: {
  grade: { title: "학년별 사용 비교", subtitle: "학년별 1인당 평균", gradeLabel: true, avgLabel: "전체 평균" },
} };

test("detect: dow 컬럼명 / 요일 값", () => {
  assert.equal(detectCatContext([{ dow: "월", amount: 1 }]), "dow");
  assert.equal(detectCatContext([{ cat: "월", v: 1 }, { cat: "화", v: 2 }]), "dow"); // 값 폴백
});
test("detect: hour 컬럼명 / N시 값", () => {
  assert.equal(detectCatContext([{ hour: "14시", amount: 1 }]), "hour");
  assert.equal(detectCatContext([{ x: "9시", v: 1 }, { x: "14시", v: 2 }]), "hour"); // 값 폴백
});
test("detect: grade 컬럼명만(값 '1~6'은 폴백 제외)", () => {
  assert.equal(detectCatContext([{ grade: "1", tot: 1 }]), "grade");
  assert.equal(detectCatContext([{ merchant: "1", amount: 1 }]), null); // 숫자 문자열은 grade 오탐 안 함
});
test("detect: 가맹점/학교 등 기본 → null", () => {
  assert.equal(detectCatContext([{ merchant: "GS25", amount: 1 }]), null);
  assert.equal(detectCatContext([{ school: "흥덕중", tot: 1 }]), null);
  assert.equal(detectCatContext([]), null);
});

test("apply merchantBreakdown dow: 제목·부제 교체, 데이터 불변", () => {
  const shaped = { items: [{ label: "월", value: 100, pct: 50 }] };
  const r = applyCatContext(MB, shaped, [{ dow: "월", amount: 100 }]);
  assert.equal(r.cfg.title, "요일별 사용");
  assert.equal(r.cfg.subtitle, "요일별 사용 금액");
  assert.deepEqual(r.shaped, shaped); // 데이터 불변
});
test("apply merchantBreakdown hour", () => {
  const r = applyCatContext(MB, { items: [{ label: "14시", value: 100 }] }, [{ hour: "14시", amount: 100 }]);
  assert.equal(r.cfg.title, "시간대별 사용");
});
test("detect: channel/gds/biz 컬럼명 + channel 값 폴백", () => {
  assert.equal(detectCatContext([{ CHANNEL_NM: "온라인", DLNG_AMT: 1 }]), "channel"); // 라이브 id74 컬럼
  assert.equal(detectCatContext([{ gds_nm: "삼각김밥", amount: 1 }]), "gds");
  assert.equal(detectCatContext([{ BIZ_TYPE_NM: "음식점", amount: 1 }]), "biz");
  assert.equal(detectCatContext([{ ch: "온라인", v: 1 }, { ch: "오프라인", v: 2 }]), "channel"); // 값 폴백
});
test("apply merchantBreakdown channel(id74): 부제 채널 맥락, 데이터 불변", () => {
  const shaped = { items: [{ label: "오프라인", value: 80000 }, { label: "온라인", value: 12000 }] };
  const r = applyCatContext(MB, shaped, [{ CHANNEL_NM: "오프라인", DLNG_AMT: 80000 }, { CHANNEL_NM: "온라인", DLNG_AMT: 12000 }]);
  assert.equal(r.cfg.title, "채널별 사용");
  assert.equal(r.cfg.subtitle, "온·오프라인별 금액");
  assert.deepEqual(r.shaped, shaped);
});
test("apply merchantBreakdown gds/biz 부제", () => {
  assert.equal(applyCatContext(MB, { items: [] }, [{ gds_nm: "우유", amount: 1 }]).cfg.subtitle, "상품별 사용 금액");
  assert.equal(applyCatContext(MB, { items: [] }, [{ BIZ_ITEM_NM: "카페", amount: 1 }]).cfg.subtitle, "업종별 사용 금액");
});
test("apply merchantBreakdown 기본(가맹점) → 원본 유지(회귀 0)", () => {
  const shaped = { items: [{ label: "GS25", value: 100 }] };
  const r = applyCatContext(MB, shaped, [{ merchant: "GS25", amount: 100 }]);
  assert.equal(r.cfg.title, "주로 어디에 썼을까?");
  assert.equal(r.shaped, shaped);
});

test("apply schoolCompare grade: 제목·부제·행라벨 N학년·푸터 전체 평균", () => {
  const shaped = { items: [{ label: "1", value: 1666 }, { label: "2", value: 1500 }], avgRow: { label: "충북 평균", value: 1550 } };
  const r = applyCatContext(SC, shaped, [{ grade: "1", tot: 1 }, { grade: "2", tot: 1 }]);
  assert.equal(r.cfg.title, "학년별 사용 비교");
  assert.equal(r.cfg.subtitle, "학년별 1인당 평균");
  assert.deepEqual(r.shaped.items.map((x) => x.label), ["1학년", "2학년"]);
  assert.equal(r.shaped.avgRow.label, "전체 평균");
  assert.equal(shaped.items[0].label, "1"); // 입력 불변(새 객체 반환)
});
test("apply grade: 비숫자 라벨은 그대로", () => {
  const r = applyCatContext(SC, { items: [{ label: "중2", value: 1 }] }, [{ grade: "중2", tot: 1 }]);
  assert.equal(r.shaped.items[0].label, "중2");
});
test("apply schoolCompare 기본(학교) → 원본 유지(회귀 0)", () => {
  const shaped = { items: [{ label: "흥덕중", value: 1 }], avgRow: { label: "충북 평균", value: 1 } };
  const r = applyCatContext(SC, shaped, [{ school: "흥덕중", tot: 1 }]);
  assert.equal(r.cfg.title, "학교별 사용 비교");
  assert.equal(r.shaped.avgRow.label, "충북 평균");
});
test("catKindOf: 가맹점 컬럼 → merchant(장소 말투)", () => {
  assert.equal(catKindOf([{ merchant: "GS25", amount: 1 }]), "merchant");
  assert.equal(catKindOf([{ MERCHANT_NM: "GS25", amount: 1 }]), "merchant");
  assert.equal(catKindOf([{ 상호명: "GS25", amount: 1 }]), "merchant");
});
test("catKindOf: 요일/시간대 → dow/hour(중립)", () => {
  assert.equal(catKindOf([{ dow: "수", amount: 1 }]), "dow");
  assert.equal(catKindOf([{ hour: "14시", amount: 1 }]), "hour");
});
test("catKindOf: 업종/상품 → other(중립, 장소 아님)", () => {
  assert.equal(catKindOf([{ BIZ_ITEM_NM: "편의점", amount: 1 }]), "other");
  assert.equal(catKindOf([{ GDS_NM: "우유", amount: 1 }]), "other");
  assert.equal(catKindOf([]), "other");
});

test("contexts 없는 cfg → 무변경", () => {
  const cfg = { title: "x" };
  const r = applyCatContext(cfg, { items: [] }, [{ dow: "월" }]);
  assert.equal(r.cfg, cfg);
});

// ── 코어25: measure(컬럼 alias) 판별 ──
test("classifyMeasureName: alias → measure 종류", () => {
  assert.equal(classifyMeasureName("avg_amt"), "avg");
  assert.equal(classifyMeasureName("max_amt"), "max");
  assert.equal(classifyMeasureName("min_amt"), "min");
  assert.equal(classifyMeasureName("sum_dlng_amt"), "sum");
  assert.equal(classifyMeasureName("TOTAL_AMOUNT"), "sum");
  assert.equal(classifyMeasureName("cnt"), "count");
  assert.equal(classifyMeasureName("CNT_PAY"), "count");
  assert.equal(classifyMeasureName("merchant_nm"), null);
});
test("measureKind: 표시 measure(amount-like 우선, 없으면 건수, 기본 sum)", () => {
  assert.equal(measureKind([{ merchant_nm: "GS25", max_amt: 30000 }]), "max"); // #70
  assert.equal(measureKind([{ merchant_nm: "GS25", min_amt: 1500 }]), "min");  // #71
  assert.equal(measureKind([{ dow: "월", avg_amt: 8000 }]), "avg");            // #72
  assert.equal(measureKind([{ merchant_nm: "GS25", cnt: 5 }]), "count");       // #69
  assert.equal(measureKind([{ merchant_nm: "GS25", sum_dlng_amt: 12000 }]), "sum");
  assert.equal(measureKind([{ merchant_nm: "GS25", sum_dlng_amt: 12000, cnt: 5 }]), "sum"); // amount-like 우선
  assert.equal(measureKind([]), "sum");
  assert.equal(measureKind([{ channel_nm: "온라인", max_amt: 30000 }]), "max"); // #74
});
test("orderDirection: order_by.direction → asc|desc|null (봉투 shape 방어)", () => {
  assert.equal(orderDirection({ order_by: { column: "sum_dlng_amt", direction: "ASC" } }), "asc"); // #66
  assert.equal(orderDirection({ order_by: [{ column: "cnt", direction: "DESC" }] }), "desc");
  assert.equal(orderDirection({ order_by: "asc" }), "asc");
  assert.equal(orderDirection({}), null);            // 신호 없음 → 기존 동작
  assert.equal(orderDirection(null), null);
  assert.equal(orderDirection({ order_by: { column: "x" } }), null); // direction 없음
});
