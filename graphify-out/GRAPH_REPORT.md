# Graph Report - .  (2026-06-23)

## Corpus Check
- 44 files · ~59,416 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 333 nodes · 502 edges · 48 communities (18 shown, 30 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.83)
- Token cost: 258,647 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_지도·차트 셸 유틸|지도·차트 셸 유틸]]
- [[_COMMUNITY_차트 템플릿·데이터창구 설계|차트 템플릿·데이터창구 설계]]
- [[_COMMUNITY_레거시 카드 컴포넌트|레거시 카드 컴포넌트]]
- [[_COMMUNITY_datasource 계약·backend 어댑터|datasource 계약·backend 어댑터]]
- [[_COMMUNITY_패키지 의존성|패키지 의존성]]
- [[_COMMUNITY_ChartRenderer·shapeForIntent|ChartRenderer·shapeForIntent]]
- [[_COMMUNITY_App SSE 소비·SSE 계약|App SSE 소비·SSE 계약]]
- [[_COMMUNITY_SqlChip·표 렌더 유틸|SqlChip·표 렌더 유틸]]
- [[_COMMUNITY_operia NL2SQL 엔진|operia NL2SQL 엔진]]
- [[_COMMUNITY_채팅 렌더·intent 분류|채팅 렌더·intent 분류]]
- [[_COMMUNITY_reportPlan 렌더·집계 유틸|reportPlan 렌더·집계 유틸]]
- [[_COMMUNITY_레거시 폴백 모델|레거시 폴백 모델]]
- [[_COMMUNITY_비교 카드 목업|비교 카드 목업]]
- [[_COMMUNITY_도넛 목업|도넛 목업]]
- [[_COMMUNITY_퀴즈·추천 카드|퀴즈·추천 카드]]
- [[_COMMUNITY_월별 리포트 목업|월별 리포트 목업]]
- [[_COMMUNITY_가맹점별 목업|가맹점별 목업]]
- [[_COMMUNITY_잔액 목업|잔액 목업]]
- [[_COMMUNITY_부모카드 목업|부모카드 목업]]
- [[_COMMUNITY_스타일 설정(Tailwind)|스타일 설정(Tailwind)]]
- [[_COMMUNITY_프로젝트 문서|프로젝트 문서]]
- [[_COMMUNITY_DB 스키마|DB 스키마]]
- [[_COMMUNITY_카테고리 소비 카드|카테고리 소비 카드]]
- [[_COMMUNITY_Anthropic 호출|Anthropic 호출]]
- [[_COMMUNITY_backend 스켈레톤(REST)|backend 스켈레톤(REST)]]
- [[_COMMUNITY_친구비교 카드(레거시)|친구비교 카드(레거시)]]
- [[_COMMUNITY_조르기목록 카드|조르기목록 카드]]
- [[_COMMUNITY_조르기비교 카드|조르기비교 카드]]
- [[_COMMUNITY_가맹점지도 카드(레거시)|가맹점지도 카드(레거시)]]
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
2. `ChartShell()` - 14 edges
3. `TEMPLATES 레지스트리` - 14 edges
4. `InsightBox()` - 11 edges
5. `ChartShell / InsightBox / num (charts util)` - 9 edges
6. `DATASOURCE_설계.md (데이터 창구 추상화)` - 9 edges
7. `QUERIES — 10 intent 고정 SQL + shaper` - 8 edges
8. `제네릭 (data, config) 템플릿 계약` - 7 edges
9. `MOCK_API_설계.md (오페리아 목업 연동)` - 7 edges
10. `runSql()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `SQL 칩 노출 + 결과(result) 투명화` --conceptually_related_to--> `InlineCard (비데이터 UI 카드 디스패처)`  [AMBIGUOUS]
  MOCK_API_설계.md → src/components/cards.jsx
- `Playwright 검증 규격 (모바일·스크린샷·10개 회귀)` --references--> `TEMPLATES 레지스트리`  [INFERRED]
  WORKFLOW.md → src/charts/templates/index.js
- `queries_nl2sql_10.reference.sql (정답 SQL 10종)` --conceptually_related_to--> `shapeForIntent(intent, tableData, columnMetadata)`  [INFERRED]
  src/mock/operia/queries_nl2sql_10.reference.sql → DATASOURCE_설계.md
- `runSql()` --calls--> `alasql`  [INFERRED]
  src/api/operia.js → package.json
- `질의↔템플릿 N:1 + config 단일 편집 지점` --rationale_for--> `BarListTemplate (가로 바 리스트)`  [INFERRED]
  TEMPLATE_설계.md → src/charts/templates/barlist.jsx

## Hyperedges (group relationships)
- **** — datasource_contract, datasource_mockSource, datasource_backendSource, datasource_operiaSource [EXTRACTED 1.00]
- **** — charts_ChartRenderer, charts_shapeForIntent, charts_INTENT_CONFIG, charts_ReportPlanRenderer [INFERRED 0.85]
- **3계층 카드 파이프라인: shaper → intentConfig → 제네릭 템플릿** —  [INFERRED 0.85]
- **데이터 창구 동형 계약: 3채널 + 프론트 카드결정 + shapeForIntent + reportPlan 폴백** —  [INFERRED 0.85]
- **10개 intent 데이터 흐름: 정답SQL ↔ 목업 alasql+fixture ↔ 카드 템플릿** —  [INFERRED 0.75]

## Communities (48 total, 30 thin omitted)

### Community 0 - "지도·차트 셸 유틸"
Cohesion: 0.11
Nodes (27): CHEONGJU, distM(), MapChartCard(), CAT_EMOJI, ChartShell(), DONUT_COLORS, InsightBox(), num() (+19 more)

### Community 1 - "차트 템플릿·데이터창구 설계"
Cohesion: 0.08
Nodes (44): BarListTemplate (가로 바 리스트), CompareTemplate (나 vs 평균 비교), dataset.json (alasql 4+2 테이블 fixture), DonutTemplate (비중 도넛), DATASOURCE_설계.md (데이터 창구 추상화), 프론트가 카드 결정 + tableData shaper (§0.2 재확정), getDataSource() 팩토리 (VITE_DATA_SOURCE 분기), reportPlan = 폴백 렌더 경로 (+36 more)

### Community 2 - "레거시 카드 컴포넌트"
Cohesion: 0.06
Nodes (10): InlineCard(), REPORT_INSIGHT, computeSummaryStats(), inferColumnMetadata(), GRADE_LABELS, GRADES, MenuIcons, QUICK_QUERIES (+2 more)

### Community 3 - "datasource 계약·backend 어댑터"
Cohesion: 0.15
Nodes (14): backendSource, EVT, makeDataEvent(), makeResultEvent(), STATUS, activeChannelName(), getDataSource(), warnFallback() (+6 more)

### Community 4 - "패키지 의존성"
Cohesion: 0.09
Nodes (21): dependencies, alasql, prop-types, react, react-dom, recharts, description, devDependencies (+13 more)

### Community 5 - "ChartRenderer·shapeForIntent"
Cohesion: 0.13
Nodes (13): ChartRenderer(), isValidShape(), normalizeColumns(), roleOf(), shapeForIntent(), SLOTS, dLabel(), last7Days() (+5 more)

### Community 6 - "App SSE 소비·SSE 계약"
Cohesion: 0.15
Nodes (20): queryDataSource (App SSE consumer), WebView embed mode (?view=webview / ?q=), backendSource adapter, computeSummaryStats (client-side stats), consumeEventStream (SSE parser), Data Source SSE contract (data/result events), getDataSource (channel factory), mockSource adapter (+12 more)

### Community 7 - "SqlChip·표 렌더 유틸"
Cohesion: 0.18
Nodes (13): isRows(), jsonPre(), prettyJson(), RawRowsView(), reportTabConfig(), ReportToggleCard(), ResultView(), SOURCE_META (+5 more)

### Community 8 - "operia NL2SQL 엔진"
Cohesion: 0.21
Nodes (15): ensureTables(), extractAliases(), isOperiaAiMode(), knownPrompt(), parseSingleSql(), queryOperia(), runClaudeSql(), runKnown() (+7 more)

### Community 9 - "채팅 렌더·intent 분류"
Cohesion: 0.16
Nodes (15): Bubble (chat message renderer), cardIntent (NL intent classifier), AreaTemplate (generic area), BarTemplate (generic bar), ChartRenderer (data message render entry), INTENT_CONFIG (intent presentation config), MapChartCard (Kakao map merchants), ReportPlanRenderer (generic fallback renderer) (+7 more)

### Community 10 - "reportPlan 렌더·집계 유틸"
Cohesion: 0.24
Nodes (11): dayLabel(), monthLabel(), aggBy(), ChartSection(), CODE_LABEL, fmtLabel(), KpiCards(), KpiGrid() (+3 more)

### Community 11 - "레거시 폴백 모델"
Cohesion: 0.50
Nodes (4): BarCard (레거시 소비 리포트), DonutCard (레거시 카테고리 도넛), EDUPAY 데이터 모델 (레거시 폴백), InlineCard (비데이터 UI 카드 디스패처)

### Community 12 - "비교 카드 목업"
Cohesion: 0.50
Nodes (4): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare)

### Community 13 - "도넛 목업"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 14 - "퀴즈·추천 카드"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Ambiguous Edges - Review These
- `InlineCard (비데이터 UI 카드 디스패처)` → `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  MOCK_API_설계.md · relation: conceptually_related_to
- `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` → `index.html (Vite 엔트리 · Pretendard · viewport-fit)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **91 isolated node(s):** `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)`, `client.api — backend skeleton (10 queries)`, `BarChartCard` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `InlineCard (비데이터 UI 카드 디스패처)` and `SQL 칩 노출 + 결과(result) 투명화`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` and `index.html (Vite 엔트리 · Pretendard · viewport-fit)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `runSql()` connect `operia NL2SQL 엔진` to `패키지 의존성`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `alasql` connect `패키지 의존성` to `operia NL2SQL 엔진`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TEMPLATES 레지스트리` (e.g. with `3계층 분리 (queries.js shaper / intentConfig / templates)` and `Playwright 검증 규격 (모바일·스크린샷·10개 회귀)`) actually correct?**
  _`TEMPLATES 레지스트리` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `지도·차트 셸 유틸` be split into smaller, more focused modules?**
  _Cohesion score 0.11400966183574879 - nodes in this community are weakly interconnected._