// 스킬 슬래시커맨드 레지스트리 — 순수 선언형(함수·import 금지, 나중에 public/skills.json 이관 대비).
// SSOT: _cli-handoff/스킬_슬래시커맨드_설계+CLI핸드오프_0728_v2.md §2.
//
// ★ 스킬 = 특화 업무(복합)만 둔다. 단일 질의(월별·사용처별 등)는 스킬이 아니라 진입칩(App.jsx QUICK_QUERIES) 소관.
//   (2026-07-28 결정: "스킬은 특화 업무" — 단일 스킬 8개 제거, 진입칩·즐겨찾기는 App.jsx에서 독립 유지)
//
// shape(스킬): { label, description, icon, keywords, summary, [params], cards[] }
//   - 키(자금보고서…) = command = 화면 표시 `/명령어` (슬래시 메뉴가 Object.entries로 소비, SkillChip 렌더).
//   - card:'auto' → cardSignature 자동판정. 명시타입(balance/report/…) → ChartRenderer forceCard 강제.
//   - 복합 스킬 = summary 있음 · cards N개 · 앵커 N개 병렬. (현재 전부 복합)
export const SKILLS = {
  // ── 복합 스킬 ──
  자금보고서: {
    label: '자금보고서', description: '잔액·월추이·사용처·상품을 한 번에',
    icon: '📊', keywords: ['자금', '보고서', '종합'],
    params: { period: { required: false } },
    summary: '{기간} 동안 {총액}원 썼어요. {최다사용처}에 제일 많이 썼고, 지금 {잔액}원 남았어요.',
    cards: [
      { anchor: '지금 쓸 수 있는 금액 알려줘', card: 'balance', title: '지금 쓸 수 있는 돈', skipPeriod: true },
      { anchor: '달마다 얼마 썼어', card: 'report', title: '달마다 쓴 돈' }, // 슬롯2 = report(월). reportDaily 아님(정정)
      { anchor: '어디에 얼마씩 썼어', card: 'merchantBreakdown', title: '어디에 썼나' },
      { anchor: '무슨 상품에 돈 많이 썼어', card: 'merchantBreakdown', title: '무엇에 썼나' },
    ],
  },
};

export default SKILLS;
