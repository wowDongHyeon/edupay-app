# 카드 템플릿 레지스트리 설계 (질의↔템플릿 N:1, 편집 가능)

팀장 피드백: 질의별로 흩어진 카드를 **템플릿 단위로 묶어 한 곳에서 편집** 가능하게, 그리고 **질의↔템플릿 1:1이 아니라 N:1**(여러 질문 → 한 템플릿)로. 템플릿은 공통·동적(파라미터).

## 0. 결정
- 템플릿 = **카드 설정 전체**(시각 + 제목/부제/배지/💡문구/필드매핑). 표현 텍스트를 컴포넌트에서 빼서 config로.
- 편집 주체 = **개발자** → config는 **JS 파일**(함수 허용: 제목/insight를 데이터 함수로).
- N:1 허용: 여러 intent가 같은 template 재사용(예: friendCompare·schoolCompare → `compare`).

## 1. 3계층 분리
```
① 데이터   : src/mock/operia/queries.js (shaper) — DB rows → '템플릿 표준 데이터'로 정규화
② 표현config: src/charts/intentConfig.js   — intent별 {template, title, subtitle, fields, insight…}  ★편집 지점★
③ 템플릿   : src/charts/templates/*         — (data, config) → 렌더. 제네릭·재사용. 텍스트/필드 하드코딩 없음
```
ChartRenderer: `INTENT_CONFIG[intent]` 조회 → `template` 선택 → `<Template data={result} config={cfg}/>`. 없으면 `table`.

## 2. 템플릿 세트 (제네릭)
| templateId | 용도 | data 표준형(예) |
|---|---|---|
| `bar` | 시계열/카테고리 막대(+옵션 breakdown 바) | `{ series:[{label,value}], breakdown?:[{label,value,pct}] }` |
| `donut` | 비중 도넛 | `{ slices:[{label,value,pct}], total }` |
| `barlist` | 가로 바 리스트(비율, 랭킹 옵션) | `{ items:[{label,value,pct,rank?,me?}] }` |
| `statList` | 라벨+서브+값 항목 리스트(합계 없음) | `{ items:[{label,sub,value,unit?}] }` |
| `compare` | 나 vs 평균/또래 비교(랭킹 옵션) | `{ bars:[{label,value,me?,rank?}], note? }` |
| `trend` | 이번값 vs 이전값 박스 + 월별 추이 | `{ current,prev,delta, monthly:[{label,count?,value}] }` |
| `txList` | 요약(스택바/박스) + 개별 거래 리스트 | `{ groups:[{key,label,amount,count,pct}], rows:[{group,item,amount,date}] }` |
| `map` | 지도 + 가맹점 | `{ center, items:[{name,category,addr,lat,lng,dist}] }` |
| `table` | 폴백 범용 표 | rows[] |

> 특수했던 카드 흡수: schoolRank → `barlist`(rank·me 옵션) / friend → `compare` / nudgeTrend → `trend` / balanceList → `statList` / channel → `txList` / merchantMap → `map`.

## 3. intentConfig 스키마 (편집 지점, 예시)
```js
// src/charts/intentConfig.js
export const INTENT_CONFIG = {
  report: {
    template: "bar",
    title: "월별 사용 내역", subtitle: "FOX PAY 결제 · 월별 추이", badge: "최근 3개월",
    options: { toggle: ["month", "day"], breakdown: true },
    insight: (d) => d.cur >= d.prev
      ? `${d.prevLabel}보다 ${won(d.cur-d.prev)} 더 썼어. 다음 달엔 조금 아껴볼까? 💪`
      : `${d.prevLabel}보다 ${won(d.prev-d.cur)} 덜 썼어. 잘하고 있어 👏`,
  },
  catSpend:        { template:"donut",   title:"사용처별 내역", subtitle:"업종별 비중", badge:"최근 3개월", insight:(d)=>`${d.top.label}이(가) 가장 커 (${d.top.pct}%)` },
  merchantBreakdown:{ template:"barlist", title:"어디에 주로 썼나", subtitle:"가맹점별 비율" },
  friendCompare:   { template:"compare", title:"친구 비교", subtitle:"같은 학교·학년 / 충북 평균" },
  schoolCompare:   { template:"barlist", title:"학교별 사용 비교", subtitle:"충청북도 중학교 TOP5", options:{ rank:true, me:true, avgRow:true } },
  nudgeCompare:    { template:"trend",   title:"내 조르기 추이", subtitle:"이번 달 vs 지난달 · 월별 충전 요청" },
  balance:         { template:"statList",title:"지금 쓸 수 있는 금액", subtitle:"항목별 남은 금액 · 합산되지 않아요", badge:"이번 달",
                     insight:()=>"바우처와 용돈 충전금은 따로 관리돼요. 포인트는 결제와 별개로 쌓이는 거예요!" },
  channel:         { template:"txList",  title:"온·오프라인 결제 내역", subtitle:"결제 채널별", badge:"이번 달" },
  parentCard:      { template:"list",    title:"부모 카드 사용 내역", subtitle:"앱카드(보호자 신용카드)" },
  merchantMap:     { template:"map",     title:"사용 가능 가맹점", subtitle:"FOX PAY 학생복지 가맹점 · 가까운 순", badge:"내 주변" },
};
```
- **N:1**: 같은 `template`을 여러 intent가 공유. 새 질문 추가 = config 한 줄(같은 템플릿 재사용) + (필요시) shaper.
- 제목·문구·필드·옵션은 **여기서만** 편집.

## 4. 데이터 정규화 규칙 (queries.js shaper)
- shaper는 각 intent를 **그 template의 data 표준형**(§2)으로 반환. 템플릿은 표준형만 알면 됨(intent 모름).
- 예: report shaper → `{ series:[{label:"4월",value:43000}…], breakdown:[{label:"바우처",value,pct}…] }`.
- 표준형 키가 같으면 N:1 자연 성립(여러 질문이 같은 모양 → 같은 템플릿).

## 5. 마이그레이션 (기존 → 신규)
1. `charts/cards.jsx`의 렌더러들을 **제네릭 템플릿(`charts/templates/*`)**으로 일반화(텍스트/필드 제거 → config·data 주입).
2. 하드코딩 제목/부제/💡문구 → `intentConfig.js`로 이동.
3. `queries.js` shaper 출력 → 각 template 표준형으로 정규화.
4. `registry.js`(INTENT_CHART)는 `intentConfig.js`로 통합(또는 INTENT_CONFIG에서 template만 뽑아 쓰는 호환 래퍼).
5. ChartRenderer: config 기반 디스패치.

## 6. 검증
- 10개 질의 전부 기존과 동일하게 렌더(회귀). 제목/문구/숫자 동일.
- N:1 데모: friend/school 또는 임의 두 질문이 같은 template으로 그려지는지 1건 확인.
- "config의 제목/문구를 바꾸면 화면이 바뀌는지"(편집성) 1건 확인.
- npm run build 통과.

## 7. 비고
- 특수 레이아웃(map 등)은 제네릭화 한계가 있으니 named template으로 유지하되, 텍스트/옵션은 config로.
- 데이터 로직(SQL/shaper)은 이 작업 범위 아님(표현/템플릿 분리만). 단 표준형 정규화는 포함.

---

## 8. 운영 가이드 — 카드/질문 추가하기 (구현 반영)
> **편집 한 곳 = `src/charts/intentConfig.js`.** 대부분의 추가는 새 템플릿 없이 config로 끝난다(N:1).
> 흐름 복습: `질문 → cardIntent(정규식) → intent → INTENT_CONFIG[intent].template → templates/<id>` 렌더. 데이터는 `queryOperia(intent) → SQL → shaper(표준형)`.

### 8.A 새 질문/카드 추가 — **기존 템플릿 재사용(가장 흔함, 새 템플릿 불필요)**
예) "이번 주 교통비 비중"을 catSpend와 같은 `donut`으로 보여주고 싶다.
1. **`src/App.jsx` `cardIntent(q)`** — "이 질문 → 이 intent" **정규식 한 줄** 추가. (의도 판단; 표현/데이터 레이어 '밖'의 유일한 수정 지점)
2. **`src/mock/operia/queries.js`** — 그 intent의 `{ sql, shape }` 추가. `shape`는 **대상 템플릿의 §2 표준형**을 반환(단일 SQL 규칙 유지).
3. **`src/charts/intentConfig.js`** — intent 블록 추가: `{ template:"donut", title, subtitle, badge, options?, insight? }`. ★표현은 여기만★
4. 끝 — ChartRenderer가 `INTENT_CONFIG[intent].template`로 자동 디스패치.
- ※ 같은 모양을 여러 질문으로 늘리는 건 위 1~3만. 템플릿/렌더 코드는 안 건드림(N:1).

### 8.B 새 시각 템플릿 추가 — **새 차트 형태가 필요할 때만(드묾)**
1. **`src/charts/templates/<id>.jsx`** 생성 — `export function XTemplate({ data, config })`. **(data, config)만 소비.** 사용자 텍스트는 `config.title/subtitle/badge/insight`·`config.options`에서, 데이터는 **§2 표준형 1개**에서. 텍스트/필드 하드코딩 금지(구조 문구도 `config.options`로).
2. **`src/charts/templates/index.js`** — `TEMPLATES`에 등록(`<id>: XTemplate`). **이걸 빠뜨리면 ChartRenderer가 못 찾아 `table`로 폴백된다.**
3. **`src/charts/intentConfig.js`** — 그 템플릿을 쓸 intent에 `template:"<id>"`.
4. **`src/mock/operia/queries.js`** — shape가 그 템플릿 표준형을 내도록.
5. (§2 표에 표준형 한 줄 추가 권장 — 문서 동기화)

### 8.C 표현만 수정 — **운영 일상 작업**
- 제목·부제·배지·💡문구·옵션(색/아이콘/limit 등) 변경 → **`src/charts/intentConfig.js` 한 곳**만 수정 후 재배포.

### 8.D 안전장치 · 주의
- config에 intent가 없거나 `template` id 오타 → 자동 **`table` 폴백**(화면 안 깨짐).
- 새 질문의 '의도 분류'는 `cardIntent` **정규식**이라 거기만 코드 수정(정규식이 못 잡는 자유 질문은 Claude NL→SQL → table). 향후 이 라우팅 규칙도 설정 파일로 빼면 운영성 ↑ (개선 후보).
- `report`처럼 **탭 토글/lazy**가 있는 카드는 `ChartRenderer`의 orchestrator(`ReportToggleCard`) 분기를 함께 본다 — 일반 카드엔 해당 없음.
- 추가 후 회귀 체크: 질문→카드 렌더, SQL칩/결과탭, `npm run build`. (기존 10개는 리팩터 전 baseline 텍스트와 100% 일치로 검증함)
