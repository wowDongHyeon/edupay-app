# Graph Report - .  (2026-06-18)

## Corpus Check
- Corpus is ~32,805 words - fits in a single context window. You may not need a graph.

## Summary
- 84 nodes · 117 edges · 18 communities (9 shown, 9 thin omitted)
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.8)
- Token cost: 80,641 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_데이터 모델·오페리아 계약 (EDUPAY스키마)|데이터 모델·오페리아 계약 (EDUPAY/스키마)]]
- [[_COMMUNITY_기존 인라인 카드 컴포넌트|기존 인라인 카드 컴포넌트]]
- [[_COMMUNITY_차트 렌더러 & 셸 (ChartRenderer)|차트 렌더러 & 셸 (ChartRenderer)]]
- [[_COMMUNITY_디스패치 & 차트 레지스트리|디스패치 & 차트 레지스트리]]
- [[_COMMUNITY_비교 차트 (compare)|비교 차트 (compare)]]
- [[_COMMUNITY_도넛 차트 (donut)|도넛 차트 (donut)]]
- [[_COMMUNITY_퀴즈 & 추천 콘텐츠|퀴즈 & 추천 콘텐츠]]
- [[_COMMUNITY_게이지 차트 (gauge)|게이지 차트 (gauge)]]
- [[_COMMUNITY_바리스트 차트 (barlist)|바리스트 차트 (barlist)]]
- [[_COMMUNITY_리스트 차트 (list)|리스트 차트 (list)]]
- [[_COMMUNITY_용돈기입장 & 헬퍼|용돈기입장 & 헬퍼]]
- [[_COMMUNITY_사용처별 카테고리 카드 (레거시)|사용처별 카테고리 카드 (레거시)]]
- [[_COMMUNITY_Claude 호출 & 진입점|Claude 호출 & 진입점]]
- [[_COMMUNITY_스타일 설정 (TailwindPostCSS)|스타일 설정 (Tailwind/PostCSS)]]
- [[_COMMUNITY_빌드 설정 (Vite패키지)|빌드 설정 (Vite/패키지)]]
- [[_COMMUNITY_대화 기록 UI|대화 기록 UI]]

## God Nodes (most connected - your core abstractions)
1. `cards.InlineCard — card router` - 20 edges
2. `EDUPAY — central data model` - 19 edges
3. `OPERIA_KINDS + results map` - 12 edges
4. `ChartRenderer` - 10 edges
5. `EDUPAY data engine (fallback model)` - 9 edges
6. `MOCK_API 설계서 (Operia connect spec)` - 5 edges
7. `queryOperia() operia client` - 5 edges
8. `App.send()` - 5 edges
9. `EDUPAY payApiLogs (TB_COM_PAY_API_LOG view)` - 4 edges
10. `INTENT_CHART map (intent→chartType)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `EDUPAY payApiLogs (TB_COM_PAY_API_LOG view)` --semantically_similar_to--> `TB_PAY_DTL (virtual normalized payment table)`  [INFERRED] [semantically similar]
  src/data/edupay.js → MOCK_API_설계.md
- `EDUPAY vouchers (TB_COM_VOUCHER view)` --semantically_similar_to--> `TB_COM_VOUCHER LAT/LNG coords (virtual)`  [INFERRED] [semantically similar]
  src/data/edupay.js → MOCK_API_설계.md
- `EDUPAY adbk (TB_COM_ADBK view)` --semantically_similar_to--> `TB_BEG (virtual nudge/조르기 table)`  [INFERRED] [semantically similar]
  src/data/edupay.js → MOCK_API_설계.md
- `WORKFLOW.md (dev-loop spec)` --rationale_for--> `queryOperia() operia client`  [INFERRED]
  WORKFLOW.md → src/api/operia.js
- `queryOperia(intent, params) API/mock switch` --conceptually_related_to--> `EDUPAY data engine (fallback model)`  [INFERRED]
  MOCK_API_설계.md → src/data/edupay.js

## Hyperedges (group relationships)
- **Data cards prefer operia result, fall back to EDUPAY model** — extras_FriendCompareCard, extras_BalanceCard, extras_ChannelCard, extras_MerchantMapCard, extras_SchoolCompareCard, cards_BarCard, spendcards_CategorySpendCard [INFERRED 0.85]
- **10 Operia mock data-query intents** — monthlyUsage_mock, catSpend_mock, friendCompare_mock, nudgeCompare_mock, merchantMap_mock, balance_mock, channel_mock, merchantBreakdown_mock, parentCard_mock, schoolCompare_mock [EXTRACTED 1.00]
- **{question, sql, result, chart} response contract** — mockapi_responseSchema, monthlyUsage_mock, catSpend_mock, balance_mock [INFERRED 0.85]
- **Virtual tables backing mock SQL** — mockapi_TB_PAY_DTL, mockapi_TB_BEG, mockapi_voucherCoords [EXTRACTED 1.00]
- **Chart component set dispatched by ChartRenderer** — cards_BarChartCard, cards_DonutChartCard, cards_CompareChartCard, cards_GaugeChartCard, cards_BarListChartCard, cards_ListChartCard, MapChartCard_MapChartCard, TableCard_TableCard [EXTRACTED 1.00]
- **registry→App.send→ChartRenderer→TableCard(default) dispatch flow** — registry_chartTypeForIntent, App_send, ChartRenderer_ChartRenderer, TableCard_TableCard [INFERRED 0.85]
- **10 operia mocks implement {question,sql,result} contract** — mock_monthlyUsage, mock_catSpend, mock_balance, mock_merchantMap, mock_friendCompare, mock_nudgeCompare, mock_schoolCompare, mock_channel, mock_merchantBreakdown, mock_parentCard [EXTRACTED 1.00]

## Communities (18 total, 9 thin omitted)

### Community 0 - "데이터 모델·오페리아 계약 (EDUPAY/스키마)"
Cohesion: 0.13
Nodes (20): EDUPAY data engine (fallback model), EDUPAY USER (TB_COM_USER view), EDUPAY adbk (TB_COM_ADBK view), EDUPAY.classify (keyword→intent), EDUPAY ledgerSeed (deterministic mock ledger), EDUPAY payApiLogs (TB_COM_PAY_API_LOG view), EDUPAY schoolCompareByGrade model, EDUPAY vouchers (TB_COM_VOUCHER view) (+12 more)

### Community 1 - "기존 인라인 카드 컴포넌트"
Cohesion: 0.20
Nodes (18): cards.BarCard — spending report bars, cards.DonutCard — category donut, cards.InlineCard — card router, Cards prefer operia result, fall back to EDUPAY model, EDUPAY — central data model, BalanceCard (남은 지원금), ChannelCard (온/오프라인), FriendCompareCard (+10 more)

### Community 2 - "차트 렌더러 & 셸 (ChartRenderer)"
Cohesion: 0.32
Nodes (8): Bubble (chat message renderer), ChartRenderer, MapChartCard, TableCard (default fallback), BarChartCard, mock: merchantMap (map), mock: monthlyUsage (report→bar), ChartShell + util helpers (num/won/monthLabel/colors)

### Community 3 - "디스패치 & 차트 레지스트리"
Cohesion: 0.43
Nodes (7): cardIntent() intent classifier, App.send(), WORKFLOW.md (dev-loop spec), client.api — backend skeleton (10 queries), queryOperia() operia client, INTENT_CHART map (intent→chartType), chartTypeForIntent()

### Community 4 - "비교 차트 (compare)"
Cohesion: 0.60
Nodes (5): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare), OPERIA_KINDS + results map

### Community 5 - "도넛 차트 (donut)"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 6 - "퀴즈 & 추천 콘텐츠"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Knowledge Gaps
- **15 isolated node(s):** `package.json (edupay-finfriend)`, `PostCSS Config`, `Tailwind Config (violet palette)`, `Vite Config`, `main.jsx (React entry)` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `OPERIA_KINDS + results map` connect `비교 차트 (compare)` to `차트 렌더러 & 셸 (ChartRenderer)`, `디스패치 & 차트 레지스트리`, `도넛 차트 (donut)`, `게이지 차트 (gauge)`, `바리스트 차트 (barlist)`, `리스트 차트 (list)`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `cards.InlineCard — card router` connect `기존 인라인 카드 컴포넌트` to `용돈기입장 & 헬퍼`, `사용처별 카테고리 카드 (레거시)`, `퀴즈 & 추천 콘텐츠`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `ChartRenderer` connect `차트 렌더러 & 셸 (ChartRenderer)` to `디스패치 & 차트 레지스트리`, `비교 차트 (compare)`, `도넛 차트 (donut)`, `게이지 차트 (gauge)`, `바리스트 차트 (barlist)`, `리스트 차트 (list)`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `package.json (edupay-finfriend)`, `PostCSS Config`, `Tailwind Config (violet palette)` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `데이터 모델·오페리아 계약 (EDUPAY/스키마)` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._