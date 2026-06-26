# SPECIALIST — 개발(Development) 전문서

> `aegis-dev000` 팀 agent의 **개발 분야 전문지식 근거 문서**.
> agent는 작업 전 이 문서를 Read해 개발 전문가로 동작한다. 추정 금지 — 이 문서가 개발 표준의 SSOT.

## 1. 분야 정의 (Scope)

- **분야명**: 소프트웨어 개발 (Development)
- **다루는 작업(공통/코어)**: 폴더·프로젝트 스캐폴딩, 아키텍처 설계, 서비스/모듈 구현, 빌드, 단위·통합 테스트, 리팩터링, 디버깅, 의존성·환경 구성
- **다루지 않는 작업(경계)**:
  - 프로덕션 배포·서비스 재시작 → R7 Operator + **동현 게이트** (C등급)
  - 정본/헌법/dev_rules 변경 → 헌법 거버넌스 경로 (C등급)
  - 분야 외(데이터 파이프라인·운영·디자인) → 해당 분야 팀(`aegis-data000` 등)에 위임

## 2. 분야 표준 (Standards)

| # | 표준 | 근거(정본 경로) |
|---|------|----------------|
| S1 | **실측 우선 설계** — 코드·포트·의존성·심볼릭링크 SCAN 후 설계. 추정 설계 금지 | `core/constitution/dev_rules/COGNITION-FIRST-DESIGN.md` (T59 CFD) |
| S2 | **파일 인코딩** — 데이터·문서는 UTF-8 no BOM. 한글 포함 `.ps1`은 UTF-8 **BOM 필수** | 전역 CLAUDE.md FILE-ENCODING-STANDARD·§PS1-BOM |
| S3 | **셸 안전** — bash에서 `> /dev/null`(`> nul` 금지). Windows 예약명(CON/PRN/AUX/NUL/COM1~9) 파일 금지 | 전역 CLAUDE.md SHELL-SAFETY |
| S4 | **병렬 충돌 방지** — 수정 전 §PCM 매트릭스. 집약파일(app.go/main.py/settings.json)은 순차 | `PARALLEL_AGENT_WORK_METHODOLOGY.md` §PCM |
| S5 | **변경 잔재 0** — 추가/삭제/이동 후 깨진 참조·오래된 경로·중복 정본 0 확인 | `core/constitution/dev_rules/CHANGE-RESIDUE-ZERO.md` (T39 CRZ) |
| S6 | **인터페이스 I/O 표준** — 비표준 입출력은 오류 응답(fail-fast). 공통 envelope `{ok,data,error,meta}` | `core/constitution/dev_rules/AEGIS-INTERFACE-IO-STANDARD.md` (T99 AIOS) |
| S7 | **검증 무결성** — 빌드/테스트 "성공"은 exit code·산출물로 실측. 자가보고 단독 PASS 금지 | `core/constitution/dev_rules/VERIFICATION-INTEGRITY-PROTOCOL.md` (T53 VIP) |

## 3. 핵심 패턴 (Patterns)

- **점진적 뼈대 확장(PFE)**: 작은 뼈대(S0 FOUNDATION) → SKELETON → VERIFY → EXPAND → INTEGRATE. 한 번에 거대 구조 금지. (근거: T47 PFE)
- **서비스 표준 인터페이스**: 모든 서비스는 `/health`(또는 `/api/health`) probe + 표준 envelope 응답 + 포트 SSOT(INFRA_REGISTRY) 등록.
- **장기 실행 프로세스 = PM2 등록**: 단독 스크립트 실행 지양, `pm2.config.js`에 선반영. (예: customchatbot 패턴)
- **무거운 의존성 지연 대응**: import 수십 초 걸리는 모듈(langchain 등)은 기동 후 health 폴링으로 ready 확인. 즉시 200 가정 금지.
- **빌드 검증은 최종 Stage**: 병렬 분해 시 각 단위는 작성만, 빌드/통합 검증은 마지막에 일괄(§PAW).

## 4. 도구맵 (Tool Map)

| 작업 유형 | 도구 | 호출 예시 |
|----------|------|----------|
| 코드 탐색 | Grep·Glob·Explore agent | 패턴/심볼 검색 |
| Go 빌드 | `go build` / Makefile | `go build ./...` |
| Python 실행·테스트 | `python`·`pytest`·`uvicorn` | `python -m uvicorn app.main:app --port <p>` |
| TS/React | `npm`/`pnpm`·`vite` | `npm run dev` / `npm run build` |
| PowerShell | `.ps1` (UTF-8 BOM) | `powershell.exe -NoProfile -File <s>.ps1` |
| 프로세스 관리 | PM2 | `pm2 start pm2.config.js` / `pm2 list` |
| 포트·헬스 확인 | `curl`·`netstat` | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:<p>/health` |
| 충돌·claim | `claim_llm_task.py` | `--action claim/list/release` |
| 코드 품질 | quality-code agent | Agent 디스패치 |

## 5. 금지사항 / 안티패턴 (Anti-patterns)

- ❌ 심볼릭링크·포트 미확인 설계 → ✅ S1 SCAN 후 설계 (근거: P69 llm-proxy 심볼릭링크 미확인 오류, T59 CFD)
- ❌ 빌드/테스트 미검증 "완료" 선언 → ✅ exit code·로그 실측 후 선언 (T53 VIP·T98 AIP)
- ❌ 집약파일(app.go/main.py/settings.json) 병렬 동시수정 → ✅ 순차화(§PAW-3)
- ❌ 한글 `.ps1`을 BOM 없이 저장 → ✅ UTF-8 BOM (CP949 오독 → ParseError, ENC-003)
- ❌ bash에서 `> nul` → ✅ `> /dev/null` (nul 파일 생성 방지)
- ❌ SAFETY 작업(삭제·배포·재시작) 자율 실행 → ✅ 동현 게이트/directive 위임

## 6. 완료 체크리스트 (Definition of Done)

- [ ] 빌드 성공 (exit 0 실측)
- [ ] 테스트 통과 (개수·exit 실측, 자가보고 아님)
- [ ] 인코딩 정합 (UTF-8 no BOM / `.ps1` BOM)
- [ ] 변경 잔재 0 (깨진 참조·오래된 경로·중복 정본 없음 — T39 CRZ)
- [ ] 포트·서비스 SSOT 등록 (신규 서비스 시 INFRA_REGISTRY 갱신)
- [ ] SAFETY 항목 동현 게이트 경유 확인 (자율 실행 0)
- [ ] impact_scope claim 해제 (T58 CRG)

## 7. 산출물 형식 (Deliverables)

- **주요 산출물**: 폴더 스캐폴드 · 서비스/모듈 코드 · 테스트 코드 · 빌드 산출물 · 아키텍처/설계 문서
- **저장 위치 규칙**: 프로젝트 루트 하위 표준 구조(`backend/`·`frontend/`·`scripts/`·`docs/`). 설계 문서는 `plans/` 또는 `docs/`. 임시 산출물은 scratchpad.

---

_개발 전문서 v1.0 | aegis-dev000 | 뼈대: agents/_template/SPECIALIST_DOC_TEMPLATE.md | 생성: 2026-06-26 /ao_
