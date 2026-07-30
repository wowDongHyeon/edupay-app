# 큰 금액 조건부 축약 (wonCompact) — CLI 핸드오프 (2026-07-28)

> 역할: [프론트(edupay-app)]. 자금보고서 리포트 랭킹 카드에서 큰 금액(8자리, 예 32,560,000)이 좁은 모바일 폭을 넘어 "원"이 잘림.
> 해결: **임계값 이상일 때만** 만/억 단위 축약(그 미만은 원 단위 그대로 = 일반 답변·실데이터 무영향).
> 심문 확정. 커밋·배포 금지(동현). 워킹트리만.

## 확정 스펙
- 신규 포매터 `wonCompact(n)` (charts/util.jsx, 기존 `won`·`num` 옆):
  - `< 10,000,000` → 기존 `won(n)` 그대로 (예 `12,000원`, `100,000원`).
  - `10,000,000 ≤ n < 100,000,000` → 만 단위 반올림 `"N,NNN만원"` (예 32,560,000 → `3,256만원`).
  - `≥ 100,000,000` → 억 단위 소수1자리 `"N.N억원"` (예 123,400,000 → `1.2억원`).
  - 음수·0·null 방어(기존 num 동작 유지).
- 적용: **랭킹 카드(barlist = merchantBreakdown 등) 금액 표시**에 `won` → `wonCompact` 교체. 랭킹 카드의 인사이트 문구("…에 가장 많이 썼어 (32,560,000원…)")도 같은 축약 적용(일관).
- **임계값 미만은 `won`과 동일** → 진입칩·일반 답변·실데이터(작은 금액)는 표시 불변(회귀 0).
- (선택) 리포트 프레임 좌우 패딩이 과하면 살짝 축소 — 축약으로 오버플로 해결되면 생략 가능.

---

```markdown
# Task: 큰 금액 조건부 축약 wonCompact (랭킹 카드 오버플로 수정)

## Goal
자금보고서/일반 랭킹 카드에서 8자리 금액이 모바일 폭을 넘겨 "원"이 잘리는 문제 해결.
임계값(1천만) 이상만 만/억 축약, 미만은 기존 원 단위 그대로 → 일반 답변·실데이터 무영향(회귀 0).

## Context (관련만)
- 설계: _cli-handoff/금액축약_wonCompact_0728_CLI핸드오프.md (이 문서 스펙 그대로)
- graphify로 지점만:
  - `graphify query "won num 금액 포매터 charts/util.jsx"`  (won = charts/util.jsx:6)
  - `graphify query "barlist 랭킹 카드 금액 amount 렌더 merchantBreakdown"`  (charts/templates/barlist.jsx)
  - `graphify query "랭킹 카드 인사이트 문구 가장 많이 썼어 금액"`
- 건드리면 안 됨: 다른 템플릿(balance/report/line 등) 금액, operia 계약, cardSignature.

## Constraints
- React+Vite+Tailwind. ~/.claude/CLAUDE.md + edupay-app/CLAUDE.md 준수. 커밋 금지(워킹트리).
- 임계값 미만 표시는 `won`과 바이트 동일해야 함(회귀 0 검증 포인트).
- wonCompact는 순수 함수(테스트 쉬움). num()의 천단위 콤마 재사용.

## Steps
1. `graphify query "won num charts/util.jsx"` 로 포매터 확인.
2. charts/util.jsx에 `wonCompact(n)` 추가(위 스펙: 1천만↑ 만, 1억↑ 억, 미만 won). 순수 함수.
3. `graphify query "barlist 금액 렌더"` → barlist.jsx 금액 출력을 wonCompact로 교체.
4. 같은 랭킹 카드의 인사이트 문구 금액도 wonCompact 적용(문구 생성 위치 graphify로 확인).
5. (선택) 리포트 프레임 좌우 패딩 과하면 1~2단계 축소.

## Definition of Done
- [ ] 32,560,000 → "3,256만원"으로 표시, 모바일(≈390~412폭)에서 "원"까지 안 잘림.
- [ ] 100,000·12,000 등 1천만 미만은 기존 "원" 단위 그대로(진입칩·일반 답변 불변).
- [ ] 1억 이상은 "N.N억원".
- [ ] 랭킹 카드 인사이트 문구 금액도 동일 축약(일관).
- [ ] 다른 카드(balance 등) 금액·operia 계약 불변.
- [ ] npm run build exit 0. 커밋 안 함.

## 검증 환경 / 마무리 (필수)
- dev: http://localhost:5173/?view=webview&user_id=teststu05. .env 원복. dev 서버 종료 금지.
- 검증: build exit + 가능하면 Playwright/브라우저로 좁은 폭(≈412)에서 랭킹 카드 금액 안 잘림 스크린샷. operia flaky 재시도 전제. "완료" 자가보고 금지.
- 회귀: 작은 금액(진입칩·balance) 표시 불변 확인.
- 완료 보고 끝 3줄(시작 `date +%s`): `⏱ 소요 시간` / `🛠 사용 스킬` / `🤖 사용 에이전트`.
```
