# edupay-app (React 웹앱) — 작업 지시

> 이 폴더(`edupay-app/`)의 상위 프로젝트 맥락은 `../CLAUDE.md`(폭스에듀 오페리아)를 따른다.
> 이 파일은 edupay-app 작업 시 **개발 작업 라우팅 규칙**을 추가로 강제한다.

## 개발 작업은 aegis-dev000 에이전트로 위임 (조건부)

`edupay-app`에서 **규모가 크거나 비가역 위험이 있는** 개발 작업은
메인 세션이 직접 수정하지 말고 **`aegis-dev000` 서브에이전트에 위임**한다.
(aegis-dev000은 풀 프로토콜이라 안전하지만 느림 → 사소·가역 변경에는 과하므로 직접 처리한다.)

- 위임 방법: `Agent` 도구 호출 시 `subagent_type: "aegis-dev000"` 지정.
  - 에이전트 정의: 전역 `~/.claude/agents/aegis-dev000.md` (전문서: `~/.claude/agents/aegis-dev000-SPECIALIST.md`) — 전역 일원화됨(로컬 정의 제거)
  - 이 에이전트는 S0 인지 → DRP 역할분해 → §PCM 충돌검사 → 수행 → VIP 검증 → ALC 루프 프로토콜로 자율 수행한다.

### 위임 대상 (aegis-dev000)
- 다중 파일에 걸친 리팩터링·디버깅, 상태/로직 구조 변경.
- 아키텍처·폴더 구조·스캐폴딩 변경.
- 비가역(C등급) 가능성이 있는 작업(삭제·마이그레이션·배포·포트/URL·정본 수정 등).
- 사용자가 위임을 명시했거나, 변경 영향 범위가 불확실해 충돌검사·검증이 필요한 경우.

### 메인 세션 직접 처리 (위임 불필요)
- **단일 파일에 한정된 가역적 스타일/문구/색상 변경**(예: 배경색, 텍스트, 클래스 토글).
- 단순 질문 답변·설명, 코드 읽기/탐색만 하는 조회, 1줄짜리 오타·문구 수정.
- 사용자가 "직접 해줘"라고 명시한 경우.
- 단, 직접 처리하더라도 **검증 기준은 동일**하게 따른다: `npm run build` exit code 실측 +
  필요 시 Playwright(`dev-playwright-verify-loop`) 확인. C등급(삭제·포트/URL·정본 등)은 직접 실행 금지·제안만.

### 위임 시 주의
- `aegis-dev000`의 SAFETY 게이트(C등급: 삭제·비가역 마이그레이션·배포·force-push·포트/URL 변경·정본 수정 등)는
  자율 실행 금지 → 동현 게이트/directive 위임으로 **제안만** 한다.
- 빌드/테스트 "성공" 자가보고를 그대로 믿지 말고 exit code·산출물을 실측 재검증한다(T98 AIP).
- 검증은 `dev-playwright-verify-loop`(자동) + 필요 시 `dev-chrome-live-verify`(라이브) 기준을 따른다.

## 병렬 터미널 작업 시 파일 락 (agent-task-lock)

**터미널(CLI 세션)을 2개 이상 동시에 띄워** 이 프로젝트를 작업할 때만 적용한다.
단일 세션 단독 작업이면 불필요 — 무시한다.

- 각 세션은 시작 시 **고유 session_key**를 정한다: `WS-<날짜>-<터미널구분>-<임의4자리>`
  (예: `WS-20260709-t1-9f21`). 두 세션이 같은 키를 쓰면 서로를 자기 락으로 오인해 충돌 판정이 안 되니 금지.
- **파일을 Edit/Write/삭제하기 전** 대상 경로를 `claim-wait`로 선점한다. 다른 세션이 붙잡고 있으면
  자동 대기했다가 풀리는 즉시 이어서 진행한다(사람 개입 불필요):
  ```bash
  python "C:/Users/wskyl/.claude/skills/agent-task-lock/scripts/task_lock_manager.py" claim-wait \
    --session-key "WS-20260709-t1-9f21" --agent-id "t1" --task-id "<작업요약>" \
    --files "src/App.jsx,src/store/xxx.js" --why "<왜>" --timeout 900
  ```
  exit 0 = 락 획득(진행), exit 1 = TIMEOUT(진행 중단·보고). cwd가 이 프로젝트면 `--root` 생략 가능(.git 자동탐지).
- **작업 종료 시(성공·실패·예외 무관) 반드시 release** — 빠뜨리면 다른 세션이 최대 TTL(30분) 헛대기한다:
  ```bash
  python "C:/Users/wskyl/.claude/skills/agent-task-lock/scripts/task_lock_manager.py" release --session-key "WS-20260709-t1-9f21"
  ```
- 30분 넘는 장시간 작업은 중간에 `heartbeat --session-key "..."`로 TTL을 갱신한다.
- 이 락은 **협조적**이다 — claim 없이 직접 Edit하는 세션은 막지 못하므로, 병렬 작업 중인 모든 세션이 위 규약을 지켜야 효력이 있다.
- 공유·집약 파일(전역 설정·라우터·store·`index.*`·엔트리포인트)은 애초에 여러 세션에 동시 배정하지 않는 것이 최선 — 락은 "그래도 겹쳤을 때의 안전망"이지 병렬 설계를 대체하지 않는다.

### 락 상태 표출 (사용자 인지용)

- **락 대기·충돌·타임아웃이 발생하면 조용히 넘어가지 말고 즉시 사용자에게 한 줄 알린다**:
  - 대기 진입: `🔒 락 대기: <파일> — 선점자 <session_key>, 풀릴 때까지 대기 중…`
  - 대기 후 획득: `🔓 락 획득: <파일> (약 N초 대기 후 재개)`
  - 타임아웃(exit 1): `⛔ 락 타임아웃: <파일> — 선점자 미해제로 진행 중단` 후 사용자 판단 요청.
  - (`claim-wait`은 대기 진입 시 stderr에 `[wait] blocked by ...`를 이미 찍으므로, 그 신호를 근거로 위 한 줄을 사용자에게 전달한다.)
- **작업 완료 보고 시**, 이 세션이 락을 한 번이라도 썼다면 기존 3줄 보고(⏱ 🛠 🤖) **아래에 락 로그 1줄을 추가**한다.
  release 직후 `summary`로 뽑아 그대로 붙인다(`ledger.jsonl`을 직접 파싱하지 말 것 — 집계는 스크립트에 위임):
  ```bash
  python "C:/Users/wskyl/.claude/skills/agent-task-lock/scripts/task_lock_manager.py" summary --session-key "WS-..."
  ```
  → 반환 JSON의 `line`을 그대로 사용: `🔒 락 로그: claim 1 / 대기 1회(총 3s) / 재개 1 / release 1 / 타임아웃 0`
  (락을 전혀 안 쓴 단독 작업이면 이 줄은 생략한다.)

## operia 연동 — 프론트 렌더/라벨 규칙 (지속)

- **라벨 우선순위**(`src/charts/codeLabels.js` `labelForColumn`): ① `COLUMN_LABELS`(대소문자 무시, 키는 영문 대문자) → ② `metaLabel`이 **한글일 때만**(`/[가-힣]/`) → ③ raw 컬럼명. 영문 metaLabel은 화면에 내보내지 않는다.
- **reportPlan 라벨을 컬럼 라벨 소스로 쓰지 말 것.** operia reportPlan은 LLM 생성이라 비결정적(같은 질의도 실행마다 한글↔영문, title 변동)이고, kpi_grid/kpi_cards 라벨이 집계형("주소 종류", "가맹점 수")이라 컬럼 헤더로 부적합. 라벨은 프론트 `COLUMN_LABELS`가 단일 소유. 새 컬럼이 영문으로 새면 이 맵에 한 줄 추가.
- **balance 3항목·좌표는 bilingual**(영문+한글 키 둘 다 인식). operia가 `columnMetadata.column`·`tableData` 키를 영문(`ACCOUNT_BALANCE_AMT`)↔한글(`계좌 잔액`)로 오락가락 보내므로, 컬럼명 매칭은 항상 영문/한글 별칭을 함께 둔다. (balance shape `src/mock/operia/queries.js`, 좌표 `src/charts/shapeForIntent.js` roleOf/COORD_PREF)
- **operia 서버 특성**: 실서버 flakiness ~50%(간헐 "연결 안 돼" → 재시도 시 정상). 라이브 검증은 재시도 전제로 진행.
- **else/미분류 질의**는 `ReportPlanRenderer` 폴백으로 렌더(전용 카드 없음).
- 사용처별/catSpend 카드의 기간 배지는 제거함(operia 쿼리에 기간 필터 없음=전체 기간). 월별 배지는 실제 월수로 동적 계산(정확)이라 유지.

### 진행 중 (2026-07-10 세션 — 상세는 `_cli-handoff/세션상태_남은일.md`)

> 정본 폴더 = **Documents**(OneDrive 사본 폐기 예정, 거기서 dev/CLI 금지). 모든 CLI 핸드오프 고정: **커밋 금지(워킹트리만)** · 작업/dev 폴더 Documents · `.env.local`·dev 종료 게이트(동현).

- **완료(미커밋)**: 진입칩 4/8 토글(`SHOW_ALL_QUICK_QUERIES`)+즐겨찾기 연동(`FAV_KEY`), report "집계중"→실사용액/없음 문구, 재진입 리셋 10s 임계값(`VITE_REENTRY_RESET_MS`), 여우 로더(세미업라이트+다리펌핑+먼지+출발 먼지구름 대시, `VITE_FOX_RUN_DUR`·`FOX_LOADER_CONFIG`), Q5 category_nm 업종명·주소" -" 트림·"기타"숨김, 채널 아이콘제거·"전체 내역/거래", 긴이름 탭펼치기(`ExpandableText`), 위치 getUserLocation seam(session.js).
- **대기 CLI**(프롬프트 상세 = `_cli-handoff/세션상태_남은일.md`): 재진입 네이티브 신호 웹뷰측(Flutter 반영 후 — `_cli-handoff/재진입-네이티브신호-웹뷰.md`), 여우 on/off config(`VITE_FOX_LOADER_ENABLED`, 기본 OFF — 이사님 "여우 빼자"), `+`버튼 제거(이사님), 랜딩칩 왼쪽정렬(items-stretch), 4/8 `.env.local`화, 걷기속도 `VITE_FOX_WALK_DUR`, 위치 30km가드 제거+권한없음 안내, 로그인ID없음 안내, reportPlan 제목 프론트소유(+KPI·표만).
- **외부 요청**: Flutter(재진입 신호 `window.eduPayOnReentry` — 네비 복귀 시점만, 화면꺼짐 제외 / getEduPayUser는 이미 lat·lng 제공), operia(Q5 전국 위치데이터·응답계약 최종 골든SQL 기준 갱신).
