// wonCompact/numCompact 단위 테스트 — 임계값 경계·만/억 반올림·회귀(won 바이트 동일)·방어.
//   러너: node --test src/charts/money.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { numCompact, wonCompact } from "./money.js";

test("1천만 미만 → won/num 바이트 동일(회귀 0)", () => {
  assert.equal(wonCompact(12000), "12,000원");
  assert.equal(wonCompact(100000), "100,000원");
  assert.equal(numCompact(100000), "100,000");
  assert.equal(wonCompact(9999999), "9,999,999원"); // 임계값 직전
});

test("1천만 ~ 1억 미만 → 만 단위 반올림", () => {
  assert.equal(wonCompact(32560000), "3,256만원"); // DoD 예시
  assert.equal(numCompact(32560000), "3,256만");   // 원 없음(barlist unit 결합용)
  assert.equal(wonCompact(10000000), "1,000만원"); // 경계(1천만 포함)
});

test("1억 이상 → N.N억", () => {
  assert.equal(wonCompact(123400000), "1.2억원"); // DoD 예시
  assert.equal(wonCompact(100000000), "1.0억원"); // 경계(1억)
  assert.equal(numCompact(250000000), "2.5억");
});

test("null/0/음수 방어", () => {
  assert.equal(wonCompact(null), "원"); // won(null)과 동일
  assert.equal(wonCompact(0), "0원");
  assert.equal(numCompact(0), "0");
  assert.equal(wonCompact(-32560000), "-3,256만원");
});
