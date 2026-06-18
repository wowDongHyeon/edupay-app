# 에듀페이(다채움) AI 금융친구 — Vite + React

충청북도 교육 지원금(바우처/앱카드/조르기) 결제 앱. 기존 프로토타입을 Vite + React로 전환한 정식 빌드 프로젝트.

## 시작하기
```bash
npm install
cp .env.example .env   # VITE_API_BASE 등 설정 (Windows: copy .env.example .env)
npm run dev            # http://localhost:5173
```

## 빌드
```bash
npm run build          # dist/ 정적 산출물
npm run preview        # 빌드 결과 미리보기
```

## 구조
- `src/main.jsx` — 진입점
- `src/App.jsx` — 루트 컴포넌트(현재 스캐폴드 확인용 placeholder)
- `src/index.css` — Tailwind + 프로토타입 스타일 이식
- `src/api/client.js` — 백엔드 API 클라이언트(질의 10개 매핑)
- `src/data/` — 데이터 레이어(프로토타입 data.js 이식 예정)
- `src/components/` — 화면/카드 컴포넌트(이식 예정)

전환 단계·변환 규칙은 `전환계획.md` 참고.

## 참고
- 사내망에서 CDN(폰트/타일맵)이 막히면 `pretendard` npm 패키지 및 지도 타일 서버를 사내용으로 교체.
- AI 챗 API 키는 **절대 프론트에 두지 말 것** — 서버 경유로만.
