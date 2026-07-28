# 설계서 — operia AI채팅 동시접속 부하 테스트

- 작성일: 2026-07-28
- 작성: 동현 × Cowork (심문 세션 확정)
- 대상: operia NL2SQL AI채팅 (edupay-app 연동)
- 산출물: `loadtest/operia-concurrency.js` (k6 스크립트), `loadtest/CLI핸드오프_operia동시성.md`
- 선행 결과: 대량 데이터 1000만 건 테스트 완료 — "인덱스 있으면 1000만 건도 속도 OK" 결론(2026-07)

---

## 1. 목적 & 완료의 정의(DoD)

**목적** — 용량 확인형(capacity check). AI채팅에 **동시에 NL2SQL 쿼리를 던져** "동시 N명까지는 정상적으로 버틴다"의 N을 확인한다.

- 단순 연결 유지가 아니라 **실제 쿼리 동시 실행**(세션 생성 + 스트림 질의)이 부하 단위다. 병목은 LLM 추론 + SQL 실행에 생긴다.
- 한계 탐색(브레이킹 포인트 찾기)은 이번 계단식에 자연스럽게 포함되지만, 주 목적은 "목표 부하에서 정상인가" 확인이다.

**DoD** — 아래 세 지표가 계단별로 집계되고, "동시 N까지 PASS / N 초과에서 무너짐"이 수치로 정리되어 학습가이드에 기록되면 완료.

---

## 2. 부하 프로파일

계단식으로 동시 사용자 수를 올리며 각 구간을 관찰한다.

| 구간 | 동시 VU | 유지(hold) | 램프(ramp) |
|---|---|---|---|
| baseline | 1 (순차 20회) | — | — |
| 계단 1 | 10 | 30s | 10s |
| 계단 2 | 50 | 30s | 10s |
| 계단 3 | 100 | 30s | 10s |
| 계단 4 | 200 | 30s | 10s |

- hold 30s = p95가 안정적으로 수렴하기에 충분하고, 실값 로그·LLM 호출 낭비는 최소.
- 단일 값이 아닌 계단식 → "100은 되는데 200부터 깨진다" 같은 곡선을 얻어 한계 탐색까지 겸한다.

---

## 3. PASS 판정 기준

| # | 지표 | 기준 |
|---|---|---|
| ① | 성공률 (result.success=true 비율) | ≥ 99% (계단별) |
| ② | 응답 지연 p95 | ≤ **baseline p95 × 2** |
| ③ | 에러 유형 분리 | 과부하성 실패만 "동시성 한계"로 판정 |

**성공의 정의(중요)** — SSE 스트림이라 HTTP 200만으로는 불충분. 스트림 본문을 끝까지 읽어 **`result` 이벤트의 `success=true`(status=COMPLETED)** 도착까지를 성공으로 본다.

**flakiness 배제** — operia 실서버는 원래 간헐 실패(~50%, CLAUDE.md 기록). 그래서:
- 부하 직전 **baseline(동일 쿼리 단건 20회)**로 성공률·p50·p95 기준선을 잰다.
- 그 기준선 대비 부하 시 성공률이 유의미하게 더 떨어질 때만 "동시성 때문"으로 판정.
- 에러를 세 종류로 나눠 집계: `err_overload`(timeout/503/504/연결끊김/result 없음 = 과부하성) vs `err_flaky`(422/500/success=false = operia 원래 실패) vs `err_other`(401/403 등). **err_flaky는 서버 특성이라 판정에서 제외**, err_overload 증가만 한계 신호.

**타임아웃** — baseline p95 × 4 또는 30s 중 큰 값 (스크립트 기본 요청 타임아웃 60s).

---

## 4. 타깃 & 요청 흐름 (impact scope)

**타깃** — nginx 오페리아 게이트웨이 직접: `http://20.214.176.113:7071`

- 근거: `vite.config`상 프론트는 `/api`를 이 nginx로 프록시하고, **nginx가 API 키를 서버에서 주입**한다. `localhost:5173`(Vite dev)을 경유하면 단일 Node 프로세스인 Vite가 먼저 병목이 되어 "operia 동시성"이 아니라 "Vite 프록시 처리량"을 재게 됨 → **Vite 홉 제거, nginx 직접**.
- API 문서(§2.1)엔 "인증=Bearer Token"이라 돼 있으나, 실제 배포 경로는 **키를 클라이언트가 안 들고 nginx가 주입**하는 구조. 그래서 k6는 키 없이 `X-User-Id`/`X-Session-Id` 헤더만 보낸다.

**2단계 흐름** (VU마다):

1. `POST /api/v1/sessions` — 헤더 `X-User-Id: teststu05`, 본문 `{"userId":"teststu05"}` → 응답에서 `sessionId`(헤더 `X-Session-Id` 우선, 없으면 본문 키 방어 파싱)
2. `POST /api/v1/agent/stream` — 헤더 `X-Session-Id`, `X-User-Id`, `Accept: text/event-stream`, 본문 `{"userInput":"이번 달 결제 몇 건이야","context":{"companyId":"edupay"}}` → SSE 스트림(`data` 이벤트 → `result` 이벤트)

**고정 입력값**:
- 쿼리(userInput): `"이번 달 결제 몇 건이야"` — COUNT류 대표 부하. LLM 추론 + SQL이 모두 돌고 결과가 가벼워 비교가 깔끔. 1단계는 고정 단일 쿼리로 동시성 자체만 격리(다양 쿼리 믹스는 다음 단계).
- user_id: `teststu05` (실존 계정 — RLS/데이터 격리에 사용)
- companyId: `edupay`

---

## 5. 예외 & 리스크 (실행 중 이거 나오면 멈추고 판단)

1. **SSE keep-alive 지연** — 서버가 `result` 이벤트 후에도 연결을 안 닫고 유지하면, k6 `http.post`가 타임아웃(60s)까지 대기해 지연이 왜곡됨. baseline 단건이 비정상적으로 60s에 붙으면 이 케이스 → 스크립트를 streaming 방식으로 개편 필요. (세션 응답에 `Connection: keep-alive` 확인됨 → 스트림도 그럴 가능성 주시)
2. **companyId 거부** — `edupay`를 nginx/operia가 거부(403 FORBIDDEN)하면 `OPERIA`로 바꿔 재시도.
3. **동일 user_id rate-limit** — `teststu05` 단일 유저 동시요청을 서버가 제한하면 429/거부가 계단식에서 급증 → 유저 풀 로테이션으로 전환.
4. **단일 인스턴스 = 안전망 없음** — operia는 운영/개발 미분리 단일 인스턴스. 그래서 성공률 90% 미만 시 자동 abort로 과부하 상태에 더 붓지 않게 함.

---

## 6. 검증 · 중단 · 롤백

- **검증** — k6 exit code와 `--summary-export` JSON을 실측(자가보고 금지). baseline vs 계단식 수치 비교로 사람이 PASS 최종 확정.
- **중단 조건** — 성공률 90% 미만이면 k6 threshold `abortOnFail`로 전체 중단(다음 계단 안 올라감). abort 지점 = 브레이킹 포인트.
- **롤백** — 이 테스트는 읽기성 부하라 시스템 상태를 바꾸지 않음(코드 변경 없음). "되돌리기" 대상은 없음. 단, 부하가 실서버에 부담을 주므로 abort/수동중단(Ctrl+C)이 곧 롤백.
- **커밋/배포** — 스크립트·설계서는 워킹트리에만. 커밋·병합·배포는 동현이 직접(하네스 규칙).

---

## 7. 실행 절차 (요약)

1. `k6 version` 확인 (설치됨: v2.1.0)
2. 연결 확인: `POST /api/v1/sessions` → 200 + sessionId (확인 완료 2026-07-28)
3. baseline: `k6 run -e STAGE=baseline loadtest/operia-concurrency.js`
4. 계단식: `k6 run -e STAGE=load loadtest/operia-concurrency.js`
5. 결과 표 작성 → 학습가이드 build-up (정본 수정이므로 제안 후 동현 게이트)

---

## 8. 보안 유의

이 부하로 실값(잔액·포인트 등)이 LLM/로그에 대량 유입됨 → CLAUDE.md 기준 **실값 로그 = N2SF S등급** 생성. 이번엔 "S등급 로그 생성됨" 사실만 결론에 명기하고, 정리는 보안 트랙에서 별도 처리.

---

## 9. 미결 · 다음 단계

- baseline·계단식 실측 결과 반영 (진행 중)
- SSE keep-alive 여부 실측 → 필요 시 스크립트 streaming 개편
- companyId 실값(`edupay` vs `OPERIA`) 서버 기대값 확정
- 1단계(고정 쿼리) 후 → 2단계: 1000 평가셋 샘플 믹스로 현실성 부하
- 프론트 경유(E2E) 부하는 별도 트랙
