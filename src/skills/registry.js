// 스킬 레지스트리 — 슬래시(/) 런처·진입칩·즐겨찾기 시드의 단일 소스(SSOT).
//   shape: { command, icon, label, description, prompt, keywords }
//   - command: 슬래시 커맨드(고유 id, 메시지 skillId 태깅에도 사용)
//   - prompt: 선택 시 send()로 전송되는 고정 프롬프트(operia로 직행 → 기존 카드 렌더)
//   - label/description: 드롭다운 표시. keywords: 필터 보조(한글).
// 설계 SSOT: _cli-handoff/스킬기능_설계+CLI핸드오프_0728.md §2.
export const SKILLS = [
  { command: "사용금액",   icon: "💰", label: "현재 사용 가능 금액", description: "지금 쓸 수 있는 금액을 알려줘",       prompt: "현재 사용할 수 있는 금액 알려줘",     keywords: ["잔액","금액","지원금"] },
  { command: "월별내역",   icon: "📅", label: "월별 사용 내역",     description: "내 결제를 월별 보고서로",             prompt: "월별 사용 내역 알려줘",             keywords: ["사용내역","월별","보고서"] },
  { command: "근처가맹점", icon: "📍", label: "근처 사용 가맹점",   description: "내 주변 쓸 수 있는 가맹점 지도로",     prompt: "근처 사용 가능 가맹점 알려줘",       keywords: ["근처","가맹점","지도","위치"] },
  { command: "사용처별",   icon: "🧾", label: "사용처별 내역",     description: "어디서 얼마 썼는지 사용처별로",       prompt: "사용처별 내역 알려줘",             keywords: ["사용처","내역","가맹점별"] },
  { command: "친구비교",   icon: "👫", label: "친구랑 비교",       description: "친구들과 사용내역 비교(데이터 없으면 안내로 빠질 수 있음)", prompt: "친구랑 사용내역 비교 해줘", keywords: ["친구","비교"] },
  { command: "온오프라인", icon: "🛒", label: "온·오프라인 결제",  description: "온라인/오프라인 결제 비중",           prompt: "온라인/오프라인 결제내역 확인해줘", keywords: ["온라인","오프라인","채널"] },
  { command: "주사용처",   icon: "📊", label: "주로 쓰는 곳",      description: "어디에 주로 쓰는지 분포로",           prompt: "어디에 주로 쓰고 있는지 알려줘",     keywords: ["주사용","분포","패턴"] },
  { command: "학교비교",   icon: "🏫", label: "학교별 비교",       description: "학교별 사용 내역 비교(데이터 없으면 안내로 빠질 수 있음)", prompt: "학교별 사용 내역 비교해줘", keywords: ["학교","비교"] },
];

// 진입칩·즐겨찾기 시드용 투영: 기존 QUICK_QUERIES 형태({icon, text}) 유지 → 호출부 동작 불변.
export const QUICK_QUERIES_FROM_SKILLS = SKILLS.map((s) => ({ icon: s.icon, text: s.prompt }));

export default SKILLS;
