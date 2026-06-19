# 에듀페이 — 오페리아 API(목업) 연동 설계서

데이터 질문(10개)을 **오페리아 API(NL2SQL 에이전트)** 호출 → `result`(쿼리 결과) 수신 → 차트 렌더 구조로 바꾼다.
오페리아가 개발 중이라 지금은 **하드코딩 목업**이 오페리아와 **동일한 응답 형태**로 답한다(나중에 목업 자리만 실 API로 교체).

- 자유 대화(기타) → 기존대로 **Claude API** (변경 없음)
- 데이터 질문(일반 10개) → **오페리아 API(목업)** , Claude 안 탐

---

## 1. 응답(Response) 표준 스키마

오페리아 API와 목업이 공통으로 반환하는 형태. **오페리아는 `result`(데이터)만 책임진다. 차트 유형은 응답에 없다.**

```jsonc
{
  "question": "월별 사용 내역 알려줘",   // 원 질문(NL)
  "sql": "SELECT ...",                  // 생성된 SQL (참고/디버그용, 없으면 null)
  "result": <rows | object>             // ★ 쿼리 결과 (핵심). 단순 질의는 rows 배열, 복합 카드는 object
}
```

- 단순 집계(채널/가맹점별 등) → `result`는 **행 배열**(`[{...}, ...]`)
- 복합 카드(월별+수단별, 잔액 등) → `result`는 **object** (아래 질의별 정의)

> ⚠️ **chart.type은 응답에 넣지 않는다.** 차트 유형은 "질문"만 보고 정해지므로(데이터와 무관) **프론트가 intent 분류로 결정**한다(§3.1). 오페리아(NL2SQL 에이전트)는 UI를 모르고 데이터만 준다.
> 향후 오페리아가 차트 힌트를 주게 되면 `resp.chart ?? INTENT_CHART[intent] ?? 'table'` 우선순위로 얹어 전방 호환.

---

## 2. 가상 결제내역 테이블 (명세 없음 → 본 설계에서 신규 정의)

실제 스키마 4개(`TB_COM_USER/ADBK/VOUCHER/PAY_API_LOG`)엔 정규화 결제내역이 없으므로, 목업·향후 연동 기준으로 아래를 가정한다.

### TB_PAY_DTL (결제내역 정규화 — 가상)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| PAY_ID | varchar | PK |
| USER_ID | varchar | FK→TB_COM_USER |
| MERCHANT_NO | varchar | FK→TB_COM_VOUCHER |
| PAY_AMT | int | 결제금액 |
| PAY_MEANS | varchar | VOUCHER(바우처) / APPCARD(부모카드) / BEG(조르기받은금액) |
| PAY_CHANNEL | varchar | ONLINE / OFFLINE |
| PAY_STTS | varchar | APPROVED / CANCELED |
| PAY_DT | datetime | 결제일시 |

### TB_BEG (조르기 — 가상)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| BEG_ID | varchar | PK |
| STUDENT_USER_ID | varchar | 학생 |
| PARENT_USER_ID | varchar | 부모 |
| REQ_AMT | int | 요청 금액 |
| RECV_AMT | int | 수령(입금) 금액 |
| REQ_STTS | varchar | REQUEST/ACCEPT/REJECT |
| REQ_DT | datetime | 요청일시 |

### TB_COM_VOUCHER 좌표 컬럼 추가 (가상)
`LAT decimal`, `LNG decimal` — 지도용. (바우처 한도 = 학생 1인 10만원 상수)

> 위 가상 항목은 `설계서.md`(루트)의 신설 요청 테이블과 일치. 오페리아 확정 시 동일 키로 매핑.

---

## 3. 아키텍처 / 폴더 구조

```
src/
  api/
    operia.js        # queryOperia(intent, params): 실 API 또는 목업 반환
    claude.js        # (기존) 자유대화 전용
  mock/
    operia/
      index.js       # intent → 목업 응답 매핑
      monthlyUsage.js, catSpend.js, friendCompare.js, nudgeCompare.js,
      merchantMap.js, balance.js, channel.js, merchantBreakdown.js,
      parentCard.js, schoolCompare.js
```

### src/api/operia.js (의사코드)
```js
import results from "../mock/operia";
const BASE = import.meta.env.VITE_OPERIA_API; // 실 오페리아 베이스. 비면 목업
export async function queryOperia(intent, params) {
  if (BASE) {
    const r = await fetch(`${BASE}/query`, { method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ intent, params }) });
    if (!r.ok) throw new Error("operia "+r.status);
    return r.json();                 // { question, sql, result, chart }
  }
  await new Promise(r => setTimeout(r, 300)); // 실제 호출처럼 약간 지연
  const m = results[intent];
  if (!m) throw new Error("no mock for "+intent);
  return typeof m === "function" ? m(params) : m;
}
```

### 3.1 차트 유형 결정 — 프론트 소유 (질문 기반)
chart.type은 응답이 아니라 **프론트가 intent로 결정**한다.

```js
// src/charts/registry.js
export const INTENT_CHART = {
  report:            "bar",       // 월별 사용내역
  catSpend:          "donut",     // 사용처별(업종)
  channel:           "donut",     // 온/오프라인
  merchantBreakdown: "barlist",   // 가맹점별 비율
  friendCompare:     "compare",   // 친구 비교
  nudgeCompare:      "compare",   // 조르기 비교
  schoolCompare:     "compare",   // 학교별 비교
  balance:           "balanceList", // 잔액(합계 없는 3항목 리스트, §5 ⑥)
  parentCard:        "list",      // 부모카드 내역
  merchantMap:       "map",       // 근처 가맹점
};
export const chartTypeForIntent = (intent) => INTENT_CHART[intent] || "table";
```

`<ChartRenderer type result/>` 가 type으로 분기, **default = table**:
```
bar | donut | barlist | compare | gauge | list | map | (그 외) → table
```
- 10개 intent → 전용 차트.
- 매칭 안 됨(intent=null) 또는 미지원 type → **TableCard**(result rows를 그대로 표로).

---

## 4. 호출 흐름 (App.jsx send)

기존: `cardIntent(q)` → 카드 kind 결정 → 카드가 `window.EDUPAY`에서 직접 계산해 렌더.
변경: `cardIntent(q)` → **`await queryOperia(kind, scope)`** → 응답의 `result`를 메시지에 실어 렌더.

```js
const ci = cardIntent(q);                        // 질문 → intent (없으면 null)
if (ci) {
  setTyping(true);
  try {
    const resp = await queryOperia(ci.kind, ci.scope);     // ← 오페리아(목업): result만
    const type = chartTypeForIntent(ci.kind);              // ← 프론트가 차트유형 결정
    setTyping(false);
    setMessages(m => [...m, { id:.., role:"ai", text:"",
      chartType: type, result: resp.result, scope: ci.scope }]);
  } catch (e) {
    setTyping(false);
    setMessages(m => [...m, { id:.., role:"ai", text:"데이터를 불러오지 못했어. 잠시 후 다시 시도해줘." }]);
  }
  return;
}
// intent 매칭 안 됨 → (목업 단계) 기타/자유대화 경로(Claude/로컬).
// 실 오페리아 연동 후: 데이터성 질문이면 queryOperia('adhoc',{question:q}) → chartType='table' 로 표 렌더.
```

- `Bubble` → `<ChartRenderer type={msg.chartType} result={msg.result}/>` 로 렌더.
- 각 차트 컴포넌트는 **`result` prop을 사용**(이행기엔 result 없으면 기존 `EDUPAY` 계산 폴백 허용).

---

## 5. 질의 10개 — intent · SQL · 목업 result · 차트 · 카드

> 금액 단위 원. 사용자 기준 USER_ID = 'stu_demo'(중학생), 학교 '흥덕중'. 최근 3개월(4·5·6월) 기준.
> 각 항목의 `chart:` 는 **응답 필드가 아니라** §3.1 프론트 매핑(`INTENT_CHART`) 확인용 참고값이다. 오페리아 응답엔 `result`만 포함.

### ① monthlyUsage — 월별 사용내역 (card: report)
SQL:
```sql
SELECT DATE_FORMAT(PAY_DT,'%Y-%m') ym, PAY_MEANS, SUM(PAY_AMT) amt
FROM TB_PAY_DTL WHERE USER_ID=:uid AND PAY_STTS='APPROVED'
GROUP BY ym, PAY_MEANS ORDER BY ym;
```
result(object):
```json
{ "trend":[{"month":"2026-04","amount":43000},{"month":"2026-05","amount":58000},{"month":"2026-06","amount":115000}],
  "byMeans":[{"means":"VOUCHER","label":"바우처(지원금)","amount":195000,"pct":90},
             {"means":"APPCARD","label":"부모카드","amount":22000,"pct":10}] }
```
chart: `{ "type":"bar", "x":"month", "y":"amount" }`

### ② catSpend — 사용처별(편의점 등 업종) (card: catSpend)
SQL:
```sql
SELECT v.BIZ_ITEM_NM cat, SUM(p.PAY_AMT) amt, COUNT(*) cnt
FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO
WHERE p.USER_ID=:uid AND p.PAY_STTS='APPROVED'
GROUP BY v.BIZ_ITEM_NM ORDER BY amt DESC;
```
result(rows):
```json
[{"category":"편의점","amount":62000,"cnt":14},
 {"category":"식비","amount":38000,"cnt":9},
 {"category":"학용품","amount":12000,"cnt":3},
 {"category":"교통","amount":9000,"cnt":6},
 {"category":"문화","amount":8000,"cnt":2}]
```
chart: `{ "type":"donut", "label":"category", "value":"amount" }`

### ③ friendCompare — 친구(같은 학교+학년) 비교 (card: friendCompare)
SQL: 내 합계 vs 같은학교·학년 평균 vs 충북 전체(학생) 평균
```sql
SELECT u.SCH_NM, u.GRADE, AVG(t.amt) avg_amt FROM TB_COM_USER u
LEFT JOIN (SELECT USER_ID, SUM(PAY_AMT) amt FROM TB_PAY_DTL WHERE PAY_STTS='APPROVED' GROUP BY USER_ID) t
ON t.USER_ID=u.USER_ID WHERE u.USER_TYPE='STUDENT' GROUP BY u.SCH_NM, u.GRADE;
```
result(object):
```json
{ "me":115000, "schoolGradeAvg":98000, "provinceAvg":104000, "percentile":62,
  "bars":[{"label":"나","amount":115000,"me":true},
          {"label":"우리학교 같은학년","amount":98000},
          {"label":"충북 평균","amount":104000}] }
```
chart: `{ "type":"bar" }`

### ④ nudgeCompare — 조르기 내역 비교 (card: nudgeCompare)
SQL: TB_BEG 기준 내 조르기 횟수/금액 vs 평균, 월별
```sql
SELECT DATE_FORMAT(REQ_DT,'%Y-%m') ym, COUNT(*) cnt, SUM(RECV_AMT) amt
FROM TB_BEG WHERE STUDENT_USER_ID=:uid GROUP BY ym;
```
result(object):
```json
{ "me":{"count":5,"amount":50000},
  "schoolGradeAvg":{"count":3.2,"amount":32000},
  "provinceAvg":{"count":3.8,"amount":38000},
  "monthly":[{"month":"2026-04","count":1},{"month":"2026-05","count":2},{"month":"2026-06","count":2}] }
```
chart: `{ "type":"bar" }`

### ⑤ merchantMap — 근처 사용 가능 가맹점(지도) (card: merchantMap)
SQL: VOUCHER 좌표 기반 근처
```sql
SELECT MERCHANT_NM, BIZ_ITEM_NM, ADDR, LAT, LNG FROM TB_COM_VOUCHER
WHERE USE_YN='Y' AND VOUCHER_STTS_NM='정상';  -- 거리정렬은 좌표로
```
result(object):
```json
{ "center":{"lat":36.6372,"lng":127.4860},
  "merchants":[
   {"name":"GS25 청주흥덕점","category":"편의점","addr":"청주시 흥덕구 대농로 12","lat":36.6378,"lng":127.4852},
   {"name":"분식왕 떡볶이","category":"식비","addr":"청주시 흥덕구 가경로 33","lat":36.6361,"lng":127.4889},
   {"name":"흥덕문구","category":"학용품","addr":"청주시 흥덕구 신율로 8","lat":36.6390,"lng":127.4843},
   {"name":"CU 가경점","category":"편의점","addr":"청주시 흥덕구 가경로 51","lat":36.6355,"lng":127.4901}] }
```
chart: `{ "type":"map" }`

### ⑥ balance — 현재 사용 가능 금액(잔액) (card: balance)
**화면설계 기준**: 합계(총합) 박스·도넛 **없음**. 항목 3개를 "남은 금액"으로 나열(합산하지 않음).
- 바우처(지원금) 잔액 = 한도(100,000) − 바우처 사용합  (**음수 불가** — 데이터상 사용합 ≤ 한도)
- 용돈 충전금 잔액 = 보호자 충전(수령)합 − 충전금 사용합   (기존 'beg/조르기' → UI 라벨 "용돈 충전금")
- 에듀포인트 = 적립 포인트 잔액 (결제와 별개. TB_COM_USER에 포인트 컬럼 추가해 단일 SQL에 포함)

단일 SQL(UNION ALL, §8.4):
```sql
SELECT 'voucher_used' k, SUM(PAY_AMT) v FROM TB_PAY_DTL WHERE USER_ID='stu_demo' AND PAY_MEANS='VOUCHER' AND PAY_STTS='APPROVED'
UNION ALL SELECT 'charge_recv', SUM(RECV_AMT) FROM TB_BEG WHERE STUDENT_USER_ID='stu_demo' AND REQ_STTS='ACCEPT'
UNION ALL SELECT 'charge_used', SUM(PAY_AMT) FROM TB_PAY_DTL WHERE USER_ID='stu_demo' AND PAY_MEANS='BEG' AND PAY_STTS='APPROVED'
UNION ALL SELECT 'points', POINT_BAL FROM TB_COM_USER WHERE USER_ID='stu_demo'
```
result(object) — 항목별 잔액만(합계 없음):
```json
{ "voucher": { "label":"바우처(지원금)", "sub":"학생 복지 지원금",   "limit":100000, "used":56200, "balance":43800 },
  "charge":  { "label":"용돈 충전금",   "sub":"보호자가 충전한 용돈", "received":65000, "used":20000, "balance":45000 },
  "points":  { "label":"에듀포인트",    "sub":"질문·퀴즈로 모은 포인트", "balance":1000, "unit":"P" } }
```
chart: `{ "type":"balanceList" }`  // 도넛/합계 없는 3항목 리스트 카드
카드 UI: 제목 "지금 쓸 수 있는 금액" / 부제 "항목별 남은 금액 · 합산되지 않아요" / 항목 3개(아이콘+라벨+sub+금액, 포인트는 P) / 💡 "바우처와 용돈 충전금은 따로 관리돼요. 포인트는 결제와 별개로 쌓이는 거예요!"

### ⑦ channel — 온/오프라인 결제내역 (card: channel)
SQL:
```sql
SELECT PAY_CHANNEL, SUM(PAY_AMT) amt, COUNT(*) cnt FROM TB_PAY_DTL
WHERE USER_ID=:uid AND PAY_STTS='APPROVED' GROUP BY PAY_CHANNEL;
```
result(rows):
```json
[{"channel":"OFFLINE","label":"오프라인","amount":150000,"cnt":28,"pct":78},
 {"channel":"ONLINE","label":"온라인","amount":43000,"cnt":7,"pct":22}]
```
chart: `{ "type":"donut", "label":"label", "value":"amount" }`

### ⑧ merchantBreakdown — 어디에 주로(가맹점별 비율) (card: merchantBreakdown)
SQL:
```sql
SELECT v.MERCHANT_NM m, SUM(p.PAY_AMT) amt FROM TB_PAY_DTL p
JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO
WHERE p.USER_ID=:uid AND p.PAY_STTS='APPROVED'
GROUP BY v.MERCHANT_NM ORDER BY amt DESC LIMIT 6;
```
result(rows):
```json
[{"merchant":"GS25 청주흥덕점","amount":48000,"pct":25},
 {"merchant":"분식왕 떡볶이","amount":36000,"pct":19},
 {"merchant":"교보문고 청주","amount":28000,"pct":15},
 {"merchant":"CU 가경점","amount":24000,"pct":12},
 {"merchant":"메가커피 흥덕","amount":18000,"pct":9},
 {"merchant":"기타","amount":38000,"pct":20}]
```
chart: `{ "type":"barlist", "label":"merchant", "value":"amount", "pct":"pct" }`

### ⑨ parentCard — 부모 카드(앱카드) 사용내역 (card: parentCard)
SQL:
```sql
SELECT PAY_DT, v.MERCHANT_NM, p.PAY_AMT FROM TB_PAY_DTL p
JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO
WHERE p.USER_ID=:uid AND p.PAY_MEANS='APPCARD' AND p.PAY_STTS='APPROVED'
ORDER BY PAY_DT DESC;
```
result(object):
```json
{ "total":22000, "count":3,
  "rows":[{"date":"2026-06-10","merchant":"이마트 청주","amount":12000},
          {"date":"2026-06-03","merchant":"올리브영 흥덕","amount":7000},
          {"date":"2026-05-28","merchant":"GS25 청주흥덕점","amount":3000}] }
```
chart: `{ "type":"list" }`

### ⑩ schoolCompare — 학교별 사용내역 비교 (card: schoolCompare)
SQL:
```sql
SELECT u.SCH_NM, SUM(p.PAY_AMT)/COUNT(DISTINCT u.USER_ID) avg_per_student
FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID
WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED'
GROUP BY u.SCH_NM ORDER BY avg_per_student DESC;
```
result(rows):
```json
[{"school":"청주중","avgPerStudent":121000,"students":140},
 {"school":"흥덕중(우리학교)","avgPerStudent":115000,"students":120,"me":true},
 {"school":"가경중","avgPerStudent":104000,"students":133},
 {"school":"복대중","avgPerStudent":92000,"students":98}]
```
chart: `{ "type":"bar", "label":"school", "value":"avgPerStudent" }`

---

## 6. 카드 리팩터 원칙
- 각 카드 컴포넌트는 **`result`(필요 시 `chart`) prop을 우선 사용**.
- `result`가 없으면 기존 `EDUPAY` 계산으로 폴백(이행기 안전).
- 차트는 기존 구현(직접 SVG / Recharts / Leaflet) 그대로, 입력 데이터만 `result`로 교체.
- 로딩: 메시지 전송 후 응답 전까지 기존 `Typing` 표시 재사용.

## 7. 실 오페리아 전환 시
- `.env`에 `VITE_OPERIA_API=https://...` 설정만 하면 `queryOperia`가 목업 대신 실 API 호출.
- 응답이 본 문서 §1 스키마를 따르면 프론트 무수정. (다르면 operia.js에 어댑터 1곳만 추가)

---

## 8. 오페리아 시뮬 모드 — 프론트 SQL 실행 (옵션 B 확정)
데이터셋을 프롬프트에 넣으면 무겁고 불안정 → **실행을 프론트로 이동.** Claude는 **SQL만**(경량) 만들고,
**브라우저 내 SQL 엔진 alasql**이 고정 데이터셋(dataset.json) 위에서 그 SQL을 실제 실행한다.
→ 결정적·정확·무료(데이터셋을 Claude에 안 보냄). "그 쿼리로 이 결과"가 진짜로 성립.

### 8.0 라우팅 (10개 vs 그 외)
- **알려진 10개 intent** (`cardIntent` 매칭): **고정 SQL 템플릿** 사용(Claude 호출 없음, 결정적). 템플릿 → alasql 실행 → intent별 shaper → expectedShape.
- **그 외 데이터 질문** (intent=null): **Claude 경량 호출**(스키마만 보고 SQL만 반환) → alasql 실행 → rows → ChartRenderer default `table`.
- **잡담**(데이터 아님): 기존 기타(자유대화) 경로.

### 8.1 모드 우선순위 (operia.js)
```
VITE_OPERIA_API (실서버)  >  VITE_OPERIA_AI === "true" (alasql 로컬 실행)  >  정적 목업 파일
```
- 세 모드 모두 `queryOperia(intent, params)` → `{ question, sql, result }` 동일 계약(§1). 전환 = env 스위치뿐.
- **실패(SQL 생성/실행 오류) → throw → 화면 에러 메시지** (정적 목업 자동 폴백 안 함).

### 8.2 데이터셋 fixture — `src/mock/operia/dataset.json`
4개 테이블을 행 배열로(실제 4테이블 + 가상 TB_PAY_DTL/TB_BEG). **이 fixture는 추후 edupay_db 더미데이터로 재활용.**
```jsonc
{
  "TB_COM_USER": [
    {"USER_ID":"stu_demo","USER_TYPE":"STUDENT","USER_NM":"김민준","SCH_NM":"흥덕중","GRADE":"2","CLS_NO":"3"},
    {"USER_ID":"stu_002","USER_TYPE":"STUDENT","USER_NM":"이서연","SCH_NM":"흥덕중","GRADE":"2","CLS_NO":"3"},
    {"USER_ID":"par_demo","USER_TYPE":"PARENT","USER_NM":"김아빠","SCH_NM":null,"GRADE":null,"CLS_NO":null}
    // 학생 ~8명(흥덕중/청주중/가경중 분포), 부모 일부
  ],
  "TB_COM_VOUCHER": [
    {"MERCHANT_NO":"M001","MERCHANT_NM":"GS25 청주흥덕점","BIZ_TYPE_NM":"소매","BIZ_ITEM_NM":"편의점","ADDR":"청주시 흥덕구 대농로 12","USE_YN":"Y","VOUCHER_STTS_NM":"정상","LAT":36.6378,"LNG":127.4852}
    // 가맹점 ~14개(편의점/식비/학용품/교통/문화/카페), 흥덕구 좌표
  ],
  "TB_PAY_DTL": [
    {"PAY_ID":"P0001","USER_ID":"stu_demo","MERCHANT_NO":"M001","PAY_AMT":4500,"PAY_MEANS":"VOUCHER","PAY_CHANNEL":"OFFLINE","PAY_STTS":"APPROVED","PAY_DT":"2026-04-03 12:15:00"}
    // stu_demo ~40행(2026-04~06 분포). 수단 VOUCHER 70/APPCARD 15/BEG 15, 채널 OFFLINE 75/ONLINE 25,
    // 금액 1,000~15,000, MERCHANT_NO는 VOUCHER에서. 비교용으로 타 학생 결제도 일부.
  ],
  "TB_BEG": [
    {"BEG_ID":"B001","STUDENT_USER_ID":"stu_demo","PARENT_USER_ID":"par_demo","REQ_AMT":20000,"RECV_AMT":20000,"REQ_STTS":"ACCEPT","REQ_DT":"2026-05-10 19:30:00"}
    // stu_demo ~5건(4~6월), 일부 REJECT
  ]
}
```
> CLI는 위 구조·분포 규칙대로 행을 채워 dataset.json 생성(시드 예시는 형태 참고용).

### 8.3 alasql 도입 / 실행
- `npm i alasql`. dataset.json 로드 후 테이블 등록(예: `alasql.tables.TB_PAY_DTL = {data: ds.TB_PAY_DTL}` … 4개).
- **alasql 호환 SQL만**: `DATE_FORMAT` 등 MySQL 전용 함수 금지. 월 추출은 `SUBSTR(PAY_DT,1,7)` 사용. JOIN/GROUP BY/SUM/COUNT/서브쿼리/`ORDER BY`/`LIMIT` OK.
- 실행: `alasql(sql)` → rows 반환.

### 8.4 알려진 10개 — 고정 SQL 템플릿 + shaper (`src/mock/operia/queries.js`)
> ★ **실 오페리아 계약 = 한 요청 = SQL 1문장 = 결과셋 1개(rows).** 따라서 **intent당 SQL은 정확히 1문장**(여러 `SELECT;`를 나열하지 말 것). 한 문장 안의 `UNION ALL`은 허용(여전히 결과셋 1개). shaper가 그 단일 rows에서 카드를 조립한다.

intent별로 `{ sql, shape }`:
- `sql`: **단일 문장**(GROUP BY에 차원 추가 또는 UNION ALL로 한 방에).
- `shape(rows) → expectedShape`: 단일 rows에서 §5 형태로 파생.
- 예(report — 2쿼리 금지, 1쿼리로):
```js
report: {
  sql: "SELECT SUBSTR(PAY_DT,1,7) month, PAY_MEANS means, SUM(PAY_AMT) amount " +
       "FROM TB_PAY_DTL WHERE USER_ID='stu_demo' AND PAY_STTS='APPROVED' " +
       "GROUP BY month, means ORDER BY month",
  // rows: [{month, means, amount} ...] (월×수단)
  shape: (rows) => ({
    trend:   sumBy(rows, 'month'),        // 월별 합
    byMeans: withPct(sumBy(rows, 'means'))// 수단별 합 + 비율
  }),
}
```
- 예(balance — UNION ALL 한 문장):
```sql
SELECT 'voucher_used' k, SUM(PAY_AMT) v FROM TB_PAY_DTL WHERE USER_ID='stu_demo' AND PAY_MEANS='VOUCHER' AND PAY_STTS='APPROVED'
UNION ALL SELECT 'beg_recv', SUM(RECV_AMT) FROM TB_BEG WHERE STUDENT_USER_ID='stu_demo' AND REQ_STTS='ACCEPT'
UNION ALL SELECT 'beg_used', SUM(PAY_AMT) FROM TB_PAY_DTL WHERE USER_ID='stu_demo' AND PAY_MEANS='BEG' AND PAY_STTS='APPROVED'
```
- friend/nudge/school 비교도 UNION ALL(나/학교평균/충북평균 등) **한 문장**.
- 나머지(catSpend/channel/merchantBreakdown/parentCard/merchantMap)는 원래 단일 GROUP BY/SELECT라 그대로 1문장.
- **SQL hover의 `sql`**: 이 단일 문장 그대로(여러 문장 join 금지).
- 루트 `queries.sql`(실 MySQL용)도 단일 문장 기준으로 정리.

### 8.5 그 외 질문 — Claude 경량 NL→SQL
- system 프롬프트(작음, 데이터셋 없음):
```
너는 '오페리아' NL2SQL 에이전트. 질문을 alasql 호환 SELECT 한 문장으로만 변환해 출력한다.
SQL 외 텍스트 금지. DATE_FORMAT 금지(월은 SUBSTR(PAY_DT,1,7)). 대상 USER_ID='stu_demo'.
[스키마] TB_COM_USER(USER_ID,USER_TYPE,SCH_NM,GRADE) / TB_COM_VOUCHER(MERCHANT_NO,MERCHANT_NM,BIZ_ITEM_NM,ADDR,LAT,LNG) / TB_PAY_DTL(USER_ID,MERCHANT_NO,PAY_AMT,PAY_MEANS,PAY_CHANNEL,PAY_STTS,PAY_DT) / TB_BEG(STUDENT_USER_ID,REQ_AMT,RECV_AMT,REQ_STTS,REQ_DT)
```
- 반환 SQL → alasql 실행 → rows → result(rows 그대로) → ChartRenderer `table`.
- 파싱 가드: SQL 비었거나 SELECT 아니면 throw. alasql 실행 예외 → throw(→ 화면 에러).
- **키 게이팅(보안)**: `VITE_ANTHROPIC_API_KEY`가 비어 있으면 **Claude 호출을 시도하지 않고** "아직 지원하지 않는 질문이에요" 친절 메시지 반환(에러 아님). → 배포본은 키 없이도 안전하게 동작.

### 8.8 10개 intent도 Claude가 SQL 생성 (템플릿은 폴백)
알려진 10개 intent도 고정 템플릿 대신 **Claude NL→SQL**을 사용한다. 키 유무가 자연스럽게 dev/prod를 가른다(키 없는 prod 빌드는 자동 템플릿).
- **조건**: 키 있음(`VITE_ANTHROPIC_API_KEY`) AND `VITE_OPERIA_AI`. (`import.meta.env.DEV` 조건 불필요 — 키 게이팅으로 충분)
- **동작**:
  1. 해당 intent의 **출력 계약**(shaper가 기대하는 **단일 SQL의 출력 컬럼**)을 프롬프트에 명시. 기존 템플릿 SQL(단일 문장)을 **reference**로 함께 제공.
  2. Claude는 **단일 SQL 1문장**(UNION ALL 허용, 여러 `SELECT;` 금지)을 동일 출력 컬럼으로 반환.
  3. 그 SQL을 alasql 실행 → **기존 shaper 그대로** 조립 → result.
  4. SQL hover엔 **Claude가 만든 SQL** 노출.
- **폴백(안정장치)**: Claude 응답 파싱 실패 / alasql 오류 / 필수 컬럼 누락 → **고정 템플릿으로 자동 폴백**(데모 안 깨짐).
- **키 없음 / prod 빌드**: 항상 고정 템플릿(결정적·키 무관).
- **출처 표시(`source`)**: 응답에 `source` 포함 → `claude`(AI SQL 성공) / `fallback`(Claude 시도 실패→템플릿) / `template`(키 없음·prod) / `mock` / `api`(실서버). **폴백을 화면에서 알 수 있게** §9.5에서 노출.

### 8.6 구현 위치
- `src/api/operia.js`: 모드 분기 + intent 분기(템플릿 vs Claude) + alasql 실행 + shaper 호출.
  - intent 분기 세부: **키 있음+VITE_OPERIA_AI → Claude sqls(폴백 템플릿)** / 그 외 → 템플릿(§8.8).
- Claude 호출은 `claude.js` 저수준 재사용/별도 함수(자유대화 `window.claude.complete`와 분리). 키 `VITE_ANTHROPIC_API_KEY` 재사용.
- chart.type은 프론트 `INTENT_CHART`가 결정(§3.1).

### 8.7 전환 안전성
- 시뮬(B)은 `queryOperia` 계약 뒤 → `VITE_OPERIA_API` 설정 시 우회. 프론트 무수정.
- 실 오페리아가 §1/§5 result 형태를 따르도록 **본 문서를 응답 계약으로 전달**. 다르면 operia.js 어댑터 1곳.
- dataset.json은 **edupay_db 더미데이터로 그대로 재활용**(빈 DB 시드). 템플릿 SQL은 실 MySQL용으로 `queries.sql`에 이미 존재.

---

## 9. SQL 노출 (hover/탭으로 생성 쿼리 보기)
데이터 카드에서 **AI가 만든 SQL을 보여줘** NL2SQL 동작을 투명하게 드러낸다. result는 이 SQL에 일관된 값이다.

### 9.1 데이터 흐름
- `send()`가 응답의 `sql`을 메시지 객체에 함께 저장: `{ chartType, result, sql, scope }`.
- `Bubble → ChartRenderer` 로 `sql` 전달.

### 9.2 UI
- 각 데이터 카드 **우상단에 작은 칩** `</> SQL`.
- **데스크탑: hover**, **모바일/WebView: 탭** 으로 팝오버 토글(둘 다 지원 — 터치엔 hover 없음).
- 팝오버: 모노스페이스, 다크 배경, 길면 스크롤. 바깥 탭/ESC로 닫힘.
- `sql`이 없으면 칩 숨김.

### 9.3 AI 일관성 (§8 보강)
- 시스템 프롬프트에 **"result는 반드시 sql 쿼리가 반환했을 결과와 일치(컬럼/집계/필터 의미 일관)"** 를 명시.

### 9.4 전환 안전성
- 실 오페리아도 `sql`을 반환하므로(NL2SQL) UI 그대로 동작. 칩은 응답의 `sql` 유무만 본다.

### 9.5 출처(source) 표시 — 폴백 가시화
- `send()`가 응답의 `source`도 메시지에 저장 → ChartRenderer로 전달.
- SQL 칩 라벨/색으로 출처 구분:
  - `claude` → `</> AI SQL`
  - `fallback` → `⚠️ 템플릿(폴백)` (주황 톤) — **Claude 시도 실패로 템플릿 사용됨을 명시**
  - `template` → `</> 템플릿`
  - `api` → `</> SQL` (실 오페리아)
  - `mock` → `</> 목업`
- 팝오버 상단에 출처 한 줄(예: "출처: Claude 생성 / 폴백: 템플릿") 표기.
- (선택) dev에서 폴백 시 토스트 "⚠️ 템플릿 폴백 · {intent}".

### 9.6 쿼리 결과(result) 함께 노출 — 차트 검증
SQL만이 아니라 **그 쿼리가 낸 result(차트가 실제로 쓴 데이터)**도 팝오버에 보여 "쿼리→결과→차트" 일치를 눈으로 검증.
- 팝오버를 **2단(또는 탭)**: ① `SQL` ② `결과(result)`.
- 결과 표시:
  - rows 배열 → **작은 표**(컬럼 자동 추출). object(report의 `{trend,byMeans}` 등) → **pretty JSON**(`JSON.stringify(result,null,2)`, 모노스페이스·스크롤).
- 데이터 추가 배선 불필요 — 카드가 받은 `result` 그대로 표시(차트와 동일 소스).
- 길면 스크롤, 바깥탭/ESC 닫힘(기존 팝오버 규칙 유지).

---

## 10. 배포 보안 프로파일 (공개 URL 매핑용)
공개 배포본 번들에 **Claude API 키가 들어가면 누구나 추출 가능** → 공개 URL엔 키를 절대 넣지 않는다.
**런타임 토글이 아니라 빌드 환경으로 끈다**(토글은 코드에 키가 남지만, 빌드 시 키를 비우면 번들에 키 자체가 없음).

### 10.1 환경 프로파일 두 개
| 변수 | 개발/테스트(.env) | **배포(.env.production)** |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | (테스트용 저한도 키) | **빈값** (번들 미포함) |
| `VITE_AI_ENABLED` (자유대화) | true(테스트 시) | **false** |
| `VITE_OPERIA_AI` (시뮬) | true | **true** (alasql 템플릿용 — 키 무관) |
| `VITE_OPERIA_API` (실서버) | 비움 | 비움(나중에 오페리아 URL) |

- Vite는 `vite build`가 `.env.production`을 로드 → 배포본엔 키 없음.

### 10.2 배포본 동작 (키 없음)
- **10개 질의**: alasql 고정 템플릿 → 정상 동작(키 불필요). ✅ 데모 핵심 유지.
- **새 자유 데이터 질문**: 키 없으니 Claude 호출 안 함 → "아직 지원하지 않는 질문" 메시지(§8.5 게이팅).
- **자유 대화(기타)**: `VITE_AI_ENABLED=false` → 로컬 fallback. AI 토글 UI도 미노출(§config: aiFeature=false).
- 결과: **번들·네트워크 어디에도 Claude 키/호출 없음.** 공개 URL 매핑 안전.

### 10.3 검증
- `dist/` 빌드 후 `grep -r "sk-ant" dist/` → **0건**이어야 함.
- 배포본에서 데이터질문 10개 정상, 자유질문은 친절 메시지, 네트워크 탭에 api.anthropic.com 호출 없음 확인.

### 10.4 추후 (공개 배포에서 Claude 쓰려면)
- 유일한 안전 방법 = **백엔드 챗 프록시**(키 서버 보관, 앱은 서버 경유). 그 전까지 공개 배포는 Claude off.
