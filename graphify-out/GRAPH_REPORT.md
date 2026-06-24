# Graph Report - .  (2026-06-24)

## Corpus Check
- 70 files · ~60,932 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 358 nodes · 504 edges · 54 communities (19 shown, 35 thin omitted)
- Extraction: 90% EXTRACTED · 9% INFERRED · 1% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.85)
- Token cost: 110,626 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_차트 공용 유틸|차트 공용 유틸]]
- [[_COMMUNITY_App·ChartRenderer 진입|App·ChartRenderer 진입]]
- [[_COMMUNITY_차트 템플릿·레거시 카드|차트 템플릿·레거시 카드]]
- [[_COMMUNITY_operia NL2SQL 엔진|operia NL2SQL 엔진]]
- [[_COMMUNITY_채팅 렌더·intent·질의|채팅 렌더·intent·질의]]
- [[_COMMUNITY_패키지 의존성|패키지 의존성]]
- [[_COMMUNITY_코드→한글 라벨(codeLabels)|코드→한글 라벨(codeLabels)]]
- [[_COMMUNITY_데이터창구 채널·SSE|데이터창구 채널·SSE]]
- [[_COMMUNITY_카카오 지도 카드|카카오 지도 카드]]
- [[_COMMUNITY_요약통계·타입추론|요약통계·타입추론]]
- [[_COMMUNITY_intent 설정·템플릿 매핑|intent 설정·템플릿 매핑]]
- [[_COMMUNITY_레거시 카드 컴포넌트|레거시 카드 컴포넌트]]
- [[_COMMUNITY_비교 카드 목업|비교 카드 목업]]
- [[_COMMUNITY_도넛 목업|도넛 목업]]
- [[_COMMUNITY_제네릭 폴백 템플릿|제네릭 폴백 템플릿]]
- [[_COMMUNITY_프론트 카드결정 원칙|프론트 카드결정 원칙]]
- [[_COMMUNITY_퀴즈·추천 카드|퀴즈·추천 카드]]
- [[_COMMUNITY_월별 리포트 목업|월별 리포트 목업]]
- [[_COMMUNITY_가맹점별 목업|가맹점별 목업]]
- [[_COMMUNITY_잔액 목업|잔액 목업]]
- [[_COMMUNITY_부모카드 목업|부모카드 목업]]
- [[_COMMUNITY_스타일 설정(Tailwind)|스타일 설정(Tailwind)]]
- [[_COMMUNITY_프로젝트 문서|프로젝트 문서]]
- [[_COMMUNITY_DB 스키마|DB 스키마]]
- [[_COMMUNITY_가맹점 데이터·지도|가맹점 데이터·지도]]
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
- [[_COMMUNITY_graphify 규칙|graphify 규칙]]
- [[_COMMUNITY_역할 분리(Cowork↔CLI)|역할 분리(Cowork↔CLI)]]

## God Nodes (most connected - your core abstractions)
1. `num()` - 18 edges
2. `ChartShell()` - 14 edges
3. `TEMPLATES 레지스트리` - 13 edges
4. `InsightBox()` - 11 edges
5. `ChartShell / InsightBox / num (charts util)` - 9 edges
6. `DATASOURCE_설계.md (데이터 창구 추상화)` - 8 edges
7. `제네릭 (data, config) 템플릿 계약` - 7 edges
8. `shapeForIntent (tableData→카드 입력)` - 7 edges
9. `runSql()` - 6 edges
10. `runKnownClaude()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `InlineCard (비데이터 UI 카드 디스패처)` --conceptually_related_to--> `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  src/components/cards.jsx → MOCK_API_설계.md
- `shapeForIntent (tableData→카드 입력)` --implements--> `표준 tableData+columnMetadata 계약`  [INFERRED]
  src/charts/shapeForIntent.js → WORKFLOW.md
- `alasql` --calls--> `runSql()`  [INFERRED]
  package.json → src/api/operia.js
- `BarListTemplate (가로 바 리스트)` --rationale_for--> `질의↔템플릿 N:1 + config 단일 편집 지점`  [INFERRED]
  src/charts/templates/barlist.jsx → TEMPLATE_설계.md
- `TEMPLATES 레지스트리` --rationale_for--> `3계층 분리 (queries.js shaper / intentConfig / templates)`  [INFERRED]
  src/charts/templates/index.js → TEMPLATE_설계.md

## Hyperedges (group relationships)
- **데이터 질문 렌더 흐름 (질문→intent→shape→템플릿)** — App_cardIntent, App_queryDataSource, ChartRenderer_ChartRenderer, shapeForIntent_shapeForIntent, queries_QUERIES [INFERRED 0.85]
- **백엔드 코드값 한글 라벨 적응** — codeLabels_labelOfCode, queries_channel_shape, queries_balance_shape, shapeForIntent_roleOf [INFERRED 0.75]

## Communities (54 total, 35 thin omitted)

### Community 0 - "차트 공용 유틸"
Cohesion: 0.10
Nodes (32): ChartShell(), dayLabel(), DONUT_COLORS, InsightBox(), monthLabel(), num(), won(), aggBy() (+24 more)

### Community 1 - "App·ChartRenderer 진입"
Cohesion: 0.06
Nodes (25): ChartRenderer(), isRows(), jsonPre(), prettyJson(), RawRowsView(), reportTabConfig(), ReportToggleCard(), ResultView() (+17 more)

### Community 2 - "차트 템플릿·레거시 카드"
Cohesion: 0.08
Nodes (41): BarListTemplate (가로 바 리스트), BarCard (레거시 소비 리포트), DonutCard (레거시 카테고리 도넛), EDUPAY 데이터 모델 (레거시 폴백), InlineCard (비데이터 UI 카드 디스패처), CompareTemplate (나 vs 평균 비교), dataset.json (alasql 4+2 테이블 fixture), DonutTemplate (비중 도넛) (+33 more)

### Community 3 - "operia NL2SQL 엔진"
Cohesion: 0.09
Nodes (26): ensureTables(), extractAliases(), knownPrompt(), parseSingleSql(), queryOperia(), runClaudeSql(), runKnown(), runKnownClaude() (+18 more)

### Community 4 - "채팅 렌더·intent·질의"
Cohesion: 0.10
Nodes (27): Bubble (말풍선/카드 렌더), cardIntent (질문→카드 결정), cardQuery (카드 내부 lazy 질의), fallback (로컬 응답), periodScope (기간 파싱), queryDataSource (App), send (채팅 전송 오케스트레이터), ChartRenderer (데이터 카드 렌더 진입점) (+19 more)

### Community 5 - "패키지 의존성"
Cohesion: 0.09
Nodes (21): dependencies, alasql, prop-types, react, react-dom, recharts, description, devDependencies (+13 more)

### Community 6 - "코드→한글 라벨(codeLabels)"
Cohesion: 0.16
Nodes (14): CHANNEL_CANON, CODE_LABELS, hasKorean(), labelFor(), labelOfCode(), digits(), dLabel(), last7Days() (+6 more)

### Community 7 - "데이터창구 채널·SSE"
Cohesion: 0.16
Nodes (19): backendSource adapter, computeSummaryStats (client-side stats), consumeEventStream (SSE parser), Data Source SSE contract (data/result events), getDataSource (channel factory), mockSource adapter, operiaSource adapter, 3-channel single-contract architecture (+11 more)

### Community 8 - "카카오 지도 카드"
Cohesion: 0.32
Nodes (5): CHEONGJU, distM(), MapChartCard(), CAT_EMOJI, MapTemplate()

### Community 10 - "intent 설정·템플릿 매핑"
Cohesion: 0.43
Nodes (4): INTENT_CONFIG, templateFor(), chartTypeForIntent(), INTENT_CHART

### Community 12 - "비교 카드 목업"
Cohesion: 0.50
Nodes (4): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare)

### Community 13 - "도넛 목업"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 14 - "제네릭 폴백 템플릿"
Cohesion: 0.67
Nodes (3): AreaTemplate (generic area), BarTemplate (generic bar), ReportPlanRenderer (generic fallback renderer)

### Community 15 - "프론트 카드결정 원칙"
Cohesion: 0.67
Nodes (3): INTENT_CONFIG (intent presentation config), Front decides viz, not response, chartTypeForIntent registry

### Community 16 - "퀴즈·추천 카드"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Ambiguous Edges - Review These
- `InlineCard (비데이터 UI 카드 디스패처)` → `SQL 칩 노출 + 결과(result) 투명화`  [AMBIGUOUS]
  MOCK_API_설계.md · relation: conceptually_related_to
- `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` → `index.html (Vite 엔트리 · Pretendard · viewport-fit)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to
- `SqlChip (SQL 칩)` → `CHANNEL_CANON (채널 표준키)`  [AMBIGUOUS]
  src/charts/ChartRenderer.jsx · relation: conceptually_related_to

## Knowledge Gaps
- **103 isolated node(s):** `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)`, `client.api — backend skeleton (10 queries)`, `BarChartCard` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `InlineCard (비데이터 UI 카드 디스패처)` and `SQL 칩 노출 + 결과(result) 투명화`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `배포 보안 프로파일 (Claude off 빌드·키 번들 제외)` and `index.html (Vite 엔트리 · Pretendard · viewport-fit)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `SqlChip (SQL 칩)` and `CHANNEL_CANON (채널 표준키)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `runSql()` connect `operia NL2SQL 엔진` to `패키지 의존성`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `alasql` connect `패키지 의존성` to `operia NL2SQL 엔진`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `PostCSS Config`, `Tailwind Config (violet palette)`, `complete (저수준 Anthropic 호출)` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `차트 공용 유틸` be split into smaller, more focused modules?**
  _Cohesion score 0.09879336349924585 - nodes in this community are weakly interconnected._