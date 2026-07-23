import { test } from "node:test";
import assert from "node:assert/strict";
import { derivePeriod } from "./periodFromEnvelope.js";

// now 주입 → 시간 비의존 결정적 테스트.
const NOW = new Date(2026, 6, 15); // 2026-07 (월=6)
const TODAY = new Date(2026, 6, 23); // 2026-07-23

const qbMonth = (start, end) => ({ filters: [{ column: "dlng_ym", op: "BETWEEN", literals: [start, end], clause: "where", label: "DLNG_YM" }] });
const qbDay = (start, end) => ({ filters: [{ column: "dlng_dt", op: "BETWEEN", literals: [start, end], clause: "where", label: "DLNG_DT" }] });

test("YYYYMM BETWEEN, end=이번달 → 최근 N개월", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbMonth("202601", "202607") }, NOW), "최근 7개월");
});

test("YYYYMM BETWEEN, end=과거달 → YYYY.MM~YYYY.MM", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbMonth("202601", "202605") }, NOW), "2026.01~2026.05");
});

test("YYYYMMDD BETWEEN, end=오늘 → 최근 N일", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbDay("20260717", "20260723") }, TODAY), "최근 7일");
});

test("YYYYMMDD BETWEEN, end=오늘, 큰 일수(≈92일) → 최근 N개월", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbDay("20260423", "20260723") }, TODAY), "최근 3개월");
});

test("YYYYMMDD BETWEEN, end=오늘, 경계 60일 → 개월(최근 2개월)", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbDay("20260525", "20260723") }, TODAY), "최근 2개월");
});

test("YYYYMMDD BETWEEN, end=오늘, 경계 59일 → 일 유지(최근 59일)", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbDay("20260526", "20260723") }, TODAY), "최근 59일");
});

test("YYYYMMDD BETWEEN, end=과거일 → M/D~M/D", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbDay("20260701", "20260710") }, TODAY), "7/1~7/10");
});

test("날짜필터 없음 → null (배지 미표시)", () => {
  const qb = { filters: [{ column: "merchant_nm", op: "=", literals: ["편의점"], clause: "where" }] };
  assert.equal(derivePeriod({ queryBreakdown: qb }, NOW), null);
});

test("filters 없음(자산·가맹점마스터) → null", () => {
  assert.equal(derivePeriod({ queryBreakdown: {} }, NOW), null);
  assert.equal(derivePeriod({}, NOW), null);
});

test("queryInfo.조건 백업 파싱(queryBreakdown 없음)", () => {
  assert.equal(derivePeriod({ queryInfo: { "조건": ["DLNG_YM BETWEEN 202601, 202607"] } }, NOW), "최근 7개월");
});

test("단측 op(>=)는 라벨 불가 → null", () => {
  const qb = { filters: [{ column: "dlng_ym", op: ">=", literals: ["202601"], clause: "where" }] };
  assert.equal(derivePeriod({ queryBreakdown: qb }, NOW), null);
});

test("파싱 실패(비정형 literal) → null", () => {
  assert.equal(derivePeriod({ queryBreakdown: qbMonth("2026", "bad") }, NOW), null);
});
