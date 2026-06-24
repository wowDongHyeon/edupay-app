# Graph Report - .  (2026-06-24)

## Corpus Check
- 2 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 381 nodes · 536 edges · 55 communities (22 shown, 33 thin omitted)
- Extraction: 91% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.83)
- Token cost: 70,689 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_지도(카카오맵)·차트 유틸|지도(카카오맵)·차트 유틸]]
- [[_COMMUNITY_App·ChartRenderer·표 렌더|App·ChartRenderer·표 렌더]]
- [[_COMMUNITY_레거시 카드·데이터모델|레거시 카드·데이터모델]]
- [[_COMMUNITY_operia NL2SQL 엔진|operia NL2SQL 엔진]]
- [[_COMMUNITY_QUERIES 카탈로그·코드라벨·shape|QUERIES 카탈로그·코드라벨·shape]]
- [[_COMMUNITY_패키지 의존성|패키지 의존성]]
- [[_COMMUNITY_datasource 채널·SSE|datasource 채널·SSE]]
- [[_COMMUNITY_날짜·집계 헬퍼(queries)|날짜·집계 헬퍼(queries)]]
- [[_COMMUNITY_reportPlan 렌더·집계 유틸|reportPlan 렌더·집계 유틸]]
- [[_COMMUNITY_App 채팅·intent 분류|App 채팅·intent 분류]]
- [[_COMMUNITY_WORKFLOW 개발 규격|WORKFLOW 개발 규격]]
- [[_COMMUNITY_intentConfig·템플릿 레지스트리|intentConfig·템플릿 레지스트리]]
- [[_COMMUNITY_summaryStats·컬럼 추론|summaryStats·컬럼 추론]]
- [[_COMMUNITY_레거시 카드 셸|레거시 카드 셸]]
- [[_COMMUNITY_codeLabels(코드→한글)|codeLabels(코드→한글)]]
- [[_COMMUNITY_compare 카드 목업|compare 카드 목업]]
- [[_COMMUNITY_generic 차트 템플릿|generic 차트 템플릿]]
- [[_COMMUNITY_intent 표현 config|intent 표현 config]]
- [[_COMMUNITY_도넛 목업|도넛 목업]]
- [[_COMMUNITY_퀴즈·추천 카드|퀴즈·추천 카드]]
- [[_COMMUNITY_월별 리포트 목업|월별 리포트 목업]]
- [[_COMMUNITY_잔액 게이지 목업|잔액 게이지 목업]]
- [[_COMMUNITY_부모카드 목업|부모카드 목업]]
- [[_COMMUNITY_가맹점 지도 데이터|가맹점 지도 데이터]]
- [[_COMMUNITY_가맹점별 목업|가맹점별 목업]]
- [[_COMMUNITY_스타일 설정(Tailwind)|스타일 설정(Tailwind)]]
- [[_COMMUNITY_프로젝트 문서|프로젝트 문서]]
- [[_COMMUNITY_DB 스키마|DB 스키마]]
- [[_COMMUNITY_카테고리 소비 카드|카테고리 소비 카드]]
- [[_COMMUNITY_Anthropic 호출|Anthropic 호출]]
- [[_COMMUNITY_backend 스켈레톤(REST)|backend 스켈레톤(REST)]]
- [[_COMMUNITY_친구비교 카드(레거시)|친구비교 카드(레거시)]]
- [[_COMMUNITY_조르기목록 카드|조르기목록 카드]]
- [[_COMMUNITY_조르기비교 카드|조르기비교 카드]]
- [[_COMMUNITY_가맹점지도 카드(Leaflet 레거시)|가맹점지도 카드(Leaflet 레거시)]]
- [[_COMMUNITY_잔액 카드(레거시)|잔액 카드(레거시)]]
- [[_COMMUNITY_채널 카드(레거시)|채널 카드(레거시)]]
- [[_COMMUNITY_가맹점별 카드(레거시)|가맹점별 카드(레거시)]]
- [[_COMMUNITY_부모카드 카드(레거시)|부모카드 카드(레거시)]]
- [[_COMMUNITY_학교비교 카드(레거시)|학교비교 카드(레거시)]]
- [[_COMMUNITY_시간대 카드(레거시)|시간대 카드(레거시)]]
- [[_COMMUNITY_카드 폴백 규칙|카드 폴백 규칙]]
- [[_COMMUNITY_대화 기록|대화 기록]]
- [[_COMMUNITY_용돈기입장 카드|용돈기입장 카드]]
- [[_COMMUNITY_일별소비 카드|일별소비 카드]]
- [[_COMMUNITY_기록 카드|기록 카드]]
- [[_COMMUNITY_기간리포트 카드|기간리포트 카드]]
- [[_COMMUNITY_목업 인덱스|목업 인덱스]]
- [[_COMMUNITY_가맹점지도 목업|가맹점지도 목업]]
- [[_COMMUNITY_범용 표 카드|범용 표 카드]]
- [[_COMMUNITY_목업 매핑·OPERIA_KINDS|목업 매핑·OPERIA_KINDS]]

## God Nodes (most connected - your core abstractions)
1. `num()` - 18 edges
2. `QUERIES intent→{sql,shape} catalog` - 16 edges
3. `ChartShell()` - 14 edges
4. `TEMPLATES 레지스트리` - 13 edges
5. `InsightBox()` - 11 edges
6. `ChartShell / InsightBox / num (charts util)` - 9 edges
7. `DATASOURCE_설계.md (데이터 창구 추상화)` - 8 edges
8. `제네릭 (data, config) 템플릿 계약` - 7 edges
9. `report intent (bar: series+breakdown by means)` - 7 edges
10. `runSql()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `InlineCard (비데이터 UI 카드 디스패처)` --conceptually_related_to--> `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  src/components/cards.jsx → MOCK_API_설계.md
- `Milestone: Operia sim mode option B (front alasql on dataset.json)` --references--> `QUERIES intent→{sql,shape} catalog`  [EXTRACTED]
  WORKFLOW.md → src/mock/operia/queries.js
- `alasql` --calls--> `runSql()`  [INFERRED]
  package.json → src/api/operia.js
- `BarListTemplate (가로 바 리스트)` --rationale_for--> `질의↔템플릿 N:1 + config 단일 편집 지점`  [INFERRED]
  src/charts/templates/barlist.jsx → TEMPLATE_설계.md
- `TEMPLATES 레지스트리` --rationale_for--> `3계층 분리 (queries.js shaper / intentConfig / templates)`  [INFERRED]
  src/charts/templates/index.js → TEMPLATE_설계.md

## Hyperedges (group relationships)
- **10-intent QUERIES card catalog (intent→{sql,shape})** — queries_report, queries_reportDaily, queries_catSpend, queries_friendCompare, queries_nudgeCompare, queries_merchantMap, queries_balance, queries_channel, queries_merchantBreakdown, queries_parentCard, queries_schoolCompare [INFERRED 0.85]
- **balance.shape 3-form handlers (mock k/v, backend wide, vertical item/balance)** — queries_balance, workflow_balancePivotDecision, codeLabels_labelOfCode [INFERRED 0.75]
- **separator-agnostic date label helpers sharing digits()** — queries_digits, queries_mLabel, queries_dLabel, queries_toIsoDate, queries_separatorAgnosticParse [INFERRED 0.85]

## Communities (55 total, 33 thin omitted)

### Community 0 - "지도(카카오맵)·차트 유틸"
Cohesion: 0.11
Nodes (27): CHEONGJU, distM(), MapChartCard(), CAT_EMOJI, ChartShell(), DONUT_COLORS, InsightBox(), num() (+19 more)

### Community 1 - "App·ChartRenderer·표 렌더"
Cohesion: 0.06
Nodes (24): ChartRenderer(), isRows(), jsonPre(), prettyJson(), RawRowsView(), reportTabConfig(), ReportToggleCard(), ResultView() (+16 more)

### Community 2 - "레거시 카드·데이터모델"
Cohesion: 0.08
Nodes (41): BarListTemplate (가로 바 리스트), BarCard (레거시 소비 리포트), DonutCard (레거시 카테고리 도넛), EDUPAY 데이터 모델 (레거시 폴백), InlineCard (비데이터 UI 카드 디스패처), CompareTemplate (나 vs 평균 비교), dataset.json (alasql 4+2 테이블 fixture), DonutTemplate (비중 도넛) (+33 more)

### Community 3 - "operia NL2SQL 엔진"
Cohesion: 0.09
Nodes (26): ensureTables(), extractAliases(), knownPrompt(), parseSingleSql(), queryOperia(), runClaudeSql(), runKnown(), runKnownClaude() (+18 more)

### Community 4 - "QUERIES 카탈로그·코드라벨·shape"
Cohesion: 0.09
Nodes (33): CHANNEL_CANON (ON/OFF → ONLINE/OFFLINE), labelOfCode (codeLabels — code→Korean label), NOT_FUTURE SQL cutoff (PAY_DT <= today), QUERIES intent→{sql,shape} catalog, balance intent (statList: 3-item, no sum), catSpend intent (donut: slices+total), channel intent (txList: groups+rows), dLabel (YYYYMMDD → 'M/D' by digit position) (+25 more)

### Community 5 - "패키지 의존성"
Cohesion: 0.09
Nodes (21): dependencies, alasql, prop-types, react, react-dom, recharts, description, devDependencies (+13 more)

### Community 6 - "datasource 채널·SSE"
Cohesion: 0.16
Nodes (19): backendSource adapter, computeSummaryStats (client-side stats), consumeEventStream (SSE parser), Data Source SSE contract (data/result events), getDataSource (channel factory), mockSource adapter, operiaSource adapter, 3-channel single-contract architecture (+11 more)

### Community 7 - "날짜·집계 헬퍼(queries)"
Cohesion: 0.19
Nodes (9): digits(), dLabel(), last7Days(), mLabel(), pad2(), QUERIES, TODAY, toIsoDate() (+1 more)

### Community 8 - "reportPlan 렌더·집계 유틸"
Cohesion: 0.24
Nodes (10): dayLabel(), monthLabel(), aggBy(), ChartSection(), CODE_LABEL, fmtLabel(), KpiCards(), KpiGrid() (+2 more)

### Community 9 - "App 채팅·intent 분류"
Cohesion: 0.24
Nodes (11): Bubble (말풍선/카드 렌더), cardIntent (질문→카드 결정), cardQuery (카드 내부 lazy 질의), fallback (로컬 응답), periodScope (기간 파싱), queryDataSource (App), send (채팅 전송 오케스트레이터), ChartRenderer (데이터 카드 렌더 진입점) (+3 more)

### Community 10 - "WORKFLOW 개발 규격"
Cohesion: 0.36
Nodes (8): §4 CLI prompt template (first line graphify query), §7 DEV MOCK pattern (VITE_OPERIA_API switch point), WORKFLOW.md — edupay-app common dev spec, Harness③ graphify rule (query freely, update manual-only), §6 Playwright verification spec (localhost:5173, 10-query regression), Harness① Role separation (Cowork design vs CLI code), Milestone: Operia sim mode option B (front alasql on dataset.json), Harness② Standard dev loop (design→prompt→code→Playwright)

### Community 11 - "intentConfig·템플릿 레지스트리"
Cohesion: 0.43
Nodes (4): INTENT_CONFIG, templateFor(), chartTypeForIntent(), INTENT_CHART

### Community 14 - "codeLabels(코드→한글)"
Cohesion: 0.47
Nodes (5): CHANNEL_CANON, CODE_LABELS, hasKorean(), labelFor(), labelOfCode()

### Community 15 - "compare 카드 목업"
Cohesion: 0.50
Nodes (4): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare)

### Community 16 - "generic 차트 템플릿"
Cohesion: 0.67
Nodes (3): AreaTemplate (generic area), BarTemplate (generic bar), ReportPlanRenderer (generic fallback renderer)

### Community 17 - "intent 표현 config"
Cohesion: 0.67
Nodes (3): INTENT_CONFIG (intent presentation config), Front decides viz, not response, chartTypeForIntent registry

### Community 18 - "도넛 목업"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 19 - "퀴즈·추천 카드"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Ambiguous Edges - Review These
- `InlineCard (비데이터 UI 카드 디스패처)` → `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  MOCK_API_설계.md · relation: conceptually_related_to
- `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` → `index.html (Vite 엔트리 · Pretendard · viewport-fit)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **106 isolated node(s):** `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)`, `client.api — backend skeleton (10 queries)`, `BarChartCard` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `InlineCard (비데이터 UI 카드 디스패처)` and `SQL 칩 노출 + 결과(result) 투명화`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` and `index.html (Vite 엔트리 · Pretendard · viewport-fit)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `runSql()` connect `operia NL2SQL 엔진` to `패키지 의존성`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `alasql` connect `패키지 의존성` to `operia NL2SQL 엔진`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `지도(카카오맵)·차트 유틸` be split into smaller, more focused modules?**
  _Cohesion score 0.11400966183574879 - nodes in this community are weakly interconnected._
- **Should `App·ChartRenderer·표 렌더` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._