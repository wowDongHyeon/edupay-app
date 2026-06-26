# aegis-dev000 검토 리포트 — edupay-app

> 대상: `edupay-app` (에듀페이/다채움 — 충북 교육 지원금 결제 앱, Vite + React)
> 검토 에이전트: `aegis-dev000` (개발 공통/코어 팀) · SPECIALIST.md 표준 기반
> 검토일: 2026-06-26 · 등급: A(읽기 전용 진단) — **코드 변경 0, 권고만 제시**

```
[aegis-dev000] 목표: edupay-app를 개발 전문서 표준으로 진단 | 난이도 D3
[S0 인지] SPECIALIST.md 표준 S1~S7 + DoD 체크리스트 적용
[검증] 빌드 exit 0 실측 | 테스트 0개 | 전문서 체크리스트 7항목 대조
[ALC] 진단 완료 — 변경은 평식 승인 후
```

---

## 1. 한눈에 보기 (Executive Summary)

| 구분 | 결과 |
|------|------|
| 빌드 | ✅ **성공 (exit 0 실측)** — 888 모듈 변환, 산출물 정상 생성 |
| 테스트 | ❌ **테스트 자체 없음** (test 스크립트·테스트 파일 0개) |
| 보안 | ⚠️ **주의 2건** — 프론트 API 키 노출 패턴 / `.env.production` git 추적 |
| 설계 문서 | ✅ 양호 — 설계서 4종(DATASOURCE·MOCK_API·TEMPLATE·전환계획) 존재 |
| 인코딩 | ✅ UTF-8, BOM 없음 (`.ps1` 없음) |
| 변경 잔재 | ⚠️ README가 현재 코드와 불일치(stale) |

**종합:** 빌드되는 건강한 프론트엔드 프로젝트. 다만 **실서비스 전환 전 반드시 처리할 보안 2건**과 **테스트 부재**가 핵심 숙제다. 나머지는 경미.

---

## 2. 표준 대조 (SPECIALIST §2 — S1~S7)

| 표준 | 판정 | 근거 (실측) |
|------|------|------------|
| **S1 실측 우선 설계** | ✅ | 설계서 4종 + `graphify-out` 분석 산출물 존재. 데이터창구가 `contract.js` 계약 기반으로 분리됨 |
| **S2 파일 인코딩** | ✅ | `src/` 전체 BOM 없음, `.ps1` 파일 없음 — UTF-8 정합 |
| **S3 셸 안전** | ✅ (N/A) | 셸 스크립트 없음 — 해당 위험 없음 |
| **S4 병렬 충돌 방지** | ⚠️ | `src/App.jsx`가 **1,197줄 집약파일** — 병렬 수정 시 반드시 순차화(§PAW-3) 대상 |
| **S5 변경 잔재 0 (CRZ)** | ⚠️ | `README.md`가 `App.jsx`를 "스캐폴드 placeholder"로 기술하나 실제는 완성된 1,197줄 본체 — **stale 문서** |
| **S6 인터페이스 I/O 표준** | ✅ | 데이터소스 어댑터들이 `onData/onResult/onError` 계약 + `{ok,...}` envelope 사용. 미설정 시 mock 폴백(fail-safe) 설계 양호 |
| **S7 검증 무결성 (VIP)** | ✅ (실측) | 빌드 `exit 0` 직접 확인 (자가보고 아님). 단, 자동 테스트가 없어 회귀 검증 수단 부재 |

---

## 3. 보안 점검 ⚠️ (실서비스 전환 전 필수)

### 3-1. 프론트엔드 API 키 노출 패턴 — `src/api/claude.js`
- **실측:** 브라우저에서 Anthropic API를 직접 호출하며 `VITE_ANTHROPIC_API_KEY`가 **번들에 포함**됨 (`anthropic-dangerous-direct-browser-access: true`).
- **맥락:** 코드 주석·README 모두 **"시연 전용, 키 노출됨"**을 명시 — 의도된 임시 구조. README도 "AI 키는 절대 프론트에 두지 말 것 — 서버 경유로만"이라 경고함.
- **판정:** 현재는 시연용으로 용인되나, **실서비스 전환 시 백엔드 프록시로 교체 필수**(SPECIALIST SAFETY 항목). 저한도 키 사용·시연 후 폐기·git 커밋 금지 원칙을 운영에서 지킬 것.

### 3-2. `.env.production`이 git에 추적됨
- **실측:** `.gitignore`는 `.env`·`.env.local`만 제외 → **`.env.production`·`.env.example`은 git 추적 중** (커밋 이력에도 존재).
- **현 상태:** `.env.production`의 `VITE_ANTHROPIC_API_KEY` 값은 **현재 비어 있음(EMPTY)** → 지금 당장 유출된 비밀키는 **없음** `[실측]`.
- **위험:** 누군가 나중에 이 파일에 실제 키를 채워 커밋하면 즉시 유출. **`.env.production`을 `.gitignore`에 추가** 권장 (C등급 변경이므로 승인 후).

> 두 항목 모두 비가역/비밀 영역이라 **자율 수정하지 않고 권고만** 함 (SPECIALIST SAFETY 게이트).

---

## 4. 완료 체크리스트 (SPECIALIST §6 Definition of Done)

- [x] 빌드 성공 (exit 0 실측 — 샌드박스에서 Linux rollup 바이너리 보충 후 확인)
- [ ] **테스트 통과 — 테스트 인프라 자체가 없음** (vitest 등 미도입, 테스트 파일 0개)
- [x] 인코딩 정합 (UTF-8 no BOM)
- [ ] **변경 잔재 0 — README가 현재 코드와 불일치(App.jsx 설명 stale)**
- [x] 포트·서비스 SSOT — 프론트 단독이라 대부분 해당 없음 (데이터소스는 `VITE_DATA_SOURCE` 한 곳에서 분기)
- [ ] **SAFETY 항목(API 키·.env) — 운영 정책으로 게이트 필요**
- [x] impact_scope 변경 없음 (읽기 전용 진단)

---

## 5. 권고 (우선순위순)

| # | 등급 | 권고 | 근거 |
|---|------|------|------|
| 1 | 보안 | 실서비스 전환 시 `claude.js`를 백엔드 프록시 호출로 교체, 키는 서버에만 | §3-1, SPECIALIST SAFETY |
| 2 | 보안 | `.env.production`을 `.gitignore`에 추가, 키는 배포 환경변수로 주입 | §3-2 |
| 3 | 품질 | 최소 테스트 도입(vitest + 데이터소스 폴백/envelope 계약 테스트) → 회귀 안전망 | DoD 테스트 항목 |
| 4 | 잔재 | `README.md`의 `App.jsx` "placeholder" 설명을 현재 상태로 갱신 (CRZ) | S5 |
| 5 | 성능 | 번들 1.27MB(gzip 335KB·>500KB 경고) → `manualChunks`/동적 import로 코드 스플릿 | 빌드 경고 실측 |

> 1·2번은 비가역/비밀 영역(C등급)이라 **승인 후 처리**. 3·4·5번은 가역(B등급)이라 원하시면 바로 작업 가능.

---

## 6. 부록 — 적용 메모

- **에이전트 설치 완료:** `edupay-app/.claude/agents/aegis-dev000.md` + `SPECIALIST.md` 배치 → 향후 Claude Code(CLI)에서 `aegis-dev000` 서브에이전트로 호출 가능.
- **빌드 재현 메모:** 이 프로젝트의 `node_modules`는 Windows에서 설치됨 → Linux에서 빌드하려면 `@rollup/rollup-linux-x64-gnu` 보충 필요(환경 차이일 뿐 코드 결함 아님). Windows 본 환경에서는 `npm run build`가 정상 동작할 것으로 추정 `[추정]`.

---

_검토: aegis-dev000 v1.0 | A등급 읽기 전용 진단 | 코드 변경 0 | 2026-06-26_
