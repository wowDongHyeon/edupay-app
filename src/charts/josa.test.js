// 조사 자동선택(josa) 단위 테스트 — 받침 유무·숫자끝·영문끝 폴백·kind 3종.
//   러너: node --test (stdlib, 새 의존성 없음).  실행: node --test src/charts/josa.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { josa } from "./josa.js";

test("받침 있음 → 은/이/을", () => {
  assert.equal(josa("오프라인", "은는"), "오프라인은");
  assert.equal(josa("온라인", "은는"), "온라인은");
  assert.equal(josa("웹뷰테스트가맹점", "이가"), "웹뷰테스트가맹점이");
  assert.equal(josa("점", "을를"), "점을");
});

test("받침 없음 → 는/가/를", () => {
  assert.equal(josa("분식나라", "이가"), "분식나라가"); // DoD 예시
  assert.equal(josa("분식나라", "은는"), "분식나라는");
  assert.equal(josa("커피", "을를"), "커피를");
});

test("숫자 끝: 0·1·3·6·7·8 받침 / 2·4·5·9 무받침", () => {
  assert.equal(josa("52000", "은는"), "52000은"); // 끝 0 → 받침
  assert.equal(josa("3", "이가"), "3이");
  assert.equal(josa("2", "이가"), "2가");
  assert.equal(josa("9", "은는"), "9는");
});

test("영문/기호 끝: 폴백(받침 취급) — 병기 문자열 절대 없음", () => {
  assert.equal(josa("GS25", "은는"), "GS25는"); // 끝 5 → 무받침
  assert.equal(josa("CU", "이가"), "CU이");     // 영문 U → 폴백 받침취급
  assert.ok(!josa("CU", "은는").includes("(")); // "은(는)" 병기 없음 보장
});

test("잘못된 kind → word 원문", () => {
  assert.equal(josa("분식나라", "은"), "분식나라");
  assert.equal(josa("분식나라", undefined), "분식나라");
});
