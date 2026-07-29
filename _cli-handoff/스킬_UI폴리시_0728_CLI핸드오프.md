# 스킬 UI 폴리시 3종 — CLI 핸드오프 (2026-07-28)

> 역할: [프론트(edupay-app)]. 앱 실기기 확인 후 나온 UI 개선 3건. 심문 확정.
> 선행: 스킬 대체 모델(v2) 배포·라이브검증 완료 상태 위에 얹는다. operia 변경 0.
> ⚠ 착수 전 현재 워킹트리를 브랜치 체크포인트 커밋(동현). 커밋·배포는 사람이.

## 확정 결정 (심문)
1. **스킬 차별화 (c)+(d)** — 스킬 응답을 일반 답변과 시각 구분: 리포트 상단 **스킬 헤더 배지** + 4슬롯 감싸는 **accent 프레임**, 그리고 로딩도 **스킬 인지 문구**("자금보고서 만드는 중…").
2. **입력창 위치 (b)** — 빈 랜딩(진입/새 대화)에선 입력창(+칩)을 화면 중앙~중상단으로 올리고, 대화 시작(started)되면 하단 도킹. 도킹 시에도 하단 여백 약간.
3. **리포트 폴리시 (A, 리포트 레벨만)** — 공용 카드 내부(막대·행)는 불변(일반 답변 회귀 0). 자금보고서 리포트 안에서만: 섹션 헤더 스타일업 + 요약문 강조 배너 + 슬롯 프레이밍/간격 + 1위 강조.

---

```markdown
# Task: 스킬 UI 폴리시 3종 (차별화 · 입력창 위치 · 리포트 폴리시)

## Goal
① /자금보고서 응답이 일반 답변과 시각적으로 구분되게(헤더 배지+프레임+스킬 로딩문구),
② 빈 랜딩에서 입력창을 중앙~중상단으로 올리고 대화 시작 시 하단 도킹,
③ 자금보고서 리포트 "안에서만" 섹션헤더·요약배너·슬롯프레이밍·1위강조로 다듬기.
공용 카드 내부/일반 답변/진입칩/단일 전송 경로는 불변(회귀 0).

## Context (관련만)
- 설계 근거: _cli-handoff/스킬_UI폴리시_0728_CLI핸드오프.md (이 문서) + 스킬_슬래시커맨드_설계+CLI핸드오프_0728_v2.md
- graphify로 필요한 지점만:
  - `graphify query "CompositeReport 컴포넌트 슬롯 렌더 요약문 title"`  (파일: src/charts/CompositeReport.jsx)
  - `graphify query "composer 입력창 레이아웃 started IntroLanding WEBVIEW 랜딩"`  (App.jsx ~534, ~1644)
  - `graphify query "Typing 로딩 말풍선 LOADING_POOLS typingIntent runComposite"`  (App.jsx ~872,957,runComposite)
- 건드리면 안 됨: 공용 카드 컴포넌트 내부(merchantBreakdown/balance/report 템플릿 렌더 로직), cardSignature, operia 계약, 단일 send 경로.

## Constraints
- React+Vite+Tailwind, Vanilla 상태. ~/.claude/CLAUDE.md + edupay-app/CLAUDE.md 준수.
- 커밋·배포 금지(동현). 워킹트리만. 무관 파일 수정 금지.
- App.jsx는 집약/엔트리 → 레이아웃 변경은 aegis-dev000 위임. CompositeReport 폴리시는 직접 가능.
- (A) 범위 엄수: 리포트 레벨만. 공용 카드 내부 스타일 변경 금지(일반 답변 회귀 방지).

## Steps
1. 컨텍스트 확보(위 graphify 3개).
2. [차별화 c] src/charts/CompositeReport.jsx:
   - 리포트 최상단 **스킬 헤더 배지**: "📊 자금보고서" + 작은 "스킬" 태그(accent). 
   - 4슬롯 전체를 **accent 테두리 + 연보라 배경 프레임**(rounded, 여백)으로 감싸 "리포트 한 장"으로 읽히게.
3. [차별화 d] 스킬 로딩 문구: runComposite 실행 중 typing 문구를 "자금보고서 만드는 중…" 류 **스킬 전용**으로(기존 LOADING_POOLS와 분리, typingIntent 또는 별도 플래그).
4. [입력창 b] App.jsx composer 레이아웃(aegis): started=false(빈 랜딩, WEBVIEW 포함)일 때 입력창+진입칩 묶음을 화면 중앙~중상단으로(flex 정렬/spacer), started=true면 기존 하단 도킹(+하단 여백 약간). 대화 흐름과 겹치지 않게.
5. [폴리시 A] CompositeReport 내부만:
   - 슬롯 title("무엇에 썼나" 등) = 아이콘+굵게+accent(회색 평문 탈피).
   - 상단 요약문 = 💡+연보라 accent **강조 배너**.
   - 슬롯마다 라운드 카드+가벼운 그림자+슬롯 간 간격.
   - 각 슬롯 1위 행 강조는 래퍼에서 가능한 선까지(공용 카드 내부 수정 없이). 불가하면 생략하고 보고.

## Definition of Done
- [ ] /자금보고서 응답에 스킬 헤더 배지 + 프레임 노출, 일반 답변과 명확히 구분.
- [ ] 스킬 로딩 시 스킬 전용 문구 표시.
- [ ] 빈 랜딩 입력창 중앙~중상단, 대화 시작 시 하단 도킹(겹침 없음).
- [ ] 리포트 섹션헤더·요약배너·슬롯프레이밍 적용, 공용 카드 내부/일반 답변 불변(회귀 0).
- [ ] 진입칩·즐겨찾기·단일 전송·일반 채팅 불변.
- [ ] npm run build exit 0. 커밋 안 함(워킹트리).

## 검증 환경 / 마무리 (필수)
- dev: http://localhost:5173/?view=webview&user_id=teststu05. .env 변경 시 원복. dev 서버 임의 종료 금지.
- 검증: build exit + 가능하면 Playwright/브라우저로 랜딩 입력창 위치·/자금보고서 리포트 차별화 스크린샷. operia flaky ~50% 재시도 전제. "완료" 자가보고 금지.
- 최종 라이브 검증(모바일 웹뷰 룩)은 Cowork(Claude in Chrome)에서 사람이. CLI는 코드+build+로컬 렌더까지.
- 완료 보고 끝 3줄(시작 시각 `date +%s`):
  - `⏱ 소요 시간: Xm Ys`
  - `🛠 사용 스킬: <이름/없음>`
  - `🤖 사용 에이전트: <aegis-dev000 등/없음>`
```
