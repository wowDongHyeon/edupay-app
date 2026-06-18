# Graph Report - .  (2026-06-18)

## Corpus Check
- Corpus is ~37,893 words - fits in a single context window. You may not need a graph.

## Summary
- 91 nodes · 106 edges · 19 communities (10 shown, 9 thin omitted)
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.81)
- Token cost: 87,793 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_오페리아 옵션 B — alasql 실행 엔진|오페리아 옵션 B — alasql 실행 엔진]]
- [[_COMMUNITY_기존 인라인 카드 (레거시)|기존 인라인 카드 (레거시)]]
- [[_COMMUNITY_EDUPAY 데이터 모델 & DB 뷰|EDUPAY 데이터 모델 & DB 뷰]]
- [[_COMMUNITY_디스패치·렌더 & SQL 칩|디스패치·렌더 & SQL 칩]]
- [[_COMMUNITY_지도·막대 차트 & 셸|지도·막대 차트 & 셸]]
- [[_COMMUNITY_비교 차트 (compare)|비교 차트 (compare)]]
- [[_COMMUNITY_도넛 차트 (donut)|도넛 차트 (donut)]]
- [[_COMMUNITY_퀴즈 & 추천 콘텐츠|퀴즈 & 추천 콘텐츠]]
- [[_COMMUNITY_바리스트 차트 (barlist)|바리스트 차트 (barlist)]]
- [[_COMMUNITY_게이지 차트 (gauge)|게이지 차트 (gauge)]]
- [[_COMMUNITY_용돈기입장 & 헬퍼|용돈기입장 & 헬퍼]]
- [[_COMMUNITY_사용처별 카테고리 카드 (레거시)|사용처별 카테고리 카드 (레거시)]]
- [[_COMMUNITY_리스트 차트 (list)|리스트 차트 (list)]]
- [[_COMMUNITY_스타일 설정 (TailwindPostCSS)|스타일 설정 (Tailwind/PostCSS)]]
- [[_COMMUNITY_빌드 설정 (Vite)|빌드 설정 (Vite)]]
- [[_COMMUNITY_대화 기록 UI|대화 기록 UI]]
- [[_COMMUNITY_정적 목업 인덱스|정적 목업 인덱스]]

## God Nodes (most connected - your core abstractions)
1. `cards.InlineCard — card router` - 20 edges
2. `EDUPAY — central data model` - 19 edges
3. `queryOperia(intent,params,question)` - 9 edges
4. `EDUPAY data engine (fallback model)` - 8 edges
5. `runClaudeSql(question) — Claude 경량 NL→SQL → alasql → rows` - 8 edges
6. `QUERIES — intent별 {sqls, shape} (10개)` - 7 edges
7. `App.send — cardIntent → queryOperia → ChartRenderer(sql/question)` - 5 edges
8. `MOCK_API_설계 §8 — 옵션 B 확정(프론트 alasql 실행)` - 4 edges
9. `complete (저수준 Anthropic 호출)` - 3 edges
10. `CompareChartCard` - 3 edges

## Surprising Connections (you probably didn't know these)
- `WORKFLOW §8 마일스톤 — 옵션 B(alasql) 완료, 옵션 A 폐기` --rationale_for--> `queryOperia(intent,params,question)`  [INFERRED]
  WORKFLOW.md → src/api/operia.js
- `전환계획 (Vite+React conversion plan)` --references--> `EDUPAY data engine (fallback model)`  [EXTRACTED]
  전환계획.md → src/data/edupay.js
- `queryOperia(intent,params,question)` --implements--> `MOCK_API_설계 §8 — 옵션 B 확정(프론트 alasql 실행)`  [INFERRED]
  src/api/operia.js → MOCK_API_설계.md
- `MOCK_API_설계 §8 — 옵션 B 확정(프론트 alasql 실행)` --rationale_for--> `SQL_SYSTEM — alasql 호환 SELECT 1문장 system 프롬프트(데이터셋 미주입)`  [INFERRED]
  MOCK_API_설계.md → src/api/operia.js
- `QUERIES — intent별 {sqls, shape} (10개)` --implements--> `MOCK_API_설계 §8 — 옵션 B 확정(프론트 alasql 실행)`  [INFERRED]
  src/mock/operia/queries.js → MOCK_API_설계.md

## Hyperedges (group relationships)
- **Data cards prefer operia result, fall back to EDUPAY model** — extras_FriendCompareCard, extras_BalanceCard, extras_ChannelCard, extras_MerchantMapCard, extras_SchoolCompareCard, cards_BarCard, spendcards_CategorySpendCard [INFERRED 0.85]
- **옵션 B 알려진-intent 실행 흐름: App.send → queryOperia → runKnown → QUERIES → alasql/dataset → ChartRenderer** — app_send, operia_queryOperia, operia_runKnown, queries_QUERIES, operia_runSql, dataset_fixture, chartrenderer_ChartRenderer [INFERRED 0.85]
- **queryOperia 3-mode 우선순위 디스패치: 실서버(VITE_OPERIA_API) > alasql AI(runKnown/runClaudeSql) > 정적 목업** — operia_queryOperia, operia_isOperiaAiMode, operia_runKnown, operia_runClaudeSql, operiaindex_results [INFERRED 0.85]

## Communities (19 total, 9 thin omitted)

### Community 0 - "오페리아 옵션 B — alasql 실행 엔진"
Cohesion: 0.14
Nodes (20): complete (저수준 Anthropic 호출), client.api — backend skeleton (10 queries), dataset.json (DB 대역 fixture), main.jsx (React entry), MOCK_API_설계 §8 — 옵션 B 확정(프론트 alasql 실행), SQL_SYSTEM — alasql 호환 SELECT 1문장 system 프롬프트(데이터셋 미주입), ensureTables() — alasql 테이블 1회 등록(4테이블), queryOperia(intent,params,question) (+12 more)

### Community 1 - "기존 인라인 카드 (레거시)"
Cohesion: 0.20
Nodes (18): cards.BarCard — spending report bars, cards.DonutCard — category donut, cards.InlineCard — card router, Cards prefer operia result, fall back to EDUPAY model, EDUPAY — central data model, BalanceCard (남은 지원금), ChannelCard (온/오프라인), FriendCompareCard (+10 more)

### Community 2 - "EDUPAY 데이터 모델 & DB 뷰"
Cohesion: 0.22
Nodes (11): EDUPAY data engine (fallback model), EDUPAY USER (TB_COM_USER view), EDUPAY adbk (TB_COM_ADBK view), EDUPAY.classify (keyword→intent), EDUPAY ledgerSeed (deterministic mock ledger), EDUPAY payApiLogs (TB_COM_PAY_API_LOG view), EDUPAY schoolCompareByGrade model, EDUPAY vouchers (TB_COM_VOUCHER view) (+3 more)

### Community 3 - "디스패치·렌더 & SQL 칩"
Cohesion: 0.22
Nodes (9): Bubble — 채팅 말풍선, isChart면 ChartRenderer 렌더, cardIntent(q) — NL 질문 → intent kind 분류, App.send — cardIntent → queryOperia → ChartRenderer(sql/question), ChartRenderer — type별 차트 분기 + SqlChip, SqlChip — </> SQL 칩(hover/탭 팝오버), pickCard(type) — bar/donut/compare/gauge/.../default table, isOperiaAiMode() — 실서버 미설정 + AI on, chartTypeForIntent (intent → 차트유형) (+1 more)

### Community 4 - "지도·막대 차트 & 셸"
Cohesion: 0.40
Nodes (5): MapChartCard, BarChartCard, mock: merchantMap (map), mock: monthlyUsage (report→bar), ChartShell + util helpers (num/won/monthLabel/colors)

### Community 5 - "비교 차트 (compare)"
Cohesion: 0.50
Nodes (4): CompareChartCard, mock: friendCompare (compare), mock: nudgeCompare (compare), mock: schoolCompare (compare)

### Community 6 - "도넛 차트 (donut)"
Cohesion: 0.67
Nodes (3): DonutChartCard, mock: catSpend (donut), mock: channel (donut)

### Community 7 - "퀴즈 & 추천 콘텐츠"
Cohesion: 0.67
Nodes (3): QuizCard (맞춤 금융 퀴즈), RecommendCard (금융교육 추천 리스트), RecommendModal (계산기/퀴즈 모달)

## Knowledge Gaps
- **37 isolated node(s):** `PostCSS Config`, `Tailwind Config (violet palette)`, `Vite Config`, `main.jsx (React entry)`, `client.api — backend skeleton (10 queries)` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `queryOperia(intent,params,question)` connect `오페리아 옵션 B — alasql 실행 엔진` to `디스패치·렌더 & SQL 칩`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `runClaudeSql(question) — Claude 경량 NL→SQL → alasql → rows` connect `오페리아 옵션 B — alasql 실행 엔진` to `디스패치·렌더 & SQL 칩`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `cards.InlineCard — card router` connect `기존 인라인 카드 (레거시)` to `용돈기입장 & 헬퍼`, `사용처별 카테고리 카드 (레거시)`, `퀴즈 & 추천 콘텐츠`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `queryOperia(intent,params,question)` (e.g. with `client.api — backend skeleton (10 queries)` and `MOCK_API_설계 §8 — 옵션 B 확정(프론트 alasql 실행)`) actually correct?**
  _`queryOperia(intent,params,question)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `runClaudeSql(question) — Claude 경량 NL→SQL → alasql → rows` (e.g. with `SqlChip — </> SQL 칩(hover/탭 팝오버)` and `TableCard — 범용 표 렌더 + 빈결과 graceful('조회 결과가 없어요')`) actually correct?**
  _`runClaudeSql(question) — Claude 경량 NL→SQL → alasql → rows` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PostCSS Config`, `Tailwind Config (violet palette)`, `Vite Config` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `오페리아 옵션 B — alasql 실행 엔진` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._