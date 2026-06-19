# edupay-app 작업 공통 규격 (WORKFLOW)

이 프로젝트의 모든 개발 작업이 따르는 공통 규격. (IHB_WEB 작업 방식 → Vite+React 스택에 적응)
세 개의 하네스: ① 역할 분리(설계↔개발) ② 표준 루프(개발↔Playwright 검증) ③ graphify(컨텍스트 절약).

---

## 1. 역할 분리 (하네스 ①)
- **Cowork(Claude in Cowork)**: 분석, 패턴 설계, 설계서(.md) 작성, **CLI 프롬프트 작성**. 코드 파일은 직접 만들지 않는다.
- **Claude Code CLI**: 실제 파일 생성/수정 + **Playwright 검증**.

---

## 2. 표준 개발 루프 (하네스 ②) — 항상 적용
1. **Cowork 분석·설계** — 캡처/명세/스키마 기반 분석 → 설계서(.md) 작성(§5 체크리스트).
2. **Cowork → CLI 프롬프트** — **첫 줄 `graphify query "..."`**, 목적·교체지점(DEV MOCK)·검증조건 명시(§4 템플릿).
3. **CLI 코드 작성** — 설계서 + graphify + CLAUDE.md 보고 구현.
4. **CLI Playwright 검증** — dev 서버(localhost:5173) 진입, 시나리오 실행, **스크린샷 분석**(§6).
5. **불일치 → CLI 재작성** (3↔4 루프) — 갭 하나씩. 구조 깨지면 `git` 롤백 후 재시작.
6. **완료** — 기능 단위 끝나면 마일스톤 현황 갱신(§8). **`graphify update`는 자동 실행하지 않는다**(§3).

> `graphify update`(그래프 갱신)는 느리다 → **자동/매 완료 시 실행 금지.** 사용자가 명시적으로 지시할 때만(§3).

---

## 3. graphify 규칙 (하네스 ③ — 컨텍스트 절약)
graphify는 **CLI 환경 전용** CLI 도구(Cowork엔 없음). 코드그래프 `graphify-out/`.

- 코드베이스 질문은 **먼저 `graphify query "<질문>"`** (graphify-out/graph.json 있을 때). 관계는 `graphify path "<A>" "<B>"`, 개념은 `graphify explain "<개념>"`. raw grep/전체 리포트보다 작은 스코프 서브그래프 반환.
- 넓은 탐색은 `graphify-out/wiki/index.md` 우선. 아키텍처 전반 검토 시에만 `GRAPH_REPORT.md`.
- `graphify query/path/explain`(조회)는 가볍다 → 작업 시작 시 자유롭게 사용.
- **`graphify update .`(그래프 갱신)는 느리다 → 자동 실행 금지. 사용자가 "graphify 업데이트해"라고 지시할 때만** 실행(여러 변경 누적 후 한 번에).
- 최초 1회: `graphify init .`로 `graphify-out/` 생성.

타이밍: **update는 수동(사용자 지시)만.** 작업 중엔 query만 쓰고 update는 미룬다.

---

## 4. CLI 프롬프트 공통 템플릿 (복붙용)
모든 CLI 프롬프트는 이 골격을 따른다. **첫 줄은 항상 graphify query.**

```
graphify query "<이번 작업과 관련된 질문 — 예: 데이터 질문 카드 렌더 흐름>"

## 목적
<한두 줄. 무엇을 왜>

## 작업
설계서: edupay-app/<설계서>.md 를 먼저 읽고 그대로 구현.
<핵심 지시 — 세부는 설계서/ graphify/ CLAUDE.md 참조>

## DEV MOCK / 교체지점
<백엔드 미연동부는 목업으로. 교체 지점을 [DEV MOCK] 주석으로 표시 — §8>

## 절대 보존
<건드리면 안 되는 것 — 예: 자유대화 Claude 경로, AI 토글 로직>

## 검증 (Playwright, 반드시 foreground)
- npm run dev (이미 떠 있으면 재사용) → http://localhost:5173
- <시나리오: 어떤 질문/클릭 → 기대 화면>
- 스크린샷 저장 후 Read로 분석. 실패 시 수정-재검증 반복(통과까지).

## 완료
- 통과 시 WORKFLOW.md §8 마일스톤 현황 갱신. (`graphify update`는 실행하지 말 것 — 사용자가 따로 지시할 때만)
```

원칙: **목적·의도만 간결히**. 세부 구현은 CLI가 graphify+설계서 보고 판단. 한 번에 갭 하나.

---

## 5. 설계서 필수 구성 체크리스트 (Cowork이 설계서 만들 때)
신규 화면/기능 설계서에 아래를 빠짐없이 포함:
1. **목적/범위** — 무엇을, 어디(파일), 왜.
2. **데이터 계약** — 입력/출력 형태(예: 오페리아 `result` 스키마), 목업 위치.
3. **컴포넌트/모듈 설계** — 새 파일 목록·역할, 기존과의 연결(import 지점).
4. **상태/이벤트** — 상태 구조, 주요 인터랙션.
5. **DEV MOCK 교체지점** — 목업↔실연동 스위치 위치(예: `VITE_OPERIA_API`).
6. **절대 보존 항목** — 회귀 방지(건드리면 안 되는 기존 동작).
7. **Playwright 검증 시나리오** — 질문/클릭 → 기대 화면, 스크린샷 포인트.
8. **전환(실연동) 메모** — 나중에 실제 API/DB로 바꿀 때 할 일.

---

## 6. Playwright 검증 규격 (edupay-app)
### 환경
- 서버: `npm run dev` → `http://localhost:5173` (이미 실행 중이면 재사용)
- 브라우저: chromium 또는 시스템 chrome(`channel="chrome"`)
- WebView 모드 확인 시 URL: `http://localhost:5173/?view=webview`
- 스크린샷 저장: `C:/Users/Public/edupay_<name>.png` (Read 툴로 바로 읽기)

### 채팅 진입/질문 패턴
- 입력창: `input[placeholder="메시지를 입력하세요"]` → `.fill(질문)` → `.press("Enter")`
- 인트로면 "시작하기" 클릭 후 메뉴/채팅 진입.
- 응답 카드 렌더 대기(타이핑 인디케이터 사라질 때까지) 후 스크린샷.

### 데이터 질문 10개 회귀 체크 (차트 렌더)
월별→bar / 사용처별→donut / 친구비교→compare / 조르기비교→compare / 근처가맹점→map /
남은금액→gauge / 온오프라인→donut / 어디에주로→barlist / 부모카드→list / 학교별→compare.
+ 매칭 안 되는 잡담 → 기타(자유대화) 경로(AI OFF면 로컬) 회귀 확인.

### 빌드 확인
- `npm run build` 통과 여부도 완료 기준에 포함.

---

## 7. DEV MOCK 패턴 (백엔드 미연동)
- 데이터 질문 = 오페리아 API(목업). 상세: `edupay-app/MOCK_API_설계.md`.
- 실 호출부는 교체 지점을 명확히. 예:
```js
// ↓↓↓ [DEV MOCK] 오페리아 연동 시 VITE_OPERIA_API 설정만으로 실 호출 전환 ↓↓↓
const resp = await queryOperia(intent, scope);   // operia.js가 목업/실API 분기
// ↑↑↑ [DEV MOCK] END ↑↑↑
```
- 차트 유형은 응답이 아니라 프론트가 결정(`INTENT_CHART`, 질문 기반).

---

## 8. 마일스톤 완료 현황
> 기능 단위 완료 시 체크. **`graphify update`는 사용자 지시 시에만**(자동 금지). (Cowork이 설계/프롬프트 단계 표시, CLI가 구현/검증 표시)

- [x] 프로토타입 → Vite+React 이식 (스캐폴드 + 9개 모듈 ES모듈화)
- [x] WebView 모드(`?view=webview`) — 헤더 숨김/메뉴 직행
- [x] 자유대화 Claude 직접 호출(시연용) + AI 기능 플래그(`VITE_AI_ENABLED`)
- [x] 오페리아 목업 연동 — operia.js + mock 10개 + 차트 레지스트리(INTENT_CHART) + ChartRenderer(default table) **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] 오페리아 시뮬 모드(§8 옵션 B — 프론트 alasql 실행) — `VITE_OPERIA_AI`. 알려진 10개 intent는 고정 SQL 템플릿(queries.js)을 **alasql이 dataset.json 위에서 실제 집계**(Claude 호출 없음·결정적·일관), 그 외 데이터질문은 Claude 경량 NL→SQL(데이터셋 미주입)→alasql→table. SQL 칩(hover/탭) 노출. 우선순위 실서버>AI>목업, 실패 throw(폴백금지) **(CLI 구현·Playwright 검증 완료 2026-06-18)**
  - ※ 폐기: 옵션 A(데이터셋 프롬프트 주입 후 Claude가 result 생성) — 무겁고 JSON 파싱 불안정 → B로 대체.
- [x] 배포 보안 프로파일(Claude off 빌드, §10) — `.env.production`(키 빈값·`VITE_AI_ENABLED=false`)로 **빌드 시 키를 번들에서 제외**. 키 게이팅(operia.js: 키 없으면 자유 데이터질문은 Claude 호출 없이 친절 안내). 10개 alasql 템플릿은 키 무관 정상. 검증: `grep sk-ant dist/`=0, anthropic 호출 0, dev(키)에선 NL→SQL 정상 **(Playwright 검증 완료 2026-06-18)**
- [x] 10개 intent도 Claude NL→SQL(키 게이팅, 템플릿 폴백) (§8.8) — 키 있음+`VITE_OPERIA_AI` → 각 intent의 출력 계약(sqls 키·컬럼)+템플릿 reference를 프롬프트로 주고 Claude가 **동일 구조 sqls** 생성 → alasql 실행 → **기존 shaper 그대로** → SQL 칩에 Claude SQL. 파싱/실행/컬럼 누락 시 **고정 템플릿 자동 폴백**(throw 아님). 키 없음/prod 빌드는 항상 템플릿(결정적). 검증: dev(키) 10개 Claude SQL·차트 정상·일관성(월별합=사용처별합 290,100), 폴백(잘못된 모델) 10건 모두 템플릿 복귀·차트 정상, prod(`.env.production`) anthropic 호출 0·`grep sk-ant dist/`=0 **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] 응답 source 표시(폴백 가시화) (§8.8 source/§9.5) — operia.js 모든 응답에 `source` 포함: `claude`(AI SQL 성공)/`fallback`(키 있어 Claude 시도했으나 파싱·alasql·컬럼누락으로 템플릿)/`template`(키 없음·prod)/`mock`/`api`. send()가 메시지에 저장→Bubble→ChartRenderer 전달. SQL 칩 라벨·색 분기: claude→`</> AI SQL`, fallback→`⚠️ 템플릿(폴백)`(주황), template→`</> 템플릿`, api→`</> SQL`, mock→`</> 목업`. 팝오버 상단 출처 한 줄, dev 폴백 토스트. 검증: dev(키) 칩 "AI SQL", 잘못된 모델 유도 시 "⚠️ 템플릿(폴백)"(주황·출처 문구), prod(키 없음) "템플릿"·anthropic 0·`grep sk-ant dist/`=0 **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] SQL 칩에 쿼리 결과(result) 동시 노출 (§9.6) — 팝오버 2단 탭 `SQL`/`결과`. result는 카드가 받은 값 그대로(추가 배선 없음·차트와 동일 소스): rows 배열→컬럼 자동추출 작은 표(숫자 천단위 콤마), object(report `{trend,byMeans}` 등)→pretty JSON(`JSON.stringify(.,null,2)`). 기존 규칙 유지(길면 스크롤·바깥탭/ESC 닫힘·source 라벨/색 §9.5). "쿼리→결과→차트" 일치 검증용. 검증: dev 월별(object→JSON: trend 110300/97100/82700, 합 290,100=막대), 채널(rows→표: OFFLINE 192,200·66% / ONLINE 97,900·13건 == 도넛·인사이트 일치) **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] SQL 결과 탭=raw rows(리스트) 표시 (§9.6) — operia.js가 shaper 가공 전의 'SQL이 실제 낸 행'을 `rawRows`로 응답에 포함(단일 SQL intent→행 리스트 `[{…},…]`, 복합 intent→`{key:[행]}` sqls 키와 동일). result(가공 object/rows)는 차트용으로 그대로 유지. send()→ChartRenderer→SqlChip 전달. 결과 탭은 rawRows를 표(복합이면 키별 작은 표)로 = SQL 결과 그대로, 가공 result는 "가공 결과(차트 입력) 보기" 접기 섹션으로 보조. 검증: balance→키별 표(voucherUsed used 201,000 / begRecv received 65,000 / begUsed used 51,200), report→trend(110,300/97,100/82,700)·byMeans 행 리스트(막대 값과 일치), channel→단일 표(channel/amount/cnt = shaper 전 raw) **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] intent당 단일 SQL(UNION ALL 허용)로 통일 — 실 오페리아 1요청=1쿼리 계약 (§8.4) — queries.js 각 intent를 `{ sql(1문장), shape(rows) }`로 변경(여러 `SELECT;` 나열 제거). report=월×수단 GROUP BY 한 쿼리→shape가 trend/byMeans 파생, balance=UNION ALL(voucher_used/beg_recv/beg_used), friend/nudge=UNION ALL(나·학생별 합/평균·월별)→shape가 평균·백분위 계산(alasql 스칼라 상관 서브쿼리 미지원이라 분포 행을 받아 shape에서 계산), 나머지는 기존 단일 GROUP BY 유지. operia.js: 단일 sql 1회 실행→rows→shape, rawRows=그 단일 rows 한 세트, 응답 sql=그 단일 문장. Claude 경로(§8.8): 단일 SQL 컬럼 계약+reference→'단일 SELECT 1문장'(UNION ALL 허용, 다중문장 거부)만 반환, 폴백 동일. 검증: 10개 shape 값=기존과 동일(node, report 290,100=catSpend 290,100 일관성 PASS), dev(Claude) 10개 모두 단일문장(friend/nudge/balance는 UNION ALL)·차트 정상·결과탭 표 1개·anthropic 10, prod(키없음 템플릿) 단일문장·anthropic 0·`grep sk-ant dist/`=0 **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] WebView=채팅 직행 + `?q=` 자동전송 — `?view=webview`는 MenuScreen 건너뛰고 채팅 셸부터, URL `?q=<질문>`이 있으면 최초 1회 자동 send. 일반 모드 Intro→Menu→Chat 회귀 유지. back 버튼은 빈 채팅 셸로 초기화 **(Playwright 검증 완료 2026-06-18)**
- [x] WebView 빈 상태=채팅 셸(추천칩+빈대화), WelcomeScreen 미표시 — App.jsx 채팅 분기에서 WEBVIEW일 때: FavoritesBar(상단 추천칩)를 `(started || WEBVIEW)`로 메시지 없어도 노출, 본문은 항상 메시지 스크롤 영역(0개면 빈 채로) 렌더 → `(!started && !WEBVIEW)`일 때만 WelcomeScreen. 일반 모드는 기존 `!started→WelcomeScreen` 보존. QuickReplyPanel·입력창·`?q=` 자동전송·헤더숨김/back 동작 유지. 검증: `?view=webview`→상단 칩+빈 대화영역+자주묻는질문+입력창(버블 0개·WelcomeScreen 없음), `?view=webview&q=`→자동전송 카드 정상, 일반 `/`→Intro(시작하기) 회귀 정상 **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] SQL 팝오버 클릭토글화(X 닫기 버그 수정) — 기존 `open = hover || pinned`이라 X로 `pinned=false` 해도 데스크탑에서 hover가 살아 안 닫히던 버그 → `open = pinned`로 단일화(hover 상태·mouseEnter/Leave 제거). 칩 클릭=토글, X=닫기, 바깥 pointerdown·ESC 닫기 유지(데스크탑·모바일 동일). 팝오버 SQL/결과 탭·rawRows/source·sql없으면 칩숨김 보존. 검증: desktop·webview 모두 열기/X닫기/재클릭토글/바깥클릭/ESC 전부 PASS **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] 잔액 카드 설계 반영(합계 제거·3항목·음수 수정) (§5 ⑥) — 합계 박스/도넛 게이지 제거, 항목 3개(바우처 지원금/용돈 충전금/에듀포인트)의 '남은 금액'만 표시(합산 안 함). dataset.json: stu_demo VOUCHER 승인합 201,000→56,200(한도 100,000 이하·잔액 43,800), BEG(충전금) 사용 51,200→20,000(수령 65,000·잔액 45,000), TB_COM_USER stu_demo에 POINT_BAL=1000 추가(다른 학생·CANCELED·APPCARD·타 쿼리 일관 유지—report 114,100=catSpend 114,100 PASS). queries.js balance: 단일 SQL UNION ALL(voucher_used/charge_recv/charge_used/points)→shape `{voucher,charge,points}`(totalAvailable 제거, 음수 방어 `pos()`). registry balance→`balanceList`, cards.jsx `GaugeChartCard`→`BalanceListCard`(제목"지금 쓸 수 있는 금액"·부제"항목별 남은 금액·합산되지 않아요"·💡안내). operia.js 스키마에 POINT_BAL 추가. 검증: 카드 3항목 양수(43,800/45,000/1,000P)·합계박스 없음·음수 없음, SQL 결과탭 단일 rows(voucher used 56,200≤100,000), 월별 회귀 정상 **(CLI 구현·Playwright 검증 완료 2026-06-18)**
- [x] 소비 리포트 카드 월별/일별 탭 토글(일별 lazy·캐시·in-place) — 한 카드 안에서 월별(최근 3개월, 초기 로드)↔일별(최근 활동 7일) 전환. ChartRenderer가 report(bar)일 때 `ReportToggleCard`로 렌더: 탭 상태·일별 캐시·로딩/에러 보유, SqlChip은 활성 탭의 sql/source/rawRows로 동기화. 일별 '최초 1회'만 `onCardQuery("최근 7일 사용 내역을 일별로 알려줘","reportDaily")` 전송→카드 로컬 캐시, 이후 토글은 네트워크 없이 즉시(월·일 양쪽 캐시). `cardQuery`(App)는 setMessages 안 함→**새 말풍선/대화턴 없음**. **NL 텍스트가 본 신호**(실 오페리아는 question만 받도록 operia.js BASE 분기에 question 추가), `reportDaily` hint는 시뮬 템플릿/컬럼계약/폴백 라우팅용. queries.js `reportDaily`=단일 SQL(`GROUP BY SUBSTR(PAY_DT,1,10) ORDER BY day DESC LIMIT 7`, 달력 아닌 '활동 7일'·0원 미충전). BarChartCard에 탭 UI·일별 라벨(`dayLabel`)·로딩 스피너·에러+재시도 추가. 검증: dev(Claude) 일별 최초 +1 요청·이후 토글 0(캐시)·말풍선 1 유지·SQL칩 일별 SQL 동기화, prod(템플릿) 일별 anthropic 0·`grep sk-ant dist/`=0 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [x] SQL 칩을 카드 밖(어시스턴트 아바타 아래)으로 분리 + 활성 탭 동기화 — 카드 안에는 칩 미표시(화면설계대로 깔끔). ChartRenderer는 카드만 렌더, SqlChip은 export해서 App.jsx Bubble이 아바타 라인(메시지 좌측, 카드 아래)에 렌더. 리포트(월/일 토글) 카드는 `ReportToggleCard`가 활성 탭의 sql/source/rawRows를 `onActiveSql`로 상위에 올리고, Bubble의 `chip` 상태(setChip)로 받아 칩이 '지금 보는 탭 SQL'을 표시(월 `SUBSTR(,1,7)`↔일 `SUBSTR(,1,10) LIMIT 7`). 칩은 작은 pill, 클릭 시 바로 아래 인라인 펼침(absolute 아닌 in-flow→스크롤 가장자리 안 잘림)+`scrollIntoView`로 화면 안 표시. 토글·lazy+캐시·in-place·SQL/결과 탭·source·sql없으면 숨김 보존. 검증: dev·prod 모두 칩이 카드 밖(아바타 라인)·월↔일 SQL 동기화(changed)·새 말풍선 없음(userBubbles 1)·비-report(balance) 카드도 칩 외부, prod sk-ant 0 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [x] 근처 가맹점 지도 카카오맵 교체(+기본위치 청주, 키없으면 약식 폴백) — charts/MapChartCard.jsx를 Leaflet/OSM → 카카오 지도 JS SDK로 교체. SDK는 index.html 고정 `<script>` 없이 카드에서 키 있을 때만 1회 동적 주입(`//dapi.kakao.com/v2/maps/sdk.js?appkey=${VITE_KAKAO_MAP_KEY}&autoload=false&libraries=services`) + `kakao.maps.load(cb)` 초기화. 지도 중심=result.center→가맹점 평균→청주 기본, 가맹점 lat/lng에 Marker+이름 CustomOverlay 라벨, 내 위치=GPS 성공 시 그 좌표 / 실패·미허용 시 청주 흥덕 중심(36.6372,127.486)→서울 기본값 111km 문제 제거. 거리=하버사인(m/km)·가까운 순 정렬. 배지 GPS성공="현재 위치 기준·실제 거리"/실패="청주 기준·예시 거리". `VITE_KAKAO_MAP_KEY` 비거나 SDK 로드 실패 → 기존 오프라인 약식 지도(격자+상대좌표) 폴백. result 계약·single SQL·shaper·목록 UI 보존. leaflet import는 이 카드에서 제거(extras.jsx가 아직 써서 패키지·main.jsx CSS는 유지). 검증(Playwright, geolocation 청주 grant): 키 set→dapi.kakao 요청·window.kakao 로드·실타일+마커(약식 아님)·거리 0~657m(현실적)·콘솔에러 0, 키 비움→약식 폴백·SDK 요청 없음 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [x] 데이터 카드 렌더 ChartRenderer로 단일화(옛 extras 지도/데이터카드 제거) — 진단: 데이터 10개 intent는 OPERIA_KINDS라 send()에서 항상 chartType 메시지로 push→ChartRenderer→charts/*(merchantMap=새 카카오/청주 MapChartCard). 옛 경로 차단·제거: ① components/cards.jsx InlineCard를 비데이터(recommend/quiz/ledger/recorded)만 남기고 데이터 분기(merchantMap/balance/channel/merchantBreakdown/parentCard/friendCompare/nudgeCompare/nudgeList/schoolCompare/spending/report/catSpend/timePattern) 제거 + extras import 제거. ② send() AI/answer 폴백 경로에 DATA_INTENTS 가드 추가(데이터 kind면 card=null → InlineCard로 안 감). ③ components/extras.jsx(옛 데이터카드 전부, 서울 기본 MerchantMapCard 포함) 삭제 — 유일 importer가 cards.jsx였음. ④ leaflet 완전 제거: extras 삭제로 미사용 → main.jsx CSS import·package.json 의존성 제거(charts/MapChartCard는 카카오 SDK 사용). 보존: ChartRenderer/charts/*·INTENT_CHART·operia/single SQL/shaper·SQL칩·비데이터 카드. 검증(Playwright, geo 청주): "근처 가맹점"→카카오 지도(window.kakao 로드·약식 아님)·거리 657m(111km 아님), report/channel/balance ChartRenderer 정상, **콘솔 에러 0(옛 MerchantMapCard 흔적 없음)**, npm run build 통과 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [x] 지도 기본 줌/센터 청주 기준(원거리 GPS 시 데모위치 대체) — charts/MapChartCard.jsx: GPS가 가맹점 무리에서 30km 초과로 멀면(예: 서울 접속) '내 위치'를 청주 흥덕 중심(36.6372,127.486)으로 대체(`realLoc = gps && distM(gps,center)<=30000`), 가까우면 실 GPS 유지 → 어디서 접속해도 전국 줌아웃 없이 청주 동네 단위·거리 수백 m. setBounds는 가맹점(+청주로 대체된 가까운 내위치)로만 맞추고 레벨 클램프(>6→6 동네단위 / <4→4 과확대 방지), relayout 후 재적용. 배지: realLoc이면 "현재 위치 기준 · 실제 거리", 아니면 "청주 기준 · 예시 거리"(원거리 GPS·미허용·실패 공통). 카카오 SDK/키 게이팅·약식 폴백·마커/가맹점명 라벨·목록·result 계약 보존. 검증(Playwright): 서울 GPS·권한 미허용 둘 다 청주 흥덕 동네로 확대(전국 아님)·거리 0~657m(111km 아님)·"청주 기준" 배지·콘솔에러 0, npm run build 통과 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [x] 채널 카드 설계 반영(스택바+요약박스+거래리스트) (§5 ⑦) — 도넛 → 전용 channel 렌더러. queries.js channel: 단일 SQL을 '거래 행' 반환으로 변경(`SELECT p.PAY_CHANNEL channel, v.MERCHANT_NM item, v.BIZ_ITEM_NM cat, p.PAY_AMT amount, p.PAY_DT dt FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v … WHERE USER_ID='stu_demo' AND PAY_STTS='APPROVED' ORDER BY PAY_DT DESC`) → shape가 `{offline,online}{amount,count,pct}` + `rows[]`를 거래행에서 파생(단일 SQL 규칙 유지). registry channel `donut→channel`, ChartRenderer `case "channel"`→`ChannelChartCard`. 카드 UI: 제목"온·오프라인 결제 내역", 가로 스택바(오프라인 violet/온라인 teal), 요약박스 2개(아이콘+금액+건수+%), 하단 거래 리스트([채널태그] item · 날짜 · −금액, 최근순 8건+"N건 더"). 다른 9개 카드·single SQL·SQL칩/결과탭/source 보존. 검증: 스택바+요약박스+거래리스트(도넛 svg 0), 요약 offline 73,500(23건·64%)=리스트 offline합 / online 40,600(13건·36%)=리스트합 일관·총 114,100=catSpend, SQL칩 결과탭에 거래행(channel/item/cat/amount/dt·36행), 콘솔에러 0, npm run build 통과 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [x] 조르기 카드 설계 반영(또래비교→자기 월별추이) (§5 ④) — '또래/학교/충북 비교' 제거하고 '내 조르기 추이'로 변경. queries.js nudgeCompare: 단일 SQL 월별 집계(`SELECT SUBSTR(REQ_DT,1,7) month, COUNT(*) cnt, SUM(RECV_AMT) amount FROM TB_BEG WHERE STUDENT_USER_ID='stu_demo' AND REQ_STTS='ACCEPT' GROUP BY … ORDER BY month`) → shape `{thisMonth{cnt,amount}, lastMonth{cnt,amount}, diffCnt, monthly[]}`(최근 2개월로 이번/지난달 파생). registry nudgeCompare `compare→nudgeTrend`, ChartRenderer `case "nudgeTrend"`→`NudgeTrendChartCard`. 카드 UI: 제목"내 조르기 추이", 박스 2개(이번 달 횟수 +지난달 대비 ±N회 / 이번 달 금액 +지난달 금액), 월별 리스트(가로 바=금액 기준, 최근 월 강조, 횟수+금액), 💡 인사이트(이번>지난 "N번 더 충전 요청…💪" / 아니면 격려). CompareChartCard의 옛 nudge 분기·월별 미니바 제거(friend/school은 compare 유지). 단일 SQL·SQL칩/결과탭/source 보존. 검증: 박스(1회·30,000원 / 지난달 20,000원)+월별(04 15,000/05 20,000/06 30,000)·또래비교 막대 없음·SQL칩 결과탭 월별행(month/cnt/amount·3행), friend/school compare 회귀 정상, 콘솔에러 0, build 통과 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [x] 학교별 카드 설계 반영(TOP5 랭킹+우리학교 등수) (§5 ⑩) — 단순 비교 → '충북 중학교 결제 TOP5 랭킹 + 우리학교 등수 강조 + 충북 평균'. dataset.json 보강: 중학교 3곳 추가(용암중/운호중/송절중, 각 학생 1명+결제) → 총 6개교, 1인당 평균이 흥덕중(우리학교)보다 높게 설정해 흥덕중을 4위로. queries.js schoolCompare: 단일 GROUP BY(school/tot/students) → shape가 `{ranking[TOP5]{rank,school,avgPerStudent,me}, myRank, myAvg, provinceAvg, schoolCount}` 파생(충북평균=Σtot/Σstudents). registry schoolCompare `compare→schoolRank`, ChartRenderer `case "schoolRank"`→`SchoolRankChartCard`. 카드 UI: 제목"학교별 사용 비교"·부제"충청북도 중학교 결제 TOP5", 1~5위 리스트(순위+학교명+가로바+금액, 1위 골드/우리학교 🦊·violet 강조), 충북 평균 행(점선 구분), 💡"우리 학교는 충북 중학교 중 N위…평균보다 OO원 많이/적게". 다른 9개·single SQL·SQL칩/결과탭 보존. 친구비교(SCH_NM='흥덕중' GRADE='2') 영향 확인: school avg 불변·province avg만 전체 학생 반영(정상). 검증: TOP5(용암 78,000/운호 72,000/송절 68,500/흥덕 65,875·4위·🦊/가경 63,850)·청주중 TOP5밖·충북평균 65,627·"4위" 인사이트, SQL칩 결과탭 학교행(school/tot/students·6행), friendCompare/catSpend 회귀 정상, 콘솔에러 0·build 통과 **(CLI 구현·Playwright 검증 완료 2026-06-19)**
- [ ] (이후) 실 오페리아 연동 — `VITE_OPERIA_API` 스위치
- [ ] (이후) 백엔드 챗 프록시(키 서버 보관) 전환

---

## 9. 절대 금지 / 보존
- Cowork은 코드 파일 직접 생성·수정하지 않는다(설계·프롬프트만).
- 자유대화 Claude 경로(`src/api/claude.js`)·AI 토글 로직은 데이터 작업 시 보존.
- 구조 깨지면 부분수정보다 `git` 롤백 우선.
- 한 프롬프트에 갭 여러 개 몰지 않기(하나씩).
