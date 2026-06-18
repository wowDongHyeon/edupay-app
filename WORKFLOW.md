# edupay-app 작업 공통 규격 (WORKFLOW)

이 프로젝트의 모든 개발 작업이 따르는 공통 규격. (IHB_WEB 작업 방식 → Vite+React 스택에 적응)
세 개의 하네스: ① 역할 분리(설계↔개발) ② 표준 루프(개발↔Playwright 검증) ③ graphify(컨텍스트 절약).

---

## 1. 역할 분리 (하네스 ①)
- **Cowork(Claude in Cowork)**: 분석, 패턴 설계, 설계서(.md) 작성, **CLI 프롬프트 작성**. 코드 파일은 직접 만들지 않는다.
- **Claude Code CLI**: 실제 파일 생성/수정 + **Playwright 검증**.

---

## 2. 표준 개발 루프 (하네스 ②) — 항상 적용
1. **Cowork 분석·설계** — 캡처/명세/스키마 기반 분석 → 설계서(.md) 작성(§5 체크리스트).
2. **Cowork → CLI 프롬프트** — **첫 줄 `graphify query "..."`**, 목적·교체지점(DEV MOCK)·검증조건 명시(§4 템플릿).
3. **CLI 코드 작성** — 설계서 + graphify + CLAUDE.md 보고 구현.
4. **CLI Playwright 검증** — dev 서버(localhost:5173) 진입, 시나리오 실행, **스크린샷 분석**(§6).
5. **불일치 → CLI 재작성** (3↔4 루프) — 갭 하나씩. 구조 깨지면 `git` 롤백 후 재시작.
6. **완료** — 기능 단위 끝나면 `graphify update .` + 마일스톤 현황 갱신(§7).

> 핑퐁 중(같은 기능 반복 수정)엔 `graphify update` 스킵. 기능 완료/모듈 전환 시 실행.

---

## 3. graphify 규칙 (하네스 ③ — 컨텍스트 절약)
graphify는 **CLI 환경 전용** CLI 도구(Cowork엔 없음). 코드그래프 `graphify-out/`.

- 코드베이스 질문은 **먼저 `graphify query "<질문>"`** (graphify-out/graph.json 있을 때). 관계는 `graphify path "<A>" "<B>"`, 개념은 `graphify explain "<개념>"`. raw grep/전체 리포트보다 작은 스코프 서브그래프 반환.
- 넓은 탐색은 `graphify-out/wiki/index.md` 우선. 아키텍처 전반 검토 시에만 `GRAPH_REPORT.md`.
- **코드 수정 후 `graphify update .`** 로 그래프 최신화(AST 전용, API 비용 없음).
- 최초 1회: edupay-app 루트에서 `graphify init .`(또는 팀 표준 init)로 `graphify-out/` 생성.

타이밍: 핑퐁 중 스킵 → 기능 완료/모듈 전환 시 `graphify update .`.

---

## 4. CLI 프롬프트 공통 템플릿 (복붙용)
모든 CLI 프롬프트는 이 골격을 따른다. **첫 줄은 항상 graphify query.**

```
graphify query "<이번 작업과 관련된 질문 — 예: 데이터 질문 카드 렌더 흐름>"

## 목적
<한두 줄. 무엇을 왜>

## 작업
설계서: edupay-app/<설계서>.md 를 먼저 읽고 그대로 구현.
<핵심 지시 — 세부는 설계서/ graphify/ CLAUDE.md 참조>

## DEV MOCK / 교체지점
<백엔드 미연동부는 목업으로. 교체 지점을 [DEV MOCK] 주석으로 표시 — §8>

## 절대 보존
<건드리면 안 되는 것 — 예: 자유대화 Claude 경로, AI 토글 로직>

## 검증 (Playwright, 반드시 foreground)
- npm run dev (이미 떠 있으면 재사용) → http://localhost:5173
- <시나리오: 어떤 질문/클릭 → 기대 화면>
- 스크린샷 저장 후 Read로 분석. 실패 시 수정-재검증 반복(통과까지).

## 완료
- 통과 시 `graphify update .` 실행, WORKFLOW.md §7 마일스톤 현황 갱신.
```

원칙: **목적·의도만 간결히**. 세부 구현은 CLI가 graphify+설계서 보고 판단. 한 번에 갭 하나.

---

## 5. 설계서 필수 구성 체크리스트 (Cowork이 설계서 만들 때)
신규 화면/기능 설계서에 아래를 빠짐없이 포함:
1. **목적/범위** — 무엇을, 어디(파일), 왜.
2. **데이터 계약** — 입력/출력 형태(예: 오페리아 `result` 스키마), 목업 위치.
3. **컴포넌트/모듈 설계** — 새 파일 목록·역할, 기존과의 연결(import 지점).
4. **상태/이벤트** — 상태 구조, 주요 인터랙션.
5. **DEV MOCK 교체지점** — 목업↔실연동 스위치 위치(예: `VITE_OPERIA_API`).
6. **절대 보존 항목** — 회귀 방지(건드리면 안 되는 기존 동작).
7. **Playwright 검증 시나리오** — 질문/클릭 → 기대 화면, 스크린샷 포인트.
8. **전환(실연동) 메모** — 나중에 실제 API/DB로 바꿀 때 할 일.

---

## 6. Playwright 검증 규격 (edupay-app)
### 환경
- 서버: `npm run dev` → `http://localhost:5173` (이미 실행 중이면 재사용)
- 브라우저: chromium 또는 시스템 chrome(`channel="chrome"`)
- WebView 모드 확인 시 URL: `http://localhost:5173/?view=webview`
- 스크린샷 저장: `C:/Users/Public/edupay_<name>.png` (Read 툴로 바로 읽기)

### 채팅 진입/질문 패턴
- 입력창: `input[placeholder="메시지를 입력하세요"]` → `.fill(질문)` → `.press("Enter")`
- 인트로면 "시작하기" 클릭 후 메뉴/채팅 진입.
- 응답 카드 렌더 대기(타이핑 인디케이터 사라질 때까지) 후 스크린샷.

### 데이터 질문 10개 회귀 체크 (차트 렌더)
월별→bar / 사용처별→donut / 친구비교→compare / 조르기비교→compare / 근처가맹점→map /
남은금액→gauge / 온오프라인→donut / 어디에주로→barlist / 부모카드→list / 학교별→compare.
+ 매칭 안 되는 잡담 → 기타(자유대화) 경로(AI OFF면 로컬) 회귀 확인.

### 빌드 확인
- `npm run build` 통과 여부도 완료 기준에 포함.

---

## 7. DEV MOCK 패턴 (백엔드 미연동)
- 데이터 질문 = 오페리아 API(목업). 상세: `edupay-app/MOCK_API_설계.md`.
- 실 호출부는 교체 지점을 명확히. 예:
```js
// ↓↓↓ [DEV MOCK] 오페리아 연동 시 VITE_OPERIA_API 설정만으로 실 호출 전환 ↓↓↓
const resp = await queryOperia(intent, scope);   // operia.js가 목업/실API 분기
// ↑↑↑ [DEV MOCK] END ↑↑↑
```
- 차트 유형은 응답이 아니라 프론트가 결정(`INTENT_CHART`, 질문 기반).

---

## 8. 마일스톤 완료 현황
> 기능 단위 완료 시 체크 + `graphify update .`. (Cowork이 설계/프롬프트 단계 표시, CLI가 구현/검증 표시)

- [x] 프로토타입 → Vite+React 이식 (스캐폴드 + 9개 모듈 ES모듈화)
- [x] WebView 모드(`?view=webview`) — 헤더 숨김/메뉴 직행
- [x] 자유대화 Claude 직접 호출(시연용) + AI 기능 플래그(`VITE_AI_ENABLED`)
- [x] 오페리아 목업 연동 — operia.js + mock 10개 + 차트 레지스트리(INTENT_CHART) + ChartRenderer(default table) **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [ ] (이후) 실 오페리아 연동 — `VITE_OPERIA_API` 스위치
- [ ] (이후) 백엔드 챗 프록시(키 서버 보관) 전환

---

## 9. 절대 금지 / 보존
- Cowork은 코드 파일 직접 생성·수정하지 않는다(설계·프롬프트만).
- 자유대화 Claude 경로(`src/api/claude.js`)·AI 토글 로직은 데이터 작업 시 보존.
- 구조 깨지면 부분수정보다 `git` 롤백 우선.
- 한 프롬프트에 갭 여러 개 몰지 않기(하나씩).
