// 맥락 분기(catContext) 단위 테스트 — 감지(dow/hour/grade)·적용(제목/부제/행라벨/푸터)·회귀(기본 유지).
//   러너: node --test (stdlib, 새 의존성 없음).  실행: node --test src/charts/catContext.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCatContext, applyCatContext, catKindOf } from "./catContext.js";

// intentConfig.contexts 미러(문자열 소유는 intentConfig, 여기선 적용 검증만)
const MB = { title: "주로 어디에 썼을까?", subtitle: "가맹점별 사용 금액 순", contexts: {
  dow:  { title: "요일별 사용", subtitle: "요일별 사용 금액" },
  hour: { title: "시간대별 사용", subtitle: "시간대별 사용 금액" },
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
