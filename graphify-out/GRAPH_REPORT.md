# Graph Report - .  (2026-07-01)

## Corpus Check
- 80 files · ~69,887 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 466 nodes · 690 edges · 60 communities (28 shown, 32 thin omitted)
- Extraction: 89% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 72 edges (avg confidence: 0.81)
- Token cost: 66,500 input · 7,400 output

## Community Hubs (Navigation)
- [[_COMMUNITY_차트 공용 유틸·셸|차트 공용 유틸·셸]]
- [[_COMMUNITY_메인 앱 & 세션|메인 앱 & 세션]]
- [[_COMMUNITY_오페리아 쿼리·SQL 셰이퍼|오페리아 쿼리·SQL 셰이퍼]]
- [[_COMMUNITY_차트 템플릿 레지스트리|차트 템플릿 레지스트리]]
- [[_COMMUNITY_데이터소스 목업·계약|데이터소스 목업·계약]]
- [[_COMMUNITY_쿼리·코드라벨|쿼리·코드라벨]]
- [[_COMMUNITY_데이터창구 설계·카드|데이터창구 설계·카드]]
- [[_COMMUNITY_차트 렌더러·형상화|차트 렌더러·형상화]]
- [[_COMMUNITY_패키지·의존성|패키지·의존성]]
- [[_COMMUNITY_개발 워크플로·에이전트 문서|개발 워크플로·에이전트 문서]]
- [[_COMMUNITY_채팅 전송 오케스트레이션|채팅 전송 오케스트레이션]]
- [[_COMMUNITY_데이터소스 채널 어댑터|데이터소스 채널 어댑터]]
- [[_COMMUNITY_오페리아 NL2SQL 엔진|오페리아 NL2SQL 엔진]]
- [[_COMMUNITY_인라인 카드 UI|인라인 카드 UI]]
- [[_COMMUNITY_리포트 플랜 렌더러|리포트 플랜 렌더러]]
- [[_COMMUNITY_비교 차트(친구·학교)|비교 차트(친구·학교)]]
- [[_COMMUNITY_클립보드·WebView 진입|클립보드·WebView 진입]]
- [[_COMMUNITY_도넛 차트(분류·채널)|도넛 차트(분류·채널)]]
- [[_COMMUNITY_범용 폴백 렌더러|범용 폴백 렌더러]]
- [[_COMMUNITY_차트 유형 레지스트리|차트 유형 레지스트리]]
- [[_COMMUNITY_Claude 권한 설정|Claude 권한 설정]]
- [[_COMMUNITY_추천·퀴즈 모달|추천·퀴즈 모달]]
- [[_COMMUNITY_가맹점별 바리스트|가맹점별 바리스트]]
- [[_COMMUNITY_잔액 게이지|잔액 게이지]]
- [[_COMMUNITY_부모카드 리스트|부모카드 리스트]]
- [[_COMMUNITY_코드→라벨 사전|코드→라벨 사전]]
- [[_COMMUNITY_월별 사용 바차트|월별 사용 바차트]]
- [[_COMMUNITY_전환계획·README|전환계획·README]]
- [[_COMMUNITY_스타일 빌드 설정|스타일 빌드 설정]]
- [[_COMMUNITY_지도 카드·가맹점|지도 카드·가맹점]]
- [[_COMMUNITY_결제로그 DB 스키마|결제로그 DB 스키마]]
- [[_COMMUNITY_개발 서버 설정|개발 서버 설정]]
- [[_COMMUNITY_일별·기간 리포트 카드|일별·기간 리포트 카드]]
- [[_COMMUNITY_Anthropic 저수준 호출|Anthropic 저수준 호출]]
- [[_COMMUNITY_백엔드 클라이언트 스켈레톤|백엔드 클라이언트 스켈레톤]]
- [[_COMMUNITY_친구 비교 카드|친구 비교 카드]]
- [[_COMMUNITY_조르기 목록 카드|조르기 목록 카드]]
- [[_COMMUNITY_조르기 비교 카드|조르기 비교 카드]]
- [[_COMMUNITY_가맹점 지도 카드|가맹점 지도 카드]]
- [[_COMMUNITY_잔액 카드|잔액 카드]]
- [[_COMMUNITY_온·오프라인 카드|온·오프라인 카드]]
- [[_COMMUNITY_가맹점별 카드|가맹점별 카드]]
- [[_COMMUNITY_부모카드 카드|부모카드 카드]]
- [[_COMMUNITY_학교별 비교 카드|학교별 비교 카드]]
- [[_COMMUNITY_시간대 패턴 카드|시간대 패턴 카드]]
- [[_COMMUNITY_오페리아 우선 폴백|오페리아 우선 폴백]]
- [[_COMMUNITY_대화 기록 드로어|대화 기록 드로어]]
- [[_COMMUNITY_용돈기입장 카드|용돈기입장 카드]]
- [[_COMMUNITY_정적 목업 인덱스|정적 목업 인덱스]]
- [[_COMMUNITY_목업 지도 데이터|목업 지도 데이터]]
- [[_COMMUNITY_범용 표 카드|범용 표 카드]]
- [[_COMMUNITY_목업 매핑·intent|목업 매핑·intent]]
- [[_COMMUNITY_네트워크 에러 문구|네트워크 에러 문구]]

## God Nodes (most connected - your core abstractions)
1. `QUERIES (10 intent SQL + shaper registry)` - 25 edges
2. `num()` - 18 edges
3. `ChartShell()` - 14 edges
4. `TEMPLATES 레지스트리` - 13 edges
5. `InsightBox()` - 11 edges
6. `ChartShell / InsightBox / num (charts util)` - 9 edges
7. `INTENT_CONFIG (presentation config)` - 9 edges
8. `BarListTemplate` - 8 edges
9. `DATASOURCE_설계.md (데이터 창구 추상화)` - 8 edges
10. `제네릭 (data, config) 템플릿 계약` - 7 edges

## Surprising Connections (you probably didn't know these)
- `DEV MOCK replacement-point pattern` --conceptually_related_to--> `QUERIES (10 intent SQL + shaper registry)`  [INFERRED]
  WORKFLOW.md → src/mock/operia/queries.js
- `BarListTemplate` --rationale_for--> `질의↔템플릿 N:1 + config 단일 편집 지점`  [INFERRED]
  src/charts/templates/barlist.jsx → TEMPLATE_설계.md
- `TableTemplate (폴백 표)` --conceptually_related_to--> `reportPlan = 폴백 렌더 경로`  [INFERRED]
  src/charts/templates/table.jsx → DATASOURCE_설계.md
- `제네릭 (data, config) 템플릿 계약` --conceptually_related_to--> `shapeForIntent(intent, tableData, columnMetadata)`  [INFERRED]
  src/charts/templates/index.js → DATASOURCE_설계.md
- `InlineCard (non-data UI card router)` --conceptually_related_to--> `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  src/components/cards.jsx → MOCK_API_설계.md

## Hyperedges (group relationships)
- **Generic chart template family driven by INTENT_CONFIG** — intentConfig_INTENT_CONFIG, bar_BarTemplate, barlist_BarListTemplate, compare_CompareTemplate, list_ListTemplate [INFERRED 0.75]
- **ChartShell + InsightBox shared card UI across templates** — util_ChartShell, util_InsightBox, bar_BarTemplate, barlist_BarListTemplate, MapChartCard_component [INFERRED 0.75]
- **Datasource query flow: userId + companyId context -> SSE -> Bubble render** — App_queryDataSource, session_getUserId, App_sanitizeAnswer, App_Bubble [INFERRED 0.75]
- **Operia intent SQL/shape to chart-template render** — queries_QUERIES, trend_TrendTemplate, txList_TxListTemplate, queries_codeLabels [INFERRED 0.75]
- **aegis-dev000 governance: agent, specialist standards, review, safety** — agent_aegisdev000, specialist_doc, aegisreport_review, agent_safetyGate [EXTRACTED 0.75]
- **WebView compatibility: viewport meta, clipboard fallback, deploy target** — indexhtml_webviewMeta, clipboard_execCommandFallback, serverinfo_creds [INFERRED 0.65]

## Communities (60 total, 32 thin omitted)

### Community 0 - "차트 공용 유틸·셸"
Cohesion: 0.09
Nodes (31): INTENT_CONFIG, templateFor(), CHEONGJU, distM(), MapChartCard(), chartTypeForIntent(), INTENT_CHART, CAT_EMOJI (+23 more)

### Community 1 - "메인 앱 & 세션"
Cohesion: 0.09
Nodes (31): getUserId(), __LOC_PROBE_NAMES, __probeLocations(), __recordSession(), resolveUserId(), __safeJson(), AIOrb(), App() (+23 more)

### Community 2 - "오페리아 쿼리·SQL 셰이퍼"
Cohesion: 0.08
Nodes (38): CHANNEL_CANON (channel normalization), labelOfCode (codeLabels — code→Korean label), NOT_FUTURE SQL cutoff (PAY_DT <= today), QUERIES (10 intent SQL + shaper registry), balance intent (statList: 3-item, no sum), catSpend intent (donut: slices+total), channel intent (txList: groups+rows), codeLabels (labelOfCode/canonChannel) (+30 more)

### Community 3 - "차트 템플릿 레지스트리"
Cohesion: 0.11
Nodes (33): Typing (intent-based loading pool), MapChartCard (Kakao map + fallback), loadKakao (SDK dynamic load), BarTemplate, BarListTemplate, CompareTemplate, DonutTemplate (비중 도넛), TEMPLATES 레지스트리 (+25 more)

### Community 4 - "데이터소스 목업·계약"
Cohesion: 0.11
Nodes (14): backendSource, EVT, makeDataEvent(), makeResultEvent(), STATUS, getDataSource(), warnFallback(), mockSource (+6 more)

### Community 5 - "쿼리·코드라벨"
Cohesion: 0.18
Nodes (21): canonChannel(), CHANNEL_CANON, CODE_LABELS, hasKorean(), labelFor(), labelOfCode(), digits(), dLabel() (+13 more)

### Community 6 - "데이터창구 설계·카드"
Cohesion: 0.09
Nodes (25): BarCard (spend report bar, operia result-first), CardShell (inline data card wrapper), DonutCard (category donut, EDUPAY model), EDUPAY 데이터 모델 (레거시 폴백), InlineCard (non-data UI card router), Single-path data-card render via ChartRenderer, dataset.json (alasql 4+2 테이블 fixture), DATASOURCE_설계.md (데이터 창구 추상화) (+17 more)

### Community 7 - "차트 렌더러·형상화"
Cohesion: 0.14
Nodes (18): ChartRenderer(), isRows(), jsonPre(), prettyJson(), RawRowsView(), reportTabConfig(), ReportToggleCard(), ResultView() (+10 more)

### Community 8 - "패키지·의존성"
Cohesion: 0.09
Nodes (21): dependencies, alasql, prop-types, react, react-dom, recharts, description, devDependencies (+13 more)

### Community 9 - "개발 워크플로·에이전트 문서"
Cohesion: 0.12
Nodes (21): Frontend API key exposure (claude.js), App.jsx 1197-line monolith (sequential-only), .env.production git-tracked risk, aegis-dev000 review report (edupay-app), aegis-dev000 agent definition, SAFETY gate (C-grade no-autonomy), Foxedu server/DB/VPN credentials + deploy commands, S4 parallel-conflict / concentrated-file sequencing (+13 more)

### Community 10 - "채팅 전송 오케스트레이션"
Cohesion: 0.12
Nodes (20): Bubble (chat message renderer), COMPANY_ID (datasource context), WEBVIEW embed mode detection, cardIntent (질문→카드 결정), cardQuery (카드 내부 lazy 질의), fallback (로컬 응답), periodScope (기간 파싱), Phase A result->render bridge (+12 more)

### Community 11 - "데이터소스 채널 어댑터"
Cohesion: 0.16
Nodes (19): backendSource adapter, computeSummaryStats (client-side stats), consumeEventStream (SSE parser), Data Source SSE contract (data/result events), getDataSource (channel factory), mockSource adapter, operiaSource adapter, 3-channel single-contract architecture (+11 more)

### Community 12 - "오페리아 NL2SQL 엔진"
Cohesion: 0.21
Nodes (14): ensureTables(), extractAliases(), knownPrompt(), parseSingleSql(), queryOperia(), runClaudeSql(), runKnown(), runKnownClaude() (+6 more)

### Community 13 - "인라인 카드 UI"
Cohesion: 0.14
Nodes (5): InlineCard(), REPORT_INSIGHT, CATSPEND_COLORS, CATSPEND_MATCH, RecordedCard()

### Community 14 - "리포트 플랜 렌더러"
Cohesion: 0.24
Nodes (10): dayLabel(), monthLabel(), aggBy(), ChartSection(), CODE_LABEL, fmtLabel(), KpiCards(), KpiGrid() (+2 more)

### Community 15 - "비교 차트(친구·학교)"
Cohesion: 0.50
Nodes (4): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare)

### Community 16 - "클립보드·WebView 진입"
Cohesion: 0.50
Nodes (4): copyText (clipboard util with WebView fallback), execCommand copy fallback for legacy/non-https WebView, index.html (Vite entry, FOX PAY), WebView viewport/theme-color meta tuning

### Community 17 - "도넛 차트(분류·채널)"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 18 - "범용 폴백 렌더러"
Cohesion: 0.67
Nodes (3): AreaTemplate (generic area), BarTemplate (generic bar), ReportPlanRenderer (generic fallback renderer)

### Community 19 - "차트 유형 레지스트리"
Cohesion: 0.67
Nodes (3): INTENT_CONFIG (intent presentation config), Front decides viz, not response, chartTypeForIntent registry

### Community 21 - "추천·퀴즈 모달"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Ambiguous Edges - Review These
- `InlineCard (non-data UI card router)` → `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  MOCK_API_설계.md · relation: conceptually_related_to
- `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` → `index.html (Vite 엔트리 · Pretendard · viewport-fit)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **115 isolated node(s):** `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)`, `client.api — backend skeleton (10 queries)`, `BarChartCard` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `InlineCard (non-data UI card router)` and `SQL 칩 노출 + 결과(result) 투명화`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` and `index.html (Vite 엔트리 · Pretendard · viewport-fit)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `QUERIES (10 intent SQL + shaper registry)` connect `오페리아 쿼리·SQL 셰이퍼` to `개발 워크플로·에이전트 문서`, `차트 템플릿 레지스트리`, `데이터창구 설계·카드`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `MapChartCard (Kakao map + fallback)` connect `차트 템플릿 레지스트리` to `채팅 전송 오케스트레이션`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `GPS >30km fallback to Cheongju policy` connect `채팅 전송 오케스트레이션` to `차트 템플릿 레지스트리`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `QUERIES (10 intent SQL + shaper registry)` (e.g. with `TrendTemplate (generic trend chart)` and `TxListTemplate (generic stacked-bar + tx list)`) actually correct?**
  _`QUERIES (10 intent SQL + shaper registry)` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._