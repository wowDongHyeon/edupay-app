# 데이터 창구(Data Source) 추상화 설계서

## 0. 결정 요약 (확정)
- **창구 3개를 config 한 곳에서 선택**한다: `operia`(1순위) / `backend`(임시 자체 백엔드) / `mock`(기존 목업).
- **3채널 IN/OUT 인터페이스를 동일**하게 한다. 기준 = 첨부 「오페리아에이전트 API 인터페이스 명세서 v1.0」.
- **전송 방식은 3채널 모두 SSE**(Server-Sent Events). 목업도 SSE 이벤트 흐름(data 청크 → result)을 동일하게 흉내 낸다.
- **렌더링은 하이브리드**: 서버(=각 채널)가 `result.reportPlan.sections[]`(데이터·섹션 힌트)와 `tableData`를 내려주고, **프론트가 "질문→템플릿" 매핑으로 최종 렌더 템플릿을 선택**한다. reportPlan으로 표현 가능한 건 그대로 따르고, 표준 타입으로 표현 못 하는 건(예: 지도) 질문 매핑으로 전용 템플릿을 고른다.
- **임시 백엔드는 스키마를 자체 보유**한다. 클라이언트는 `{ userInput, context }`만 보낸다(operia와 동일 IN). 백엔드 내부에서 질문+스키마 → Claude → SQL → DB 실행 → operia 포맷으로 스트리밍.
- **목업은 operia 응답 필드를 동일하게 생성**한다(reportPlan·columnMetadata·tableData 등). 단 `summaryStats`는 클라이언트 계산이므로 채널은 비워도 됨.

### 0.1 열린 항목 1차 확정
- **지도(merchantMap)**: reportPlan은 받되 **프론트가 질문 매핑으로 지도 템플릿 선택**(데이터는 tableData). 표준 `map` 타입 신설 불요.
- **AI SQL 칩**: `result.queryInfo.sql` 규약 추가 — backend/mock이 SQL을 거기 실어 칩 유지. operia는 주면 표시·없으면 숨김.
- **summaryStats**: **클라이언트가 tableData로 계산**(sum/avg/median/max/min/null/zero/groups). 채널은 보내도/비워도 무방.
- **operia 접속정보**: `VITE_OPERIA_API/_TOKEN/_COMPANY_ID`를 env 자리만 만들고 값은 추후 주입. 지금은 `backend`/`mock`으로 진행(구현 안 막힘).

> 한 줄 요약: **"operia 계약을 표준 어댑터 인터페이스로 삼아 3채널이 모두 같은 SSE 이벤트(data→result)를 낸다. 클라이언트는 채널을 모른 채, reportPlan 데이터 + 질문→템플릿 매핑으로 렌더한다."**

---

## 1. 목적 / 범위
- 목적: 데이터 질의 응답의 **공급원(창구)을 런타임/빌드 config로 교체**할 수 있게 하고, 어떤 창구든 **동일한 계약**으로 소비한다.
- 범위(IN): 데이터 질문 경로(현재 `queryOperia`)만. **자유대화(askAI, Claude 직접)는 이 설계 범위 밖**(별도 유지).
- 대상 파일(신규/변경):
  - `src/api/datasource/` (신규) — `index.js`(팩토리), `contract.js`(타입/계약), `sse.js`(SSE 파서), `operia.js`·`backend.js`·`mock.js`(3 어댑터)
  - `src/charts/reportPlan/` (신규) — `ReportPlanRenderer.jsx` + 섹션 컴포넌트
  - `src/App.jsx` — 데이터 질문 처리부를 신규 datasource 스트림 소비로 교체
  - `.env` — 창구 선택/접속 config 추가

---

## 2. 아키텍처 개요
```
질문(userInput)
   │
   ▼
getDataSource(config.source)         ← config가 어댑터 1개 선택
   │   (operia | backend | mock, 모두 동일 인터페이스)
   ▼
adapter.query({userInput, context}, {onData, onResult, onError})
   │   SSE 이벤트 스트림 (data 청크들 → result 1회)
   ▼
StreamState (청크 누적 → result 확정)
   │
   ▼
ReportPlanRenderer(result.reportPlan, tableData, columnMetadata, summaryStats)
   │   섹션 타입별 컴포넌트 렌더 (heading/kpi_cards/chart/table/kpi_grid/report/insight)
   ▼
화면
```
- 클라이언트는 **어느 창구인지 모른다**. 오직 계약(§4)만 안다.
- 차트/표 형태는 **서버가 reportPlan으로 지시**(서버주도). 프론트는 그대로 렌더만.

---

## 3. Config (창구 선택 + 접속 정보)
`.env` (Vite, 빌드시 인라인):

| 키 | 의미 | 예 |
|---|---|---|
| `VITE_DATA_SOURCE` | **활성 창구 선택** | `operia` \| `backend` \| `mock` |
| `VITE_OPERIA_API` | operia 베이스 URL | `https://operia.example.com` |
| `VITE_OPERIA_TOKEN` | operia Bearer 토큰 | `eyJ...` |
| `VITE_OPERIA_COMPANY_ID` | `context.companyId` | `OPERIA` |
| `VITE_BACKEND_API` | 임시 백엔드 베이스 URL | `https://localhost:8080` |
| `VITE_BACKEND_TOKEN` | (선택) 백엔드 인증 토큰 | `...` |

- 선택 규칙: `getDataSource()`가 `VITE_DATA_SOURCE` 값으로 어댑터를 반환. **미설정/오타 → `mock` 폴백**(화면 안 깨짐).
- 안전장치: `operia`/`backend` 선택인데 베이스 URL이 비면 콘솔 경고 후 `mock` 폴백(DEV) / 명시적 에러(prod) — 운영 결정은 §13.

---

## 4. 통합 인터페이스 (IN/OUT — operia 계약 채택)

### 4.1 어댑터 시그니처 (3채널 공통)
```ts
// 모든 어댑터가 구현하는 동일 인터페이스
interface DataSource {
  // SSE 이벤트를 콜백으로 흘려보낸다. operia/backend=실제 SSE, mock=로컬 시뮬.
  query(
    req: { userInput: string; context: { companyId: string } },
    handlers: {
      onData:   (e: DataEvent)   => void;  // 청크마다 (0..N회)
      onResult: (e: ResultEvent) => void;  // 워크플로우 완료 1회
      onError:  (err: { httpStatus?: number; code?: string; message: string }) => void;
    },
    signal?: AbortSignal
  ): Promise<void>;
}
```
- 비고: 콜백형으로 통일(스트리밍 UI에 자연스럽고, 어댑터별 transport 차이를 숨김). 내부적으로 async-iterator로 구현해도 무방.

### 4.2 요청(IN) — 명세서 §2
- `POST`, `Content-Type: application/json`, `Accept: text/event-stream`, `Authorization: Bearer <token>`
- 본문:
```json
{ "userInput": "이번 달 소비 알려줘", "context": { "companyId": "OPERIA" } }
```
- `userInput` 필수(≤500자), `context.companyId` 필수(≤50자, 데이터 격리·DB 라우팅).
- ※ 클라이언트는 **질문과 companyId만** 보낸다. (스키마·SQL은 서버 책임)

### 4.3 응답(OUT) — SSE 2종 이벤트 (명세서 §3)
**`data` 이벤트** (쿼리 실행 후, 청크 단위 0..N회):

| 필드 | 타입 | 설명 |
|---|---|---|
| `chunkIndex` | int | 청크 순번(0부터) |
| `isLast` | bool | 마지막 청크면 true |
| `tableData` | array<obj> | 결과 행. 키 = `columnMetadata.column` |
| `columnMetadata` | array<obj> | `{type, column, label}` (type: varchar/decimal/integer/date/datetime) |
| `totalCount` | int | 전체 행 수 |
| `summaryStats` | obj | 수치형 통계(§4.4) |

**`result` 이벤트** (워크플로우 완료 1회):

| 필드 | 타입 | 설명 |
|---|---|---|
| `workflowId` | uuid | 실행 식별자 |
| `threadId` | string | 대화 스레드(연속 질의 추적) |
| `sessionId` | uuid | 세션 |
| `status` | string | `COMPLETED`/`FAILED`/`PARTIAL` |
| `hilRequired`/`hilApproved` | bool | 사람개입 필요/승인 |
| `timestamp` | ISO8601 | 완료시각(UTC) |
| `answer` | string | 사용자에게 보일 자연어 답변 |
| `success` | bool | 성공 여부 |
| `errorMessage` | string\|null | 실패 시 메시지 |
| `columnMetadata` | array<obj> | §4.3 + `displayOrder` |
| `hasNext`/`totalCount` | bool/int | 페이징 |
| `queryInfo` | obj(opt) | AI 판단 메타(정렬기준 등) |
| `reportPlan` | obj | **UI 섹션 구성(§6)** |
| `summaryStats` | obj | §4.4 |
| `summary` | string | 에이전트 실행 로그(디버그/감사) |

### 4.4 summaryStats
`{ totalCount, columns[]{ sum,avg,median,max,min,nullCount,zeroCount }, groups[]{ groupByColumn, rows[]{label,value,pct} }, dateRanges[] }`
- `columns[].pct`는 소수1자리 % (명세서 주석).
- **계산 책임 = 클라이언트**(확정). 클라가 `tableData`+`columnMetadata`로 직접 계산한다. 채널이 `summaryStats`를 보내도(operia 등) **클라 계산값을 단일 기준으로 사용**(채널 값은 무시 또는 검증용). 따라서 backend/mock은 `summaryStats`를 비워도 된다.
- 클라 계산 위치: 공통 유틸 `computeSummaryStats(tableData, columnMetadata)` (수치형 컬럼만 통계, groupBy는 columnMetadata 기반 추정/옵션).

### 4.5 오류 (명세서 §4)
| HTTP | code | 처리 |
|---|---|---|
| 400 | INVALID_REQUEST | userInput/companyId 확인 |
| 401 | UNAUTHORIZED | 토큰 갱신 후 재요청 |
| 403 | FORBIDDEN | companyId 권한 |
| 422 | NL2SQL_FAILURE | 질의 재표현 권고 |
| 500 | INTERNAL_ERROR | result.success=false, errorMessage |
| 503 | SERVICE_UNAVAILABLE | 재시도 |
- SSE 스트림 중 오류 → `result.success=false` + `errorMessage`로 전달 → `onResult`에서 에러 처리.

---

## 5. 3 어댑터 설계 (동일 계약, 다른 구현)

### 5.1 `operia.js` (1순위)
- 실제 SSE 호출: `fetch(`${VITE_OPERIA_API}/{경로}`, { method:POST, headers:{Authorization, Accept:text/event-stream, Content-Type}, body })`.
- 응답 본문을 `sse.js`로 파싱 → `event: data`/`event: result` 구분 → `onData`/`onResult` 호출.
- 인증: `Bearer VITE_OPERIA_TOKEN`, `companyId = VITE_OPERIA_COMPANY_ID`.
- ※ 엔드포인트 경로는 명세서에 미기재 → 확정 필요(§13 열린 항목).

### 5.2 `backend.js` (임시 자체 백엔드)
- 클라이언트: operia와 **완전히 동일한 요청/소비**. `fetch(`${VITE_BACKEND_API}/...`)` SSE.
- 백엔드 내부 흐름(서버 구현, 동현님 담당):
  1. `{ userInput, context }` 수신.
  2. **백엔드가 보유한 DB 스키마 + 질문**을 파라미터로 Claude API 호출.
  3. Claude가 **단일 SELECT SQL** 응답.
  4. 백엔드가 그 SQL을 **직접 DB에 실행**.
  5. 실행 결과를 **operia 포맷(data 청크 → result 이벤트)으로 SSE 스트리밍**. reportPlan/summaryStats도 백엔드가 구성.
- 클라이언트는 위 과정을 모름(계약만 동일). 스키마는 **백엔드가 소유**(클라 IN 불변).

### 5.3 `mock.js` (3순위, 기존 목업 재활용)
- 네트워크 없이 **로컬에서 동일 SSE 이벤트 흐름을 시뮬**: `onData`(1~N 청크) → `onResult` 순으로 호출(setTimeout로 청크 간 지연 흉내).
- 데이터 산출: 기존 `src/mock/operia` alasql + `queries.js`(고정 SQL 템플릿) 재활용 → 행(tableData) 생성.
- **operia 필드 동일 생성**: tableData/columnMetadata/totalCount + result{answer, status:COMPLETED, success:true, reportPlan, queryInfo.sql, ...}.
  - `columnMetadata`: 컬럼 타입은 값으로 추론(number→decimal/integer, YYYY-MM-DD→date 등).
  - `summaryStats`: **생략 가능**(클라가 계산, §4.4). 채우려면 동일 구조로.
  - `queryInfo.sql`: 사용한 템플릿 SQL을 넣어 SQL 칩 유지(§9).
  - `reportPlan`: §7 매핑표대로 intent별 섹션 구성.
- 기존 NL→SQL(Claude 시뮬) 경로는 mock 내부 옵션으로 보존 가능(키 있으면 NL→SQL, 없으면 템플릿) — 단 출력은 위 계약으로 정규화.

---

## 6. 렌더링 (하이브리드: reportPlan + 질문→템플릿 매핑)
렌더는 2단계로 결정한다.

1. **프론트 질문→템플릿 매핑(우선 힌트)**: 기존 `cardIntent`(정규식) 류로 질문에서 intent를 추정하고, intent별 전용 템플릿이 있으면 그것을 선택(특히 `map`처럼 reportPlan으로 표현 못 하는 카드). 데이터는 응답의 `tableData`/`columnMetadata`에서 읽는다.
2. **reportPlan 섹션 렌더(서버 힌트)**: 전용 매핑이 없으면 `result.reportPlan.sections[]`를 **순서대로** 타입별로 렌더한다.

즉 데이터·answer·통계는 채널 응답에서 오고, **"어떤 모양으로 그릴지"는 (a) 질문 매핑 → (b) reportPlan** 순으로 정한다.

섹션 `type`별 컴포넌트 매핑(명세서 §3.3.2):

| reportPlan type | 주요 필드 | 렌더 컴포넌트 | 기존 자산 재사용 |
|---|---|---|---|
| `heading` | `content` | 제목 텍스트 | 카드 헤더 스타일 |
| `kpi_cards` | `metrics[]{label,column,agg}` | KPI 카드 그룹 | 신규(statList 변형) |
| `chart` | `config.viz`(bar_vertical/horizontal/line/area/pie/donut), `config.x`,`config.y` | 차트 | `bar`/`donut` 템플릿 + line/area/pie 신규 |
| `table` | (config 없음) | 데이터 테이블 | `table` 템플릿 |
| `kpi_grid` | `kpiGrid{groupBy,valueColumn,agg,topN,groupLabel,valueLabel}` | KPI 그리드 | `barlist` 템플릿 |
| `report` | `narrative` | 서술형 텍스트 | insight 박스 변형 |
| `insight` | `narrative` | 인사이트 박스 | 기존 💡 박스 |

- 데이터 소스: 각 섹션은 `tableData`(행) + `columnMetadata`(컬럼) + (클라가 계산한)`summaryStats`(집계)에서 자기 필드를 읽어 렌더.
- `answer`(자연어 답변)는 카드 위 말풍선 텍스트로 표시.
- **미지원/모르는 `type` → `table`(또는 텍스트) 폴백**(화면 안 깨짐). 기존 TEMPLATE_설계.md의 `table` 폴백 철학 계승.
- **지도(merchantMap)**: §6-1 질문 매핑으로 **지도 템플릿** 선택, 좌표는 `tableData` 행(lat/lng)에서. 좌표 없으면 `table` 폴백. (reportPlan 표준 `map` 타입 신설 불요)

---

## 7. 기존 10개 질의 → reportPlan 매핑 (목업이 생성)
목업이 각 intent에 대해 만들 `reportPlan.sections` 권장안(서버/백엔드도 동일 형태로 내리면 일관):

| intent | 섹션 구성(예) |
|---|---|
| report(소비패턴) | `chart`(bar_vertical, x=month,y=amount) → `insight` |
| catSpend | `chart`(donut, 업종별 비중) → `insight` |
| merchantBreakdown | `kpi_grid`(groupBy=가맹점, topN) 또는 `chart`(bar_horizontal) |
| friendCompare | `chart`(bar_vertical, 나 vs 평균) → `insight` |
| schoolCompare | `table` 또는 `kpi_grid`(학교별 TOP5) |
| nudgeCompare | `chart`(line, 월별 충전요청) → `kpi_cards` |
| balance | `kpi_cards`(항목별 잔액) → `insight` |
| channel | `chart`(pie, 온/오프) → `table` |
| parentCard | `table`(부모카드 내역) |
| merchantMap | **프론트 질문 매핑 → 지도 템플릿**(좌표=tableData 행의 lat/lng). 좌표 없으면 `table` 폴백 |

- 각 섹션 데이터는 tableData/columnMetadata에서 읽힘 → 채널 무관 동일 렌더 보장.
- 이 표(질문→섹션/템플릿)는 **목업이 생성할 reportPlan**의 권장안인 동시에, **프론트 질문→템플릿 매핑(§6-1)의 기준표**로도 쓴다(intent별 전용 템플릿 선택 근거).

---

## 8. 상태 / 이벤트 (스트리밍 UI)
- 한 질문당 메시지 1개에 **StreamState** 보유: `{ rows:[], columnMetadata, summaryStats, status:'loading', result:null }`.
- `onData`: 청크의 tableData를 `rows`에 누적(또는 교체), columnMetadata 갱신, `isLast`면 데이터 수신 종료 표시.
- 데이터 확정 시 **클라가 `computeSummaryStats(rows, columnMetadata)` 호출**해 통계 산출(§4.4).
- `onResult`: `result` 저장 → reportPlan/answer/queryInfo.sql 확정 → (§6: 질문 매핑 → reportPlan) 렌더 전환. `success=false`면 errorMessage 표시.
- `onError`(HTTP/네트워크): 토스트 + 메시지 카드 에러 상태.
- 로딩 표시: 기존 Typing 인디케이터를 result 도착 전까지 유지(또는 data 첫 청크에 골격 표시).
- 취소: 새 질문/이탈 시 `AbortSignal`로 진행 중 SSE 중단.

---

## 9. SQL 칩 / answer 처리
- 기존 "AI SQL" 칩: operia 표준 응답엔 SQL 전용 필드가 없음. **`queryInfo.sql` 또는 `summary`에 SQL이 있으면** 칩에 노출, 없으면 칩 숨김.
  - `backend` 채널은 Claude가 만든 SQL을 `queryInfo.sql`로 실어주면 칩 표시 가능(백엔드 구현 권장).
  - `mock`은 템플릿 SQL을 `queryInfo.sql`로 채워 칩 유지.
- `answer`: 카드 위 자연어 말풍선으로 항상 표시(없으면 생략).

---

## 10. DEV MOCK / 교체지점
- 교체는 **`VITE_DATA_SOURCE` 한 줄**. 코드 변경 없이 `mock`↔`backend`↔`operia` 전환.
- 어댑터 경계가 유일한 분기점(`getDataSource()`). 렌더/상태/화면은 채널 불변.
```js
// src/api/datasource/index.js
export function getDataSource() {
  switch (import.meta.env.VITE_DATA_SOURCE) {
    case "operia":  return operiaSource;
    case "backend": return backendSource;
    default:        return mockSource;   // 미설정/오타 → mock 폴백
  }
}
```

---

## 11. 절대 보존
- **자유대화(askAI, Claude 직접/`window.FINFRIEND_AI_ENDPOINT`) 경로**는 이 설계와 분리·불변.
- 기존 webview 동작(FAQ 패널 포커스 숨김, AI 첫 인사, 일별 연속7일 등) 회귀 금지.
- mock 모드에서 기존 10개 질의가 **계속 렌더**(단, 렌더 경로가 reportPlan으로 바뀌므로 시각 결과는 generic 섹션 기준으로 재현 — §7).
- SQL 칩/결과탭은 §9 규칙으로 유지.

---

## 12. Playwright 검증 시나리오 (foreground, 모바일 뷰포트)
1. `VITE_DATA_SOURCE=mock` → "이번 달 소비 알려줘" → SSE 시뮬(data→result) 후 reportPlan 섹션(chart+insight) 렌더, answer 말풍선 표시, 콘솔 에러 0.
2. 10개 질의 회귀 — 각 질문이 §7 매핑대로 섹션 렌더(깨짐 없음). 미지원 타입 폴백 동작 1건 확인.
3. `VITE_DATA_SOURCE=backend` + 목 SSE 서버(스텁)로 동일 계약 응답 → 클라이언트가 동일 렌더(채널 무관 동형) 확인.
4. 오류 케이스: result.success=false/errorMessage → 에러 표시. 401/503 → 토스트.
5. `npm run build` 통과. 스크린샷 `C:/Users/Public/edupay_datasource_*.png` 저장 후 분석.

---

## 13. 전환(실연동) 메모 · 남은 항목

**✅ 확정(§0.1)**: 지도=질문 매핑, SQL 칩=`queryInfo.sql`, summaryStats=클라 계산, operia 접속=config 지연.

**⏳ 값/정보 대기(구현은 안 막힘 — env 자리·계약은 완료, 값만 추후 주입)**
- **operia 엔드포인트 경로/메서드**(명세서 §2.1 비어 있음) — `VITE_OPERIA_API`에 베이스만, 경로는 받으면 확정.
- **operia 인증 토큰 수명/갱신**(401 처리) — `VITE_OPERIA_TOKEN`. 갱신 정책 추후.
- **`companyId` 값**(에듀페이 테넌트) — `VITE_OPERIA_COMPANY_ID`.

**🟡 추후 확장**
- **HIL(hilRequired/hilApproved)** UX — 현재 미사용, 사람개입 흐름 설계 시.
- **backend queryInfo.sql**: 백엔드가 Claude SQL을 `queryInfo.sql`에 실어주면 칩 노출(구현 권장).

**관계**: 본 설계가 데이터 계약·렌더 흐름을 상위 정의. `TEMPLATE_설계.md`의 템플릿 레지스트리는 §6의 reportPlan 섹션/질문 매핑 템플릿의 **구현 자산으로 재사용**. `MOCK_API_설계.md`는 mock 어댑터 내부(alasql/queries.js) 근거로 유지.

---

## 14. 구현 프롬프트 (단계별, CLI용)

**실행 순서**: A → B → C → D. **한 번에 하나**, 각 단계 검증 통과 후 다음. (Phase D는 operia 접속 값 도착 후)
**먼저 실행할 것 = Phase A.**

> 공통: 첫 줄 `graphify query`. 세부는 이 설계서·graphify·CLAUDE.md 참조. `graphify update`는 사용자 지시 시에만(자동 금지).

### Phase A — 계약·SSE·팩토리·mock 어댑터 (데이터 레이어 교체, 렌더는 브리지로 기존 유지)
```
graphify query "데이터 질문 처리 흐름: App.jsx의 queryOperia 호출부, api/operia.js 모드 분기, 응답→카드 렌더 진입점, SqlChip"

## 목적
데이터 창구를 config로 교체 가능하게 — 계약/SSE/팩토리/mock 어댑터 신설(DATASOURCE_설계.md §3,4,5.3,8,9). 이번 단계는 '데이터 레이어'만 교체하고 렌더는 기존 유지(브리지)해 회귀 0.

## 작업
설계서: edupay-app/DATASOURCE_설계.md 를 먼저 읽고 그대로 구현.
- src/api/datasource/ 신설:
  · contract.js — DataEvent/ResultEvent 필드(§4.3) 주석·헬퍼.
  · sse.js — SSE 텍스트 → {event,data} 파서(text/event-stream).
  · index.js — getDataSource(): VITE_DATA_SOURCE(operia|backend|mock)→어댑터, 미설정/오타→mock 폴백.
  · mock.js — 기존 src/mock/operia(alasql)+queries.js(고정 템플릿 SQL) 재활용해 rows 생성 → onData(청크, isLast=true 1개로 시작) → onResult 순으로 '로컬 SSE 시뮬'(setTimeout 지연). result에 answer/status:'COMPLETED'/success:true/reportPlan(§7 매핑)/queryInfo.sql(템플릿 SQL) 채움. columnMetadata는 값으로 타입 추론. summaryStats는 비워도 됨(§4.4).
- src/api/datasource/stats.js — computeSummaryStats(rows, columnMetadata)(§4.4) 신설.
- App.jsx — 데이터 질문 처리부를 getDataSource().query({userInput, context:{companyId}}, {onData,onResult,onError})로 교체. StreamState(rows 누적, isLast 종료). 데이터 확정 시 computeSummaryStats 호출.
- ★브리지(이번 단계 한정): 렌더는 바꾸지 않는다. 새 결과(tableData/columnMetadata/answer/queryInfo.sql)를 '기존 intent/템플릿 입력'으로 변환해 10개 카드가 기존과 100% 동일하게 보이게. SqlChip은 queryInfo.sql 사용.

## DEV MOCK / 교체지점
VITE_DATA_SOURCE 기본 mock. 채널 분기는 getDataSource() 한 곳뿐.

## 절대 보존
자유대화(askAI/Claude 직접/window.FINFRIEND_AI_ENDPOINT) 경로, AI 토글, webview 동작(FAQ 포커스 숨김·AI 첫 인사·일별 연속7일), 10개 카드 시각 결과(브리지로 동일).

## 검증 (Playwright, foreground, 모바일 뷰포트, ?view=webview)
- VITE_DATA_SOURCE=mock → 10개 질의가 기존과 동일 렌더(회귀). SSE 시뮬 data→result 후 카드 표시. SQL칩 표시. 콘솔 에러 0.
- npm run build 통과. 스크린샷 C:/Users/Public/edupay_ds_A_*.png 저장 후 Read 분석.

## 완료
WORKFLOW.md §8 "데이터창구 Phase A(계약·mock·브리지)" 메모. graphify update 금지.
```

### Phase B — reportPlan + 질문→템플릿 하이브리드 렌더러 (브리지 제거)
```
graphify query "차트 템플릿 레지스트리(charts/intentConfig.js, charts/templates/*, ChartRenderer), App.jsx cardIntent(질문→intent)"

## 목적
설계서 §6,§7의 '질문→템플릿 매핑 → reportPlan 섹션' 하이브리드 렌더러 신설. Phase A 브리지 제거하고 새 렌더 경로로 전환.

## 작업
설계서: edupay-app/DATASOURCE_설계.md §6,§7 그대로.
- src/charts/reportPlan/ReportPlanRenderer.jsx — result.reportPlan.sections[] 순서대로 타입별 렌더: heading/kpi_cards/chart(config.viz: bar_vertical|bar_horizontal|line|area|pie|donut, config.x/y)/table/kpi_grid/report/insight. 기존 templates(bar·donut·table·barlist) 재사용 + line/area/pie/kpi_cards/kpi_grid 신설. 모르는 type→table 폴백.
- 질문→템플릿 매핑(우선순위 1, §6-1): cardIntent로 intent 추정 → 전용 템플릿 있으면 우선 선택. 특히 merchantMap→지도 템플릿(좌표=tableData 행 lat/lng, 없으면 table 폴백). 전용 매핑 없으면 reportPlan 렌더.
- 데이터: tableData/columnMetadata/computeSummaryStats에서. answer=카드 위 말풍선.
- Phase A 브리지 삭제 → 새 경로로 일원화.

## 절대 보존
자유대화 경로, webview 동작, SqlChip(queryInfo.sql), report 탭 토글 등 기존 인터랙션 회귀 금지.

## 검증 (Playwright, foreground, 모바일 뷰포트, ?view=webview)
- VITE_DATA_SOURCE=mock → 10개 질의가 §7 매핑대로 렌더(map은 질문매핑 지도). 모르는 type 폴백 1건 확인. 토글/말풍선 정상. 콘솔 0/빌드 통과. 스크린샷 C:/Users/Public/edupay_ds_B_*.png.

## 완료
WORKFLOW.md §8 "데이터창구 Phase B(reportPlan·질문매핑 렌더)" 메모. graphify update 금지.
```

### Phase C — backend 실 SSE 채널 어댑터
```
graphify query "datasource 어댑터 인터페이스(api/datasource/*), sse.js 파서, getDataSource 팩토리"

## 목적
임시 백엔드 채널 어댑터(설계서 §5.2). 클라는 operia와 동일 소비. operia 어댑터 골격도 같이 생성.

## 작업
설계서: edupay-app/DATASOURCE_설계.md §5.1,5.2,4.2 그대로.
- src/api/datasource/backend.js — fetch(`${VITE_BACKEND_API}/{경로}`, method:POST, headers:{Accept:text/event-stream, Content-Type:application/json, Authorization: Bearer VITE_BACKEND_TOKEN(있으면)}, body:{userInput, context}) → sse.js로 event:data/result 파싱 → onData/onResult/onError. AbortSignal 지원.
- src/api/datasource/operia.js — 동일 골격, base=VITE_OPERIA_API, token=VITE_OPERIA_TOKEN, companyId=VITE_OPERIA_COMPANY_ID. 값 비면 호출 안 하고 경고(§3 폴백).
- index.js — case "backend"→backendSource, case "operia"→operiaSource.

## 절대 보존
mock/렌더/상태/화면 전부 불변(채널만 교체). 자유대화 경로.

## 검증 (Playwright)
- 로컬 스텁 SSE 서버(operia 포맷 data→result 응답)로 VITE_DATA_SOURCE=backend → mock과 동일 렌더(채널 무관 동형) 확인. 에러(success:false) 케이스 표시. 콘솔 0/빌드 통과. 스크린샷 C:/Users/Public/edupay_ds_C_*.png.

## 완료
WORKFLOW.md §8 "데이터창구 Phase C(backend SSE)" 메모. graphify update 금지.
```

### Phase D — operia 어댑터 마무리 (접속 값 도착 후)
```
graphify query "api/datasource/operia.js, sse.js, getDataSource"

## 목적
operia 실서버 연동 마무리(설계서 §5.1, §13 값 주입).

## 작업
- .env에 VITE_OPERIA_API/_TOKEN/_COMPANY_ID 실제 값, operia 실제 엔드포인트 경로/메서드 반영.
- operia.js 경로·인증 확정, 401 재시도/갱신(정책 정해지면).
- 필요 시 queryInfo.sql/summaryStats 유무 따른 graceful 표시 점검.

## 검증
- VITE_DATA_SOURCE=operia → 실제(또는 스테이징) 호출로 data→result 수신·렌더. 채널 무관 동형 재확인. 콘솔 0/빌드 통과.

## 완료
WORKFLOW.md §8 "데이터창구 Phase D(operia 연동)" 메모.
```
