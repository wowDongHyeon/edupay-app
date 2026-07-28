# CLI 핸드오프 — operia AI채팅 동시접속 부하 테스트 실행

아래 블록을 그대로 Claude Code CLI(사내망 = 20.214.176.113 에 닿는 로컬)에 붙여넣어라.

---

너는 edupay-app 프로젝트의 로컬 CLI다. operia AI채팅의 **동시접속(용량 확인형) 부하 테스트**를 실행하고 결과를 정리하라. 스크립트는 이미 작성돼 있다: `loadtest/operia-concurrency.js`.

## 절대 규칙
- **커밋·병합·배포·force-push 금지.** 워킹트리에서만 작업. 산출물 파일 생성/수정만 한다.
- dev 서버 기동/종료가 필요하면 **동현 게이트**(직접 실행 금지, 제안만). 이 테스트는 dev 서버 불필요 — nginx 게이트웨이를 직접 때린다.
- 빌드/테스트 "성공" 자가보고 금지 → k6 **exit code와 산출물(summary.json)을 실측**해 보고한다.

## 사전 조건 (실행 전 확인)
1. `k6` 설치 여부: `k6 version`. 없으면 설치법만 안내하고 멈춰라(직접 설치는 동현 게이트).
2. 사내망에서 `http://20.214.176.113:7071` 에 닿는지: `curl -s -o /dev/null -w "%{http_code}" -X POST http://20.214.176.113:7071/api/v1/sessions -H "Content-Type: application/json" -H "X-User-Id: teststu05" -d '{"userId":"teststu05"}'` → 200/201 이면 진행. 아니면 상태코드 보고하고 멈춰라.

## 실행 순서 (한 번에 하나씩, 앞 단계 PASS 후 다음)

### 1) baseline (기준선 20회, flakiness 흡수용)
```
k6 run -e STAGE=baseline --summary-export loadtest/summary_baseline.json loadtest/operia-concurrency.js
```
- `summary_baseline.json`에서 `workflow_success`(성공률), `workflow_duration`의 med·p95를 뽑아 기록.
- **operia 실서버는 원래 간헐 실패 ~50%**. baseline 성공률이 크게 낮아도 그 자체는 서버 특성이니, 계단식 비교의 "기준선"으로만 쓴다.

### 2) 계단식 부하 (10 → 50 → 100 → 200, 각 30s hold + 10s ramp)
```
k6 run -e STAGE=load --summary-export loadtest/summary_load.json loadtest/operia-concurrency.js
```
- 스크립트에 **성공률 90% 미만 시 자동 abort** threshold가 걸려 있다. abort로 끝나면 그 지점이 브레이킹 포인트 → **exit code(≠0)와 어느 계단에서 멈췄는지** 반드시 보고.
- 계단별 성능을 보려면 실행 중 콘솔의 VU 수와 `workflow_duration{phase:load}` 추이를 함께 캡처.

## 설정값 (기본값 = 확정값, 바꿀 때만 -e 로 override)
- BASE_URL=`http://20.214.176.113:7071` (nginx 게이트웨이 직접 — 키는 nginx가 주입)
- USER_ID=`teststu05` (실존 계정), COMPANY_ID=`edupay`
- QUERY=`이번 달 결제 몇 건이야` (고정 단일 쿼리)
- REQ_TIMEOUT=`60s`

## PASS 판정 (사람이 최종 확정, CLI는 수치만 제시)
- ① 성공률 ≥ 99% (계단별)
- ② p95 ≤ **baseline p95 × 2**
- ③ 에러 유형 분리: `err_overload`(과부하성: timeout/503/연결/ result 없음) vs `err_flaky`(operia 원래: 422/500/success=false) vs `err_other`(401/403 등). **err_flaky 는 서버 특성이라 동시성 판정에서 제외**, err_overload 증가만 "동시성 한계" 신호로 본다.

## 산출물
1. `loadtest/결과_operia동시성_YYYY-MM-DD.md` — 아래 표 + 결론 한 줄.

   | 구간 | 동시 VU | 요청수 | 성공률 | p50 | p95 | err_overload | err_flaky |
   |---|---|---|---|---|---|---|---|
   | baseline | 1(순차) | 20 | | | | | |
   | load 10 | 10 | | | | | | |
   | ... | | | | | | | |

   결론 예: "dev/단일 operia 기준, nginx 직접 경로에서 동시 N까지 성공률≥99%·p95≤baseline2배. N 초과 시 err_overload 급증으로 무너짐."
2. 실행 로그(콘솔 요약)와 `summary_baseline.json`·`summary_load.json` 보존.

## 마지막 (동현이 검토 후 진행)
- 결과 md의 결론 한 줄을 `D:\document\20260706_오페리아 개발서버 학습2\오페리아_NL2SQL_학습가이드.md` 에 **날짜와 함께 build-up**(덮어쓰기 금지, 이력 추가) 하자고 **제안**한다. (정본 파일 수정이므로 직접 실행 금지·제안만)
- **보안 주의 한 줄 명기**: 이 부하로 실값이 LLM/로그에 대량 유입됨 → CLAUDE.md 기준 **실값 로그 S등급** 생성. 정리는 보안 트랙 별도.

## 알려진 리스크 (실행 중 이거 나오면 멈추고 보고)
- `/agent/stream` SSE 연결을 서버가 result 후 **닫지 않고 keep-alive**로 유지하면, k6 http.post가 REQ_TIMEOUT까지 대기해 지연이 왜곡된다. baseline에서 단건 소요가 비정상적으로 REQ_TIMEOUT(60s)에 붙으면 이 케이스 → 보고하고 멈춰라(스크립트를 streaming 방식으로 바꿔야 함).
- companyId 값(`edupay`)을 nginx/operia가 거부(403 FORBIDDEN)하면 baseline curl에서 바로 드러난다 → `OPERIA` 로 바꿔 재시도해보고 결과 보고.
- `teststu05` 동일 유저 동시요청을 서버가 rate-limit 하면 429/거부가 계단식에서 급증 → err_other 로 잡히니, 그 패턴이면 "유저 풀 로테이션 필요"로 보고.
