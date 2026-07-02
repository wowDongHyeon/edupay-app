# Graph Report - .  (2026-07-02)

## Corpus Check
- 0 files · ~99,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 479 nodes · 709 edges · 62 communities (30 shown, 32 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Kakao Map & Loading|Kakao Map & Loading]]
- [[_COMMUNITY_Nearby Merchant Map|Nearby Merchant Map]]
- [[_COMMUNITY_Intent SQL & Shapers|Intent SQL & Shapers]]
- [[_COMMUNITY_User ID Resolution|User ID Resolution]]
- [[_COMMUNITY_SSE Event Stream|SSE Event Stream]]
- [[_COMMUNITY_Channel & Code Labels|Channel & Code Labels]]
- [[_COMMUNITY_Chart Renderer|Chart Renderer]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Security Review Findings|Security Review Findings]]
- [[_COMMUNITY_Chat & Card Routing|Chat & Card Routing]]
- [[_COMMUNITY_Data Source Adapters|Data Source Adapters]]
- [[_COMMUNITY_Operia SQL Engine (alasql)|Operia SQL Engine (alasql)]]
- [[_COMMUNITY_Data Card Components|Data Card Components]]
- [[_COMMUNITY_Balance Golden SQL (0702)|Balance Golden SQL (0702)]]
- [[_COMMUNITY_Aggregation & KPI|Aggregation & KPI]]
- [[_COMMUNITY_Operia Result Cards|Operia Result Cards]]
- [[_COMMUNITY_Intent Chart Config|Intent Chart Config]]
- [[_COMMUNITY_Compare Cards|Compare Cards]]
- [[_COMMUNITY_WebView Utilities|WebView Utilities]]
- [[_COMMUNITY_Donut Charts|Donut Charts]]
- [[_COMMUNITY_Generic Templates|Generic Templates]]
- [[_COMMUNITY_Front Viz Decision|Front Viz Decision]]
- [[_COMMUNITY_Claude Permissions|Claude Permissions]]
- [[_COMMUNITY_Finance Education Cards|Finance Education Cards]]
- [[_COMMUNITY_Merchant Breakdown Cards|Merchant Breakdown Cards]]
- [[_COMMUNITY_List Cards|List Cards]]
- [[_COMMUNITY_Merchant Map Data|Merchant Map Data]]
- [[_COMMUNITY_Code Label Dictionary|Code Label Dictionary]]
- [[_COMMUNITY_Gauge  Balance|Gauge / Balance]]
- [[_COMMUNITY_Monthly Usage Bar|Monthly Usage Bar]]
- [[_COMMUNITY_Conversion Plan & README|Conversion Plan & README]]
- [[_COMMUNITY_DB Schema|DB Schema]]
- [[_COMMUNITY_Dev Config|Dev Config]]
- [[_COMMUNITY_Period Report Cards|Period Report Cards]]
- [[_COMMUNITY_Styling Config|Styling Config]]
- [[_COMMUNITY_Anthropic Client|Anthropic Client]]
- [[_COMMUNITY_Backend API Skeleton|Backend API Skeleton]]
- [[_COMMUNITY_Friend Compare Card|Friend Compare Card]]
- [[_COMMUNITY_Nudge List Card|Nudge List Card]]
- [[_COMMUNITY_Nudge Compare Card|Nudge Compare Card]]
- [[_COMMUNITY_Leaflet Map Card|Leaflet Map Card]]
- [[_COMMUNITY_Balance Card|Balance Card]]
- [[_COMMUNITY_Channel Card|Channel Card]]
- [[_COMMUNITY_Merchant Breakdown Card|Merchant Breakdown Card]]
- [[_COMMUNITY_Parent Card|Parent Card]]
- [[_COMMUNITY_School Compare Card|School Compare Card]]
- [[_COMMUNITY_Time Pattern Card|Time Pattern Card]]
- [[_COMMUNITY_OperiaEDUPAY Fallback|Operia/EDUPAY Fallback]]
- [[_COMMUNITY_History Drawer|History Drawer]]
- [[_COMMUNITY_Ledger Card (OCR)|Ledger Card (OCR)]]
- [[_COMMUNITY_Mock Operia Index|Mock Operia Index]]
- [[_COMMUNITY_Mock Merchant Map|Mock Merchant Map]]
- [[_COMMUNITY_Table Card|Table Card]]
- [[_COMMUNITY_Mock Operia Kinds|Mock Operia Kinds]]
- [[_COMMUNITY_Network Error Copy|Network Error Copy]]

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
- `InlineCard (non-data UI card router)` --conceptually_related_to--> `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  src/components/cards.jsx → MOCK_API_설계.md
- `QUERIES (10 intent SQL + shaper registry)` --conceptually_related_to--> `DEV MOCK replacement-point pattern`  [INFERRED]
  src/mock/operia/queries.js → WORKFLOW.md
- `BarListTemplate` --rationale_for--> `질의↔템플릿 N:1 + config 단일 편집 지점`  [INFERRED]
  src/charts/templates/barlist.jsx → TEMPLATE_설계.md
- `QUERIES (10 intent SQL + shaper registry)` --references--> `Milestone: Operia sim mode option B (front alasql on dataset.json)`  [EXTRACTED]
  src/mock/operia/queries.js → WORKFLOW.md
- `alasql` --calls--> `runSql()`  [INFERRED]
  package.json → src/api/operia.js

## Hyperedges (group relationships)
- **잔액 3항목 분해 (바우처·용돈·에듀포인트)** — golden0702_three_row_format, golden0702_voucher_balance, golden0702_allowance_balance, golden0702_edupoint [EXTRACTED 1.00]
- **디폴트 FAQ 칩 골든 SQL 4종** — golden0702_q1_balance, golden0702_q_monthly, golden0702_q_nearby, golden0702_q_by_merchant [EXTRACTED 1.00]

## Communities (62 total, 32 thin omitted)

### Community 0 - "Kakao Map & Loading"
Cohesion: 0.07
Nodes (49): Typing (intent-based loading pool), MapChartCard (Kakao map + fallback), loadKakao (SDK dynamic load), BarTemplate, BarListTemplate, CompareTemplate, dataset.json (alasql 4+2 테이블 fixture), DonutTemplate (비중 도넛) (+41 more)

### Community 1 - "Nearby Merchant Map"
Cohesion: 0.10
Nodes (30): CHEONGJU, distM(), MapChartCard(), CAT_EMOJI, ChartShell(), dayLabel(), DONUT_COLORS, InsightBox() (+22 more)

### Community 2 - "Intent SQL & Shapers"
Cohesion: 0.08
Nodes (38): CHANNEL_CANON (channel normalization), labelOfCode (codeLabels — code→Korean label), NOT_FUTURE SQL cutoff (PAY_DT <= today), QUERIES (10 intent SQL + shaper registry), balance intent (statList: 3-item, no sum), catSpend intent (donut: slices+total), channel intent (txList: groups+rows), codeLabels (labelOfCode/canonChannel) (+30 more)

### Community 3 - "User ID Resolution"
Cohesion: 0.09
Nodes (31): getUserId(), __LOC_PROBE_NAMES, __probeLocations(), __recordSession(), resolveUserId(), __safeJson(), AIOrb(), App() (+23 more)

### Community 4 - "SSE Event Stream"
Cohesion: 0.11
Nodes (14): backendSource, EVT, makeDataEvent(), makeResultEvent(), STATUS, getDataSource(), warnFallback(), mockSource (+6 more)

### Community 5 - "Channel & Code Labels"
Cohesion: 0.18
Nodes (21): canonChannel(), CHANNEL_CANON, CODE_LABELS, hasKorean(), labelFor(), labelOfCode(), digits(), dLabel() (+13 more)

### Community 6 - "Chart Renderer"
Cohesion: 0.14
Nodes (18): ChartRenderer(), isRows(), jsonPre(), prettyJson(), RawRowsView(), reportTabConfig(), ReportToggleCard(), ResultView() (+10 more)

### Community 7 - "Package Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, alasql, prop-types, react, react-dom, recharts, description, devDependencies (+13 more)

### Community 8 - "Security Review Findings"
Cohesion: 0.12
Nodes (21): Frontend API key exposure (claude.js), App.jsx 1197-line monolith (sequential-only), .env.production git-tracked risk, aegis-dev000 review report (edupay-app), aegis-dev000 agent definition, SAFETY gate (C-grade no-autonomy), Foxedu server/DB/VPN credentials + deploy commands, S4 parallel-conflict / concentrated-file sequencing (+13 more)

### Community 9 - "Chat & Card Routing"
Cohesion: 0.12
Nodes (20): Bubble (chat message renderer), COMPANY_ID (datasource context), WEBVIEW embed mode detection, cardIntent (질문→카드 결정), cardQuery (카드 내부 lazy 질의), fallback (로컬 응답), periodScope (기간 파싱), Phase A result->render bridge (+12 more)

### Community 10 - "Data Source Adapters"
Cohesion: 0.16
Nodes (19): backendSource adapter, computeSummaryStats (client-side stats), consumeEventStream (SSE parser), Data Source SSE contract (data/result events), getDataSource (channel factory), mockSource adapter, operiaSource adapter, 3-channel single-contract architecture (+11 more)

### Community 11 - "Operia SQL Engine (alasql)"
Cohesion: 0.21
Nodes (14): ensureTables(), extractAliases(), knownPrompt(), parseSingleSql(), queryOperia(), runClaudeSql(), runKnown(), runKnownClaude() (+6 more)

### Community 12 - "Data Card Components"
Cohesion: 0.14
Nodes (5): InlineCard(), REPORT_INSIGHT, CATSPEND_COLORS, CATSPEND_MATCH, RecordedCard()

### Community 13 - "Balance Golden SQL (0702)"
Cohesion: 0.24
Nodes (13): 용돈 충전금 산식 = ACCOUNT_BALANCE_AMT − 바우처(지원금), category_cd 프론트 한글/아이콘 매핑, 디폴트 FAQ 칩 4개 범위, 오페리아 골든 SQL 수정 전달 (2026-07-02), 에듀포인트 = CURRENT_POINT (단위 'P'), 질의 #1 — 현재 사용할 수 있는 금액, 질의 — 사용처별 내역 (MERCHANT_NM, SUM(DLNG_AMT)), 질의 — 월별 사용 내역 (DLNG_YM, SUM(DLNG_AMT)) (+5 more)

### Community 14 - "Aggregation & KPI"
Cohesion: 0.31
Nodes (7): aggBy(), ChartSection(), CODE_LABEL, KpiCards(), KpiGrid(), metaOf(), withPct()

### Community 15 - "Operia Result Cards"
Cohesion: 0.25
Nodes (9): BarCard (spend report bar, operia result-first), CardShell (inline data card wrapper), DonutCard (category donut, EDUPAY model), EDUPAY 데이터 모델 (레거시 폴백), InlineCard (non-data UI card router), Single-path data-card render via ChartRenderer, CategoryDonut (operia result donut), CategorySpendCard (+1 more)

### Community 16 - "Intent Chart Config"
Cohesion: 0.43
Nodes (4): INTENT_CONFIG, templateFor(), chartTypeForIntent(), INTENT_CHART

### Community 17 - "Compare Cards"
Cohesion: 0.50
Nodes (4): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare)

### Community 18 - "WebView Utilities"
Cohesion: 0.50
Nodes (4): copyText (clipboard util with WebView fallback), execCommand copy fallback for legacy/non-https WebView, index.html (Vite entry, FOX PAY), WebView viewport/theme-color meta tuning

### Community 19 - "Donut Charts"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 20 - "Generic Templates"
Cohesion: 0.67
Nodes (3): AreaTemplate (generic area), BarTemplate (generic bar), ReportPlanRenderer (generic fallback renderer)

### Community 21 - "Front Viz Decision"
Cohesion: 0.67
Nodes (3): INTENT_CONFIG (intent presentation config), Front decides viz, not response, chartTypeForIntent registry

### Community 23 - "Finance Education Cards"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Ambiguous Edges - Review These
- `InlineCard (non-data UI card router)` → `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  MOCK_API_설계.md · relation: conceptually_related_to
- `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` → `index.html (Vite 엔트리 · Pretendard · viewport-fit)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **116 isolated node(s):** `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)`, `client.api — backend skeleton (10 queries)`, `BarChartCard` (+111 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `InlineCard (non-data UI card router)` and `SQL 칩 노출 + 결과(result) 투명화`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` and `index.html (Vite 엔트리 · Pretendard · viewport-fit)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `QUERIES (10 intent SQL + shaper registry)` connect `Intent SQL & Shapers` to `Kakao Map & Loading`, `Security Review Findings`, `Operia Result Cards`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `MapChartCard (Kakao map + fallback)` connect `Kakao Map & Loading` to `Chat & Card Routing`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `GPS >30km fallback to Cheongju policy` connect `Chat & Card Routing` to `Kakao Map & Loading`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `QUERIES (10 intent SQL + shaper registry)` (e.g. with `TrendTemplate (generic trend chart)` and `TxListTemplate (generic stacked-bar + tx list)`) actually correct?**
  _`QUERIES (10 intent SQL + shaper registry)` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)` to the rest of the system?**
  _133 weakly-connected nodes found - possible documentation gaps or missing edges._