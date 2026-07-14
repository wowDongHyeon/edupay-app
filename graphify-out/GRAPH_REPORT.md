# Graph Report - .  (2026-07-14)

## Corpus Check
- 101 files · ~89,696 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 669 nodes · 1124 edges · 78 communities (39 shown, 39 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.81)
- Token cost: 68,000 input · 3,757 output

## Community Hubs (Navigation)
- [[_COMMUNITY_차트 유틸·셸(ChartShell)|차트 유틸·셸(ChartShell)]]
- [[_COMMUNITY_앱 셸·채팅 오케스트레이션|앱 셸·채팅 오케스트레이션]]
- [[_COMMUNITY_카드 템플릿·프레젠테이션 설정|카드 템플릿·프레젠테이션 설정]]
- [[_COMMUNITY_질의 SQL·shaper 레지스트리|질의 SQL·shaper 레지스트리]]
- [[_COMMUNITY_ChartRenderer·shape 파이프라인|ChartRenderer·shape 파이프라인]]
- [[_COMMUNITY_소비추천 카드 UI|소비/추천 카드 UI]]
- [[_COMMUNITY_데이터소스 어댑터(mockcontract)|데이터소스 어댑터(mock/contract)]]
- [[_COMMUNITY_골든 SQL·테스트케이스|골든 SQL·테스트케이스]]
- [[_COMMUNITY_코드 라벨·쿼리 목업|코드 라벨·쿼리 목업]]
- [[_COMMUNITY_패키지·의존성|패키지·의존성]]
- [[_COMMUNITY_operia 데이터소스 실행|operia 데이터소스 실행]]
- [[_COMMUNITY_개발 하네스·워크플로우 문서|개발 하네스·워크플로우 문서]]
- [[_COMMUNITY_채팅 전송·카드 결정 흐름|채팅 전송·카드 결정 흐름]]
- [[_COMMUNITY_데이터소스 SSE 계약·팩토리|데이터소스 SSE 계약·팩토리]]
- [[_COMMUNITY_오페리아 정합·잔액 KPI 설계|오페리아 정합·잔액 KPI 설계]]
- [[_COMMUNITY_reportPlan 폴백·표 렌더|reportPlan 폴백·표 렌더]]
- [[_COMMUNITY_잔액 산식·골든 SQL(0702)|잔액 산식·골든 SQL(0702)]]
- [[_COMMUNITY_operia mock 결과셋(balancecatSpend)|operia mock 결과셋(balance/catSpend)]]
- [[_COMMUNITY_랜딩·핵심질의 칩 설계|랜딩·핵심질의 칩 설계]]
- [[_COMMUNITY_브랜드 로고·아이콘 자산|브랜드 로고·아이콘 자산]]
- [[_COMMUNITY_세션·유저 식별|세션·유저 식별]]
- [[_COMMUNITY_Claude 권한 설정|Claude 권한 설정]]
- [[_COMMUNITY_WebView 유틸·엔트리|WebView 유틸·엔트리]]
- [[_COMMUNITY_비교 카드(친구학교조르기)|비교 카드(친구/학교/조르기)]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]

## God Nodes (most connected - your core abstractions)
1. `num()` - 30 edges
2. `QUERIES (10 intent SQL + shaper registry)` - 25 edges
3. `ChartShell()` - 22 edges
4. `InsightBox()` - 16 edges
5. `TEMPLATES 레지스트리` - 13 edges
6. `won()` - 11 edges
7. `오페리아 실측→프론트 정합 (A안)` - 11 edges
8. `ChartRenderer()` - 10 edges
9. `ChartShell / InsightBox / num (charts util)` - 9 edges
10. `INTENT_CONFIG (presentation config)` - 9 edges

## Surprising Connections (you probably didn't know these)
- `InlineCard (non-data UI card router)` --conceptually_related_to--> `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  src/components/cards.jsx → MOCK_API_설계.md
- `QUERIES (10 intent SQL + shaper registry)` --conceptually_related_to--> `DEV MOCK replacement-point pattern`  [INFERRED]
  src/mock/operia/queries.js → WORKFLOW.md
- `BarListTemplate` --rationale_for--> `질의↔템플릿 N:1 + config 단일 편집 지점`  [INFERRED]
  src/charts/templates/barlist.jsx → TEMPLATE_설계.md
- `QUERIES (10 intent SQL + shaper registry)` --references--> `Milestone: Operia sim mode option B (front alasql on dataset.json)`  [EXTRACTED]
  src/mock/operia/queries.js → WORKFLOW.md
- `같은 의미 → 같은 intent·SQL 원칙` --semantically_similar_to--> `질의5번 주사용처 재학습 검증 (0706)`  [INFERRED] [semantically similar]
  오페리아_학습팀_피드백_패러프레이즈_0706.md → 오페리아_학습팀_질의5번_주사용처_검증_0706.md

## Hyperedges (group relationships)
- **데이터 창구 동형 계약: 3채널 + 프론트 카드결정 + shapeForIntent + reportPlan 폴백** —  [INFERRED 0.85]
- **10개 intent 데이터 흐름: 정답SQL ↔ 목업 alasql+fixture ↔ 카드 템플릿** —  [INFERRED 0.75]
- **3계층 카드 파이프라인: shaper → intentConfig → 제네릭 템플릿** —  [INFERRED 0.85]
- **대화 메뉴 배치 3안 비교** — chatmenu_mode1Plus, chatmenu_mode2Subhead, chatmenu_mode3Pin [EXTRACTED 1.00]
- **잔액 3항목 분해 (바우처·용돈·에듀포인트)** — golden0702_three_row_format, golden0702_voucher_balance, golden0702_allowance_balance, golden0702_edupoint [EXTRACTED 1.00]
- **디폴트 FAQ 칩 골든 SQL 4종** — golden0702_q1_balance, golden0702_q_monthly, golden0702_q_nearby, golden0702_q_by_merchant [EXTRACTED 1.00]
- **오페리아 Gold SQL 테스트케이스 세트** — gold_balance, gold_monthly, gold_nearby, gold_bymerchant [EXTRACTED 0.90]
- **주사용처 SQL 생성 + RLS 이중주입 흐름** — q5_callquvi_sqlagent, q5_rls, q5_userid_double_injection [EXTRACTED 0.85]
- **근처 가맹점 OTHER 회귀 흐름** — para_nearby_regression, para_coordinator, gold_nearby, view_v_merchant [INFERRED 0.75]
- **FOX PAY brand identity assets** —  [INFERRED 0.95]

## Communities (78 total, 39 thin omitted)

### Community 0 - "차트 유틸·셸(ChartShell)"
Cohesion: 0.10
Nodes (33): ExpandableText(), CHEONGJU, DAEJEON_SINSEONG, distM(), MapChartCard(), CAT_EMOJI, ChartShell(), dayLabel() (+25 more)

### Community 1 - "앱 셸·채팅 오케스트레이션"
Cohesion: 0.06
Nodes (39): SqlChip(), edupayPreview(), edupayRelTime(), HistoryDrawer(), activeChannelName(), AIOrb(), App(), Bubble() (+31 more)

### Community 2 - "카드 템플릿·프레젠테이션 설정"
Cohesion: 0.07
Nodes (49): Typing (intent-based loading pool), MapChartCard (Kakao map + fallback), loadKakao (SDK dynamic load), BarTemplate, BarListTemplate, CompareTemplate, dataset.json (alasql 4+2 테이블 fixture), DonutTemplate (비중 도넛) (+41 more)

### Community 3 - "질의 SQL·shaper 레지스트리"
Cohesion: 0.06
Nodes (47): BarCard (spend report bar, operia result-first), CardShell (inline data card wrapper), DonutCard (category donut, EDUPAY model), EDUPAY 데이터 모델 (레거시 폴백), InlineCard (non-data UI card router), Single-path data-card render via ChartRenderer, CHANNEL_CANON (channel normalization), labelOfCode (codeLabels — code→Korean label) (+39 more)

### Community 4 - "ChartRenderer·shape 파이프라인"
Cohesion: 0.10
Nodes (34): ChartRenderer(), dayBadge(), fmtCell(), GROUP_PRIORITY, isRows(), jsonPre(), mergeTitleFromPlan(), _pickCol() (+26 more)

### Community 5 - "소비/추천 카드 UI"
Cohesion: 0.08
Nodes (22): InlineCard(), REPORT_INSIGHT, fmtAmt(), fmtDate(), LedgerCard(), Row(), Summary(), todayISO() (+14 more)

### Community 6 - "데이터소스 어댑터(mock/contract)"
Cohesion: 0.13
Nodes (24): backendSource, EVT, isFailure(), isLastChunk(), makeDataEvent(), makeResultEvent(), sqlOf(), STATUS (+16 more)

### Community 7 - "골든 SQL·테스트케이스"
Cohesion: 0.11
Nodes (27): balance·좌표 bilingual 키 인식, 라벨 우선순위 (labelForColumn / COLUMN_LABELS), operia 실서버 flakiness ~50%, reportPlan을 라벨 소스로 쓰지 않음, ReportPlanRenderer 폴백, Gold SQL: 잔액 (V_USER_ASSET), Gold SQL: 잔액 3항목 UNION (바우처/충전금/에듀포인트), Gold SQL: 사용처별 내역 (V_PAY_USE GROUP BY MERCHANT_NM) (+19 more)

### Community 8 - "코드 라벨·쿼리 목업"
Cohesion: 0.16
Nodes (23): canonChannel(), CHANNEL_CANON, CODE_LABELS, COLUMN_LABELS, hasKorean(), labelFor(), labelForColumn(), labelOfCode() (+15 more)

### Community 9 - "패키지·의존성"
Cohesion: 0.11
Nodes (21): dependencies, alasql, prop-types, react, react-dom, recharts, description, devDependencies (+13 more)

### Community 10 - "operia 데이터소스 실행"
Cohesion: 0.22
Nodes (17): complete(), MAX_TOKENS, ensureTables(), extractAliases(), isOperiaAiMode(), knownPrompt(), parseSingleSql(), queryOperia() (+9 more)

### Community 11 - "개발 하네스·워크플로우 문서"
Cohesion: 0.12
Nodes (21): Frontend API key exposure (claude.js), App.jsx 1197-line monolith (sequential-only), .env.production git-tracked risk, aegis-dev000 review report (edupay-app), aegis-dev000 agent definition, SAFETY gate (C-grade no-autonomy), Foxedu server/DB/VPN credentials + deploy commands, S4 parallel-conflict / concentrated-file sequencing (+13 more)

### Community 12 - "채팅 전송·카드 결정 흐름"
Cohesion: 0.12
Nodes (20): Bubble (chat message renderer), COMPANY_ID (datasource context), WEBVIEW embed mode detection, cardIntent (질문→카드 결정), cardQuery (카드 내부 lazy 질의), fallback (로컬 응답), periodScope (기간 파싱), Phase A result->render bridge (+12 more)

### Community 13 - "데이터소스 SSE 계약·팩토리"
Cohesion: 0.16
Nodes (19): backendSource adapter, computeSummaryStats (client-side stats), consumeEventStream (SSE parser), Data Source SSE contract (data/result events), getDataSource (channel factory), mockSource adapter, operiaSource adapter, 3-channel single-contract architecture (+11 more)

### Community 14 - "오페리아 정합·잔액 KPI 설계"
Cohesion: 0.15
Nodes (18): 잔액 단일값 KPI 렌더(3항목 강제 금지), 타입→역할 매핑 숫자형 확장(bigint 인식), 영문 컬럼→한글 라벨 맵, SQL 칩→조회조건 칩 전환(queryInfo 폴백), LATITUDE/LONGITUDE 좌표 역할→지도 매핑, 오페리아 실측→프론트 정합 (A안), 월별 질의를 최근 3일로 좁혀 1개월만 반환(오페리아팀 전달), A안: 오페리아 인터페이스 불변, 프론트가 맞춘다 (+10 more)

### Community 15 - "reportPlan 폴백·표 렌더"
Cohesion: 0.19
Nodes (12): fmtVal(), TableCard(), tableColumns(), aggBy(), ChartSection(), CODE_LABEL, KpiCards(), KpiGrid() (+4 more)

### Community 16 - "잔액 산식·골든 SQL(0702)"
Cohesion: 0.24
Nodes (13): 용돈 충전금 산식 = ACCOUNT_BALANCE_AMT − 바우처(지원금), category_cd 프론트 한글/아이콘 매핑, 디폴트 FAQ 칩 4개 범위, 오페리아 골든 SQL 수정 전달 (2026-07-02), 에듀포인트 = CURRENT_POINT (단위 'P'), 질의 #1 — 현재 사용할 수 있는 금액, 질의 — 사용처별 내역 (MERCHANT_NM, SUM(DLNG_AMT)), 질의 — 월별 사용 내역 (DLNG_YM, SUM(DLNG_AMT)) (+5 more)

### Community 18 - "랜딩·핵심질의 칩 설계"
Cohesion: 0.22
Nodes (11): 대화 메뉴 배치 비교 데모 (엣지핀), 모드1: 입력창 ＋ 통합 액션시트, 모드2: 자동 숨김 서브헤더, 모드3: 엣지 핀(우상단 축소 원), 지난 대화 바텀시트 / 새 대화 확인, 핵심질의 4개 칩(코드 고정 상수), 핵심질의 4개 / 즐겨찾기(★) 분리 개편 설계, 진입화면(빈 대화): 인사말 아래 핵심질의 칩 (+3 more)

### Community 19 - "브랜드 로고·아이콘 자산"
Cohesion: 0.22
Nodes (9): AI Avatar (FOX PAY fox-ears mark on purple circle), Launcher Icon (FOX PAY, purple gradient rounded square with white speech-bubble mark + 'Pay'), Launcher Icon White variant (FOX PAY purple mark + 'Pay' on transparent/white), FOX PAY Logo (purple fox-ears mark + 'Pay' wordmark, PNG), FOX PAY Logo (dark-navy #1D3661 'Pay' wordmark + purple #655DC6 fox-ears speech-bubble mark, SVG), FOX PAY Logo SVG (color, icons copy), FOX PAY Logo White variant (all-white mark + wordmark, PNG), FOX PAY Logo White variant (all fill=white mark + 'Pay' wordmark, SVG) (+1 more)

### Community 20 - "세션·유저 식별"
Cohesion: 0.52
Nodes (6): getUserId(), __LOC_PROBE_NAMES, __probeLocations(), __recordSession(), resolveUserId(), __safeJson()

### Community 22 - "WebView 유틸·엔트리"
Cohesion: 0.50
Nodes (4): copyText (clipboard util with WebView fallback), execCommand copy fallback for legacy/non-https WebView, index.html (Vite entry, FOX PAY), WebView viewport/theme-color meta tuning

### Community 23 - "비교 카드(친구/학교/조르기)"
Cohesion: 0.50
Nodes (4): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare)

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): AreaTemplate (generic area), BarTemplate (generic bar), ReportPlanRenderer (generic fallback renderer)

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): INTENT_CONFIG (intent presentation config), Front decides viz, not response, chartTypeForIntent registry

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (3): aegis-dev000 위임 원칙, agent-task-lock 파일 락, edupay-app 개발작업 라우팅 규칙

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Ambiguous Edges - Review These
- `InlineCard (non-data UI card router)` → `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  MOCK_API_설계.md · relation: conceptually_related_to
- `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` → `index.html (Vite 엔트리 · Pretendard · viewport-fit)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **121 isolated node(s):** `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)`, `client.api — backend skeleton (10 queries)`, `BarChartCard` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `InlineCard (non-data UI card router)` and `SQL 칩 노출 + 결과(result) 투명화`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` and `index.html (Vite 엔트리 · Pretendard · viewport-fit)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `runSql()` connect `operia 데이터소스 실행` to `패키지·의존성`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `isOperiaAiMode()` connect `operia 데이터소스 실행` to `앱 셸·채팅 오케스트레이션`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `alasql` connect `패키지·의존성` to `operia 데이터소스 실행`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `num()` (e.g. with `CompoundCalc()` and `GoalInput()`) actually correct?**
  _`num()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `QUERIES (10 intent SQL + shaper registry)` (e.g. with `TrendTemplate (generic trend chart)` and `TxListTemplate (generic stacked-bar + tx list)`) actually correct?**
  _`QUERIES (10 intent SQL + shaper registry)` has 4 INFERRED edges - model-reasoned connections that need verification._