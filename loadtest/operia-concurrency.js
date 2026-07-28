// operia AI채팅 동시접속(용량 확인형) 부하 테스트 — k6
// ---------------------------------------------------------------------------
// 설계 확정(2026-07-28 심문 세션):
//   목적       : 용량 확인형. "동시 N까지 정상"의 N을 계단식으로 확인.
//   타깃       : nginx 오페리아 게이트웨이 직접 (Vite dev 홉 제거, 키는 nginx가 주입)
//                기본 http://20.214.176.113:7071  → /api/v1/sessions, /api/v1/agent/stream
//   흐름(2단계): VU마다 ① POST /api/v1/sessions (X-User-Id) → sessionId
//                        ② POST /api/v1/agent/stream (X-Session-Id, SSE) → result 이벤트 파싱
//   성공 정의  : SSE 본문을 끝까지 읽어 `result` 이벤트의 success=true (status COMPLETED)
//                (HTTP 200만으로는 불충분 — 스트림이 200 후 실패/ success=false 가능)
//   부하 프로파일: baseline 20회(순차) → 계단식 10 → 50 → 100 → 200 (각 30s hold + 10s ramp)
//   PASS 기준  : ① 성공률 ≥ 99%  ② p95 ≤ 단건 baseline 2배  ③ 에러 유형 분리
//   중단 조건  : 성공률 90% 미만이면 threshold abortOnFail 로 전체 중단(다음 계단 안 올라감)
//   flakiness  : operia 실서버 원래 간헐 실패 ~50% → baseline 대비로만 동시성 영향 판정
//
// 실행(동현 로컬 = 사내망에서 20.214.176.113 에 닿는 환경):
//   설치: https://k6.io/docs/get-started/installation/
//   baseline 만:  k6 run -e STAGE=baseline loadtest/operia-concurrency.js
//   계단식만  :  k6 run -e STAGE=load     loadtest/operia-concurrency.js
//   둘 다     :  k6 run                    loadtest/operia-concurrency.js
//   결과 JSON :  k6 run --summary-export loadtest/summary.json loadtest/operia-concurrency.js
//
// 조정 가능한 env (기본값 = 확정값):
//   BASE_URL   기본 http://20.214.176.113:7071
//   USER_ID    기본 teststu05
//   COMPANY_ID 기본 edupay
//   QUERY      기본 "이번 달 결제 몇 건이야"
//   REQ_TIMEOUT 기본 60s (SSE 스트림 최대 대기)
// ---------------------------------------------------------------------------

import http from "k6/http";
import { check } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ── 설정 ──
const BASE_URL = __ENV.BASE_URL || "http://20.214.176.113:7071";
const USER_ID = __ENV.USER_ID || "teststu05";
const COMPANY_ID = __ENV.COMPANY_ID || "edupay";
const QUERY = __ENV.QUERY || "이번 달 결제 몇 건이야";
const REQ_TIMEOUT = __ENV.REQ_TIMEOUT || "60s";
const STAGE = __ENV.STAGE || "all"; // baseline | load | single | fine | all
// single 모드: 고정 동시성 1레벨을 일정 시간 유지(계단 없이) — 어드민에서 그 배치만 깨끗이 분석.
const VUS = Number(__ENV.VUS || 10); // single 모드 동시 VU 수
const DURATION = __ENV.DURATION || "30s"; // single 모드 유지 시간
// fine 모드: 정밀 계단식. 각 레벨을 순차(비겹침)로 돌리고 레벨 태그로 분리 집계 → 무너지는 지점 핀포인트.
const FINE_LEVELS = (__ENV.LEVELS || "2,4,6,8,10").split(",").map((x) => Number(x.trim()));
// abort: 부하 중 성공률 90% 미만 시 조기중단. single·fine 모드는 전체 표본을 얻으려 기본 OFF.
const ABORT = (__ENV.ABORT || (STAGE === "single" || STAGE === "fine" ? "false" : "true")) === "true";

// ── 커스텀 메트릭 (scenario 태그로 baseline / load 분리 집계) ──
const workflowDur = new Trend("workflow_duration", true); // stream 요청~result 도착 (성공 건만)
const sessionDur = new Trend("session_duration", true); // 세션 생성 소요
const okRate = new Rate("workflow_success"); // 성공률 (result.success=true)
const errOverload = new Counter("err_overload"); // 과부하성 실패 (timeout/503/연결)
const errFlaky = new Counter("err_flaky"); // operia 원래 실패 (422/500/success=false)
const errOther = new Counter("err_other"); // 기타 (401/403/파싱불가 등)

// ── scenarios ──
function buildScenarios() {
  const s = {};
  if (STAGE === "baseline" || STAGE === "all") {
    // 단건 순차 20회 — 기준선(성공률·p50·p95). VU 1개로 겹치지 않게.
    s.baseline = {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 20,
      maxDuration: "10m",
      exec: "runQuery",
      tags: { phase: "baseline" },
      startTime: "0s",
    };
  }
  if (STAGE === "single") {
    // 고정 동시성 VUS명이 DURATION 동안 계속 질의. 램프·계단 없음.
    s.single = {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
      exec: "runQuery",
      tags: { phase: "single" },
      startTime: "0s",
    };
  }
  if (STAGE === "fine") {
    // 각 레벨을 순차로: 30s 부하 + 20s 드레인(=50s 간격)이라 레벨끼리 겹치지 않음.
    let start = 0;
    for (const n of FINE_LEVELS) {
      s[`lvl${n}`] = {
        executor: "constant-vus",
        vus: n,
        duration: "30s",
        exec: "runQuery",
        tags: { phase: "fine", level: String(n) },
        startTime: `${start}s`,
        gracefulStop: "20s",
      };
      start += 50;
    }
  }
  if (STAGE === "load" || STAGE === "all") {
    // 계단식. baseline 뒤에 시작(all 모드에서 겹침 방지). ramp 10s + hold 30s.
    s.load = {
      executor: "ramping-vus",
      startVUs: 0,
      exec: "runQuery",
      tags: { phase: "load" },
      startTime: STAGE === "all" ? "3m" : "0s", // baseline(최대~수분) 뒤 여유
      gracefulRampDown: "10s",
      stages: [
        { duration: "10s", target: 10 }, // → 10
        { duration: "30s", target: 10 }, // hold 10
        { duration: "10s", target: 50 }, // → 50
        { duration: "30s", target: 50 }, // hold 50
        { duration: "10s", target: 100 }, // → 100
        { duration: "30s", target: 100 }, // hold 100
        { duration: "10s", target: 200 }, // → 200
        { duration: "30s", target: 200 }, // hold 200
        { duration: "10s", target: 0 }, // ramp down
      ],
    };
  }
  return s;
}

function buildThresholds() {
  const t = {
    // 중단 조건: 전체 성공률 90% 밑으로 떨어지면 즉시 abort(single·fine은 ABORT=false라 안 멈춤).
    workflow_success: [{ threshold: "rate>=0.90", abortOnFail: ABORT, delayAbortEval: "10s" }],
  };
  if (STAGE === "fine") {
    // 레벨별 성공률·지연을 요약에 강제로 노출(조건은 항상 통과 — 표시용 서브메트릭).
    for (const n of FINE_LEVELS) {
      t[`workflow_success{level:${n}}`] = ["rate>=0"];
      t[`workflow_duration{level:${n}}`] = ["p(95)>=0"];
    }
  } else {
    t["workflow_duration{phase:load}"] = ["p(95)>=0"];
  }
  return t;
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: buildThresholds(),
  // 요약에 p50/p95/p99 노출
  summaryTrendStats: ["min", "med", "avg", "p(90)", "p(95)", "p(99)", "max"],
};

// ── 1단계: 세션 생성 → sessionId ──
function createSession() {
  const res = http.post(`${BASE_URL}/api/v1/sessions`, JSON.stringify({ userId: USER_ID }), {
    headers: { "Content-Type": "application/json", "X-User-Id": USER_ID },
    timeout: REQ_TIMEOUT,
    tags: { step: "session" },
  });
  sessionDur.add(res.timings.duration);
  if (res.status !== 200 && res.status !== 201) {
    classifyHttpError(res.status);
    return null;
  }
  // sessionId 위치: 헤더 우선, 없으면 body 의 흔한 키(프론트 operia.js 와 동일 방어 파싱)
  const hdr = res.headers["X-Session-Id"] || res.headers["x-session-id"];
  if (hdr) return hdr;
  let body = null;
  try {
    body = res.json();
  } catch (e) {
    return null;
  }
  const sid =
    body &&
    (body.sessionId ||
      body.session_id ||
      body.id ||
      (body.data && (body.data.sessionId || body.data.session_id || body.data.id)));
  return sid ? String(sid) : null;
}

// ── SSE 본문에서 `result` 이벤트의 data(JSON) 추출 ──
// 형식: 이벤트 블록이 빈 줄로 구분, "event: result" 다음 "data: {...}"
function parseResultEvent(bodyText) {
  if (!bodyText) return null;
  const blocks = bodyText.split(/\n\n/);
  for (const b of blocks) {
    const lines = b.split(/\n/);
    let evt = null;
    const dataLines = [];
    for (const ln of lines) {
      if (ln.startsWith("event:")) evt = ln.slice(6).trim();
      else if (ln.startsWith("data:")) dataLines.push(ln.slice(5).trim());
    }
    if (evt === "result" && dataLines.length) {
      try {
        return JSON.parse(dataLines.join("\n"));
      } catch (e) {
        return null;
      }
    }
  }
  // event 라벨 없이 data 만 오는 서버 대비: 마지막 data 블록에서 success 키 탐색
  for (let i = blocks.length - 1; i >= 0; i--) {
    const m = blocks[i].match(/data:\s*(\{[\s\S]*\})/);
    if (m) {
      try {
        const o = JSON.parse(m[1]);
        if ("success" in o || "status" in o) return o;
      } catch (e) {}
    }
  }
  return null;
}

function classifyHttpError(status) {
  if (status === 0 || status === 503 || status === 504) errOverload.add(1);
  else if (status === 422 || status === 500) errFlaky.add(1);
  else errOther.add(1); // 401/403/400 등
}

// ── 2단계: 스트림 질의 → result 파싱 → 성공 판정 ──
export function runQuery() {
  const sessionId = createSession();
  const sessionOk = check(sessionId, { "session created": (s) => !!s });
  if (!sessionId) {
    okRate.add(false);
    return;
  }

  const res = http.post(
    `${BASE_URL}/api/v1/agent/stream`,
    JSON.stringify({ userInput: QUERY, context: { companyId: COMPANY_ID } }),
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Session-Id": sessionId,
        "X-User-Id": USER_ID,
      },
      timeout: REQ_TIMEOUT,
      tags: { step: "stream" },
    }
  );

  // HTTP 레벨 실패
  if (res.status !== 200) {
    classifyHttpError(res.status);
    okRate.add(false);
    check(res, { "stream http 200": () => false });
    return;
  }

  const result = parseResultEvent(res.body);
  const success = !!(result && (result.success === true || result.status === "COMPLETED"));

  if (success) {
    okRate.add(true);
    workflowDur.add(res.timings.duration); // 성공 건만 지연 집계(왜곡 방지)
  } else {
    okRate.add(false);
    // result 는 왔으나 success=false → operia 처리 실패(flaky), result 자체가 없으면 과부하성으로 본다
    if (result) errFlaky.add(1);
    else errOverload.add(1);
  }

  check(res, {
    "stream http 200": (r) => r.status === 200,
    "result success=true": () => success,
  });
}

// baseline / load 공통 진입점은 runQuery 하나(위 scenarios.exec 참조).
