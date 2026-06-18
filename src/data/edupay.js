/* FOX PAY AI — Mock 데이터 & 학년별 응답 엔진 (충청북도교육청 학생 복지 결제 플랫폼)
   모든 데이터는 "FOX PAY 결제 데이터" 기반이라는 컨셉. 전부 가상 데이터.            */

export const EDUPAY = (function () {
  const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
  const num = (n) => Number(n || 0).toLocaleString("ko-KR");

  // ── 카테고리 메타 (색/이모지) ────────────────────────────────────
  const CAT_META = {
    "식비":      { color: "#8579E3", emoji: "🍱" },
    "매점·간식": { color: "#E2B871", emoji: "🏪" },
    "학용품":    { color: "#ADA3EE", emoji: "📚" },
    "교통":      { color: "#6FC2AB", emoji: "🚌" },
    "문화":      { color: "#D29FBC", emoji: "🎮" },
    "기타":      { color: "#A6AEBC", emoji: "💡" },
  };
  // 실제 오늘 날짜를 사용 (하드코딩 X) — 매일 자동으로 갱신됨
  const _now = new Date();
  const TODAY = [_now.getFullYear(), String(_now.getMonth() + 1).padStart(2, "0"), String(_now.getDate()).padStart(2, "0")].join("-");
  const curM = +TODAY.slice(5, 7);
  const mLabel = (back) => ((((curM - back - 1) % 12) + 12) % 12 + 1) + "월";
  const dMinus = (iso, n) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - n);
    return dt.toISOString().slice(0, 10);
  };
  // 이번 주 (월요일~일요일) 범위
  const mondayOf = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0=월
    return dMinus(iso, dow);
  };
  const weekRangeOf = (iso) => { const s = mondayOf(iso); return { start: s, end: dMinus(s, -6) }; };
  const monthRangeOf = (iso) => {
    const [y, m] = iso.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const p2 = (n) => String(n).padStart(2, "0");
    return { start: `${y}-${p2(m)}-01`, end: `${y}-${p2(m)}-${p2(last)}` };
  };
  const weekRange = weekRangeOf(TODAY);

  // ── 용돈기입장 시드 (off = 오늘로부터 며칠 전 → 실제 날짜는 매일 자동 계산) ──
  const ledgerRaw = [
    // 오늘
    { id: "a1",  off: 0,  type: "expense", cat: "식비",      emoji: "🍱", title: "김밥",         amount: 3500, source: "auto",   memo: "" },
    { id: "a2",  off: 0,  type: "expense", cat: "매점·간식", emoji: "🥤", title: "편의점 음료",  amount: 1800, source: "auto",   memo: "" },
    { id: "a3",  off: 0,  type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 2000, source: "auto",   memo: "왕복" },
    // 어제
    { id: "a4",  off: 1,  type: "expense", cat: "식비",      emoji: "🏪", title: "편의점 도시락", amount: 4500, source: "auto",   memo: "" },
    { id: "a5",  off: 1,  type: "expense", cat: "학용품",    emoji: "📓", title: "노트",         amount: 2000, source: "auto",   memo: "" },
    { id: "a6",  off: 2,  type: "expense", cat: "매점·간식", emoji: "🍦", title: "아이스크림",   amount: 1800, source: "auto",   memo: "" },
    { id: "a7",  off: 2,  type: "expense", cat: "교통",      emoji: "🚇", title: "지하철",       amount: 1500, source: "auto",   memo: "" },
    { id: "a8",  off: 3,  type: "expense", cat: "식비",      emoji: "🍢", title: "떡볶이",       amount: 4000, source: "manual", memo: "" },
    { id: "a9",  off: 3,  type: "expense", cat: "문화",      emoji: "📱", title: "웹툰 코인",    amount: 1300, source: "auto",   memo: "" },
    { id: "a10", off: 4,  type: "expense", cat: "매점·간식", emoji: "🏪", title: "과자",         amount: 2500, source: "auto",   memo: "" },
    { id: "a11", off: 4,  type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 1250, source: "auto",   memo: "" },
    { id: "a12", off: 5,  type: "expense", cat: "식비",      emoji: "🍜", title: "분식집",       amount: 5000, source: "manual", memo: "" },
    { id: "a13", off: 5,  type: "expense", cat: "매점·간식", emoji: "🥤", title: "매점 음료",    amount: 1500, source: "auto",   memo: "" },
    { id: "a14", off: 6,  type: "expense", cat: "식비",      emoji: "🏪", title: "삼각김밥",     amount: 2800, source: "auto",   memo: "" },
    { id: "a15", off: 6,  type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 1250, source: "auto",   memo: "" },
    { id: "s1",  off: 7,  type: "expense", cat: "식비",      emoji: "🍱", title: "김밥천국",     amount: 5500, source: "auto",   memo: "" },
    { id: "s2",  off: 7,  type: "expense", cat: "매점·간식", emoji: "🏪", title: "편의점 과자",  amount: 3000, source: "auto",   memo: "" },
    { id: "s3",  off: 7,  type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 2000, source: "auto",   memo: "왕복" },
    { id: "s4",  off: 8,  type: "expense", cat: "식비",      emoji: "🏪", title: "편의점 도시락", amount: 4500, source: "auto",   memo: "" },
    { id: "s5",  off: 8,  type: "expense", cat: "매점·간식", emoji: "🥐", title: "매점 빵",      amount: 2000, source: "auto",   memo: "" },
    { id: "s6",  off: 8,  type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 1250, source: "auto",   memo: "" },
    { id: "s7",  off: 9,  type: "expense", cat: "식비",      emoji: "🍔", title: "햄버거",       amount: 6000, source: "manual", memo: "친구랑" },
    { id: "s8",  off: 9,  type: "expense", cat: "매점·간식", emoji: "🏪", title: "편의점 간식",  amount: 3400, source: "auto",   memo: "" },
    { id: "s9",  off: 9,  type: "expense", cat: "학용품",    emoji: "✏️", title: "볼펜 세트",    amount: 3000, source: "auto",   memo: "" },
    { id: "s10", off: 9,  type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 1250, source: "auto",   memo: "" },
    { id: "s11", off: 10, type: "expense", cat: "식비",      emoji: "🍱", title: "급식 추가",    amount: 4800, source: "auto",   memo: "" },
    { id: "s12", off: 10, type: "expense", cat: "매점·간식", emoji: "🥤", title: "매점 음료",    amount: 1500, source: "auto",   memo: "" },
    { id: "s13", off: 10, type: "expense", cat: "교통",      emoji: "🚇", title: "지하철",       amount: 1500, source: "auto",   memo: "" },
    { id: "s14", off: 11, type: "expense", cat: "학용품",    emoji: "📚", title: "수학 문제집",  amount: 9000, source: "manual", memo: "" },
    { id: "s15", off: 11, type: "expense", cat: "매점·간식", emoji: "🍦", title: "아이스크림",   amount: 1800, source: "manual", memo: "" },
    { id: "s16", off: 11, type: "expense", cat: "문화",      emoji: "📱", title: "웹툰 코인",    amount: 1300, source: "auto",   memo: "" },
    { id: "s17", off: 12, type: "expense", cat: "식비",      emoji: "🍜", title: "분식집",       amount: 5000, source: "manual", memo: "" },
    { id: "s18", off: 12, type: "expense", cat: "매점·간식", emoji: "🍬", title: "젤리",         amount: 4000, source: "auto",   memo: "" },
    { id: "s19", off: 12, type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 1250, source: "auto",   memo: "" },
    { id: "s20", off: 13, type: "expense", cat: "식비",      emoji: "🏪", title: "GS25 편의점",  amount: 3200, source: "auto",   memo: "" },
    { id: "s21", off: 13, type: "expense", cat: "매점·간식", emoji: "🏪", title: "매점 과자",    amount: 2500, source: "auto",   memo: "" },
    { id: "s22", off: 13, type: "expense", cat: "교통",      emoji: "🚌", title: "버스",         amount: 1250, source: "auto",   memo: "" },
    { id: "s23", off: 14, type: "expense", cat: "식비",      emoji: "🍢", title: "떡볶이",       amount: 4500, source: "manual", memo: "현금" },
    { id: "s24", off: 14, type: "expense", cat: "문화",      emoji: "🎬", title: "영화",         amount: 5000, source: "manual", memo: "주말" },
    { id: "s25", off: 14, type: "income",  cat: "용돈",      emoji: "💸", title: "이달 용돈",    amount: 50000, source: "manual", memo: "" },
    { id: "s26", off: 16, type: "income",  cat: "선물",      emoji: "🎁", title: "용돈 선물",    amount: 10000, source: "manual", memo: "" },
  ];
  // 지난달(전월) 고정 이력 — 절대 날짜(달력 월 기준 조회용). 가상 데이터.
  const prevM = monthRangeOf(dMinus(monthRangeOf(TODAY).start, 1)); // 전월 1일~말일
  const pm = prevM.start.slice(0, 7); // "YYYY-MM"
  const prevPrevM = monthRangeOf(dMinus(prevM.start, 1)); // 전전월 1일~말일
  const ppm = prevPrevM.start.slice(0, 7);
  const historySeed = [
    { id: "h0",  type: "income",  date: `${pm}-01`, cat: "용돈",      emoji: "💸", title: "지난달 용돈",  amount: 50000, source: "manual", memo: "" },
    { id: "h1",  type: "expense", date: `${pm}-02`, cat: "식비",      emoji: "🍔", title: "햄버거",       amount: 6000,  source: "manual", memo: "" },
    { id: "h2",  type: "expense", date: `${pm}-04`, cat: "매점·간식", emoji: "🏪", title: "편의점 간식",  amount: 3200,  source: "auto",   memo: "" },
    { id: "h3",  type: "expense", date: `${pm}-06`, cat: "교통",      emoji: "🚌", title: "버스",         amount: 2500,  source: "auto",   memo: "" },
    { id: "h4",  type: "expense", date: `${pm}-09`, cat: "식비",      emoji: "🍜", title: "분식집",       amount: 5500,  source: "manual", memo: "" },
    { id: "h5",  type: "expense", date: `${pm}-12`, cat: "학용품",    emoji: "📚", title: "참고서",       amount: 13000, source: "manual", memo: "" },
    { id: "h6",  type: "expense", date: `${pm}-14`, cat: "매점·간식", emoji: "🥤", title: "매점 음료",    amount: 1800,  source: "auto",   memo: "" },
    { id: "h7",  type: "expense", date: `${pm}-17`, cat: "문화",      emoji: "🎬", title: "영화",         amount: 9000,  source: "manual", memo: "주말" },
    { id: "h8",  type: "expense", date: `${pm}-19`, cat: "식비",      emoji: "🍱", title: "김밥천국",     amount: 5000,  source: "auto",   memo: "" },
    { id: "h9",  type: "expense", date: `${pm}-22`, cat: "교통",      emoji: "🚇", title: "지하철",       amount: 3000,  source: "auto",   memo: "" },
    { id: "h10", type: "expense", date: `${pm}-25`, cat: "매점·간식", emoji: "🍦", title: "아이스크림",   amount: 2800,  source: "manual", memo: "" },
    { id: "h11", type: "expense", date: `${pm}-28`, cat: "식비",      emoji: "🍢", title: "떡볶이",       amount: 4500,  source: "manual", memo: "" },
    { id: "h12", type: "expense", date: `${pm}-30`, cat: "문화",      emoji: "📱", title: "웹툰 코인",    amount: 2000,  source: "auto",   memo: "" },
    // 전전월(예: 4월) — 월별 추이용 실제 데이터
    { id: "g0",  type: "income",  date: `${ppm}-01`, cat: "용돈",      emoji: "💸", title: "전전달 용돈",  amount: 50000, source: "manual", memo: "" },
    { id: "g1",  type: "expense", date: `${ppm}-03`, cat: "식비",      emoji: "🍱", title: "급식 추가",    amount: 4800,  source: "auto",   memo: "" },
    { id: "g2",  type: "expense", date: `${ppm}-06`, cat: "매점·간식", emoji: "🏪", title: "편의점 간식",  amount: 3000,  source: "auto",   memo: "" },
    { id: "g3",  type: "expense", date: `${ppm}-08`, cat: "교통",      emoji: "🚌", title: "버스",         amount: 2500,  source: "auto",   memo: "" },
    { id: "g4",  type: "expense", date: `${ppm}-11`, cat: "학용품",    emoji: "✏️", title: "필기구",       amount: 6500,  source: "manual", memo: "" },
    { id: "g5",  type: "expense", date: `${ppm}-15`, cat: "식비",      emoji: "🍔", title: "햄버거",       amount: 6000,  source: "manual", memo: "" },
    { id: "g6",  type: "expense", date: `${ppm}-18`, cat: "매점·간식", emoji: "🍦", title: "아이스크림",   amount: 2000,  source: "auto",   memo: "" },
    { id: "g7",  type: "expense", date: `${ppm}-21`, cat: "문화",      emoji: "🎬", title: "영화",         amount: 9000,  source: "manual", memo: "주말" },
    { id: "g8",  type: "expense", date: `${ppm}-24`, cat: "식비",      emoji: "🍜", title: "분식집",       amount: 5000,  source: "manual", memo: "" },
    { id: "g9",  type: "expense", date: `${ppm}-27`, cat: "교통",      emoji: "🚇", title: "지하철",       amount: 3000,  source: "auto",   memo: "" },
    { id: "g10", type: "expense", date: `${ppm}-29`, cat: "매점·간식", emoji: "🥤", title: "매점 음료",    amount: 1700,  source: "auto",   memo: "" },
  ].filter((e) => (e.date >= prevM.start && e.date <= prevM.end) || (e.date >= prevPrevM.start && e.date <= prevPrevM.end));

  // 더 과거(전전전월~12개월 전)는 월별 추이 일관성을 위해 자동 생성 — 결정적(매번 동일)
  const GEN_CATS = [["식비", "🍱"], ["매점·간식", "🏪"], ["교통", "🚌"], ["학용품", "📚"], ["문화", "🎬"]];
  const monthAnchorBack = (n) => { let a = monthRangeOf(TODAY).start; for (let i = 0; i < n; i++) a = monthRangeOf(dMinus(a, 1)).start; return a; };
  const genMonth = (idx) => {
    const ym = monthAnchorBack(idx).slice(0, 7);
    const moNum = +ym.slice(5, 7);
    const rows = [{ id: `gm${idx}i`, type: "income", date: `${ym}-01`, cat: "용돈", emoji: "💸", title: `${moNum}월 용돈`, amount: 50000, source: "manual", memo: "" }];
    [3, 7, 11, 15, 19, 23, 27].forEach((d, i) => {
      const c = GEN_CATS[(idx + i) % GEN_CATS.length];
      const amt = 1500 + ((idx * 7 + i * 13) % 9) * 800; // 1,500~7,900 결정적
      rows.push({ id: `gm${idx}e${i}`, type: "expense", date: `${ym}-${String(d).padStart(2, "0")}`, cat: c[0], emoji: c[1], title: c[0], amount: amt, source: i % 2 ? "auto" : "manual", memo: "" });
    });
    return rows;
  };
  let olderSeed = [];
  for (let idx = 3; idx <= 11; idx++) olderSeed = olderSeed.concat(genMonth(idx));

  const ledgerSeed = ledgerRaw.map((e) => ({ ...e, date: dMinus(TODAY, e.off) })).concat(historySeed, olderSeed)
    .map((e) => ({
      ...e,
      // 결제 채널: 문화/웹툰/영화/온라인성 항목 → 온라인, 그 외 → 오프라인 (결정적)
      channel: e.channel || (e.type === "income" ? "기타" : (/(문화|웹툰|코인|온라인|영화|게임|구독)/.test(e.cat + e.title) ? "online" : "offline")),
      // 결제 수단: 학용품 등 고액(8천 이상)은 부모카드, 그 외 본인 지원금 (결정적)
      payer: e.payer || (e.type === "expense" && e.cat === "학용품" && e.amount >= 8000 ? "부모카드" : "본인"),
      merchant: e.merchant || e.title,
      // 결제 승인시간(HH:MM) — 카테고리별 자연스러운 시간대 + 결정적 분산
      time: e.time || (() => {
        const base = { "식비": 12, "매점·간식": 15, "교통": 8, "학용품": 17, "문화": 20, "용돈": 9, "선물": 13 }[e.cat] ?? 14;
        const seed = (e.id || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
        let h = (base + (seed % 5) - 2 + 24) % 24; if (h < 7) h += 7;
        const m = (seed * 7) % 60;
        return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      })(),
    }));
  const sumExpenseIn = (r) => ledgerSeed.filter((e) => e.type === "expense" && e.date >= r.start && e.date <= r.end).reduce((s, e) => s + e.amount, 0);

  // ── 파생 집계 (ledgerSeed 기준 — 모두 일관) ─────────────────────
  const isThisMonth = (d) => d.slice(0, 7) === TODAY.slice(0, 7);
  const groupByCat = (entries) => {
    const m = {};
    entries.forEach((e) => { m[e.cat] = (m[e.cat] || 0) + e.amount; });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value, color: (CAT_META[name] || CAT_META["기타"]).color, emoji: (CAT_META[name] || CAT_META["기타"]).emoji }))
      .sort((a, b) => b.value - a.value);
  };
  const juneExpense = ledgerSeed.filter((e) => e.type === "expense" && isThisMonth(e.date));
  const monthCategories = groupByCat(juneExpense);          // 식비33500·매점18200·학용품12000·교통8500·문화6300
  const monthTotal = juneExpense.reduce((s, e) => s + e.amount, 0); // 78,500

  // 이번 주 = 최근 7일(6/2~6/8)
  const weekStart = dMinus(TODAY, 6);
  const weekExpense = ledgerSeed.filter((e) => e.type === "expense" && e.date >= weekStart && e.date <= TODAY);
  const weekCategories = groupByCat(weekExpense);
  const weekTotal = weekExpense.reduce((s, e) => s + e.amount, 0);

  const lastMonthTotal = ledgerSeed.filter((e) => e.type === "expense" && e.date >= prevM.start && e.date <= prevM.end).reduce((s, e) => s + e.amount, 0);
  const deltaPct = +(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1);

  // ── 비교/지원금/가맹점 모델 (전부 결정적 파생, 하드코딩 답변 아님) ──
  const round100 = (n) => Math.round(n / 100) * 100;
  const thisMonthRange = monthRangeOf(TODAY);
  // 또래 평균 모델: 내 카테고리 분포를 기준으로 충북 전체/학교 평균을 결정적 비율로 산출
  //  - 충북 전체: 내 소비의 1.12배(평균이 조금 더 큼), 학교: 0.93배(우리 학교가 조금 덜 씀)
  const PROV_RATIO = 1.12, SCHOOL_RATIO = 0.93;
  const compareTotals = {
    me: monthTotal,
    school: round100(monthTotal * SCHOOL_RATIO),
    province: round100(monthTotal * PROV_RATIO),
    schoolName: "FOX중학교", // 표시용 라벨(= TB_COM_USER.SCH_NM, 아래 makeUser와 동일)
  };

  // 조르기(보호자에게 충전 요청) 모델: 수입(용돈/충전) 이벤트 = 조르기 1건
  const nudgesIn = (r) => ledgerSeed.filter((e) => e.type === "income" && e.date >= r.start && e.date <= r.end);
  // 지원금(바우처) 모델: 총 지원금 − 지원금으로 결제한 사용액 = 잔액
  //  (지급 주기(월/년)는 미확정 — 현재는 총액 파라미터로 처리)
  const supportTotal = 150000; // 총 지원금(모델 파라미터)
  const supportUsed = ledgerSeed.filter((e) => e.type === "expense" && e.payer === "본인" && e.date >= thisMonthRange.start && e.date <= thisMonthRange.end).reduce((s, e) => s + e.amount, 0);
  const supportRemaining = Math.max(supportTotal - supportUsed, 0);

  // ════════════════════════════════════════════════════════════════
  //  DB 스키마 정렬 레이어 — 모든 원천 데이터를 실제 테이블 구조로 보관
  //  (TB_COM_USER / TB_COM_VOUCHER / TB_COM_PAY_API_LOG / TB_COM_ADBK)
  //  화면용 뷰모델(merchants 등)은 아래 시드에서 파생. 전부 가상 데이터.
  // ════════════════════════════════════════════════════════════════
  const nowDt = () => { // datetime 문자열(YYYY-MM-DD HH:MM:SS)
    const p2 = (n) => String(n).padStart(2, "0");
    return `${TODAY} ${p2(_now.getHours())}:${p2(_now.getMinutes())}:${p2(_now.getSeconds())}`;
  };

  // ── TB_COM_USER ── 현재 로그인 학생(학교명/학년은 선택 학년에 따라 makeUser로 생성) ──
  const SCH_BY_GRADE = { 초등: "FOX초등학교", 중학: "FOX중학교", 고등: "FOX고등학교" };
  const GRADE_NO     = { 초등: "5", 중학: "2", 고등: "1" };
  const BIRTH_BY_GRADE = { 초등: "20150401", 중학: "20120401", 고등: "20090401" };
  const makeUser = (grade) => ({
    USER_ID:        "STU20260001",
    USER_NM:        "김도윤",
    USER_TELNO:     "010-2345-6789",
    USER_EML_ADDR:  null,
    USER_TYPE:      "STUDENT",
    LOGIN_ID:       "doyun0401",
    LOGIN_PW:       "$2b$10$••••••••(해시)",
    SCH_NM:         SCH_BY_GRADE[grade] || "FOX중학교",
    GRADE:          GRADE_NO[grade] || "2",
    CLS_NO:         "3",
    IMG_ATCH_FILE_ID:    null,
    SKIN_TYPE:      "01",
    ITEM_TYPE:      "02",
    LIKE_NO:        12,
    SIMPLE_PW:      "••••••",
    CERT_ID:        null,
    FRST_LGN_DT:    "2026-03-02 08:41:10",
    LAST_LGN_DT:    nowDt(),
    PSWD_CHG_DT:    "2026-03-02 08:45:22",
    FRST_REG_DT:    "2026-03-02 08:40:55",
    PROFILE_ATCH_FILE_ID: null,
    birth:          BIRTH_BY_GRADE[grade] || "20120401",
    NTCN_YN:        "Y",
    FCM_TOKEN:      "fM3xK9••••(푸시토큰)",
  });
  const USER = makeUser("중학"); // 기본값(중학). 학년 전환 시 schema.userOf(grade) 사용

  // ── TB_COM_VOUCHER ── 충북 학생복지 가맹점 디렉터리(+화면용 좌표/거리 메타) ──
  const VOUCHER_DIR = [
    { no: "CB10240001", nm: "GS25 교문점",     se: "편의점",   stts: "정상", addr: "충청북도 청주시 상당구 대성로 122",      biz: "312-81-44021", bizType: "소매업",   bizItem: "체인화 편의점", rep: "이상우", tel: "043-256-7012", join: "20230301", emoji: "🏪", cat: "매점·간식", dist: 80,   channel: "offline", lat: 36.6431, lng: 127.4900, x: 38, y: 30 },
    { no: "CB10240002", nm: "청주 시내버스",   se: "교통",     stts: "정상", addr: null,                                       biz: "317-82-00115", bizType: "운수업",   bizItem: "시내버스 운송", rep: "청주교통", tel: "043-260-5000", join: "20220701", emoji: "🚌", cat: "교통",      dist: 90,   channel: "offline", lat: 36.6430, lng: 127.4878, x: 46, y: 18 },
    { no: "CB10240003", nm: "김밥천국 청주점", se: "일반음식점", stts: "정상", addr: "충청북도 청주시 상당구 상당로55번길 12",  biz: "312-25-77310", bizType: "음식점업", bizItem: "분식·김밥",     rep: "박영선", tel: "043-221-3344", join: "20221115", emoji: "🍱", cat: "식비",      dist: 150,  channel: "offline", lat: 36.6438, lng: 127.4872, x: 60, y: 42 },
    { no: "CB10240004", nm: "교보문고 청주점", se: "서점",     stts: "정상", addr: "충청북도 청주시 흥덕구 풍산로 30",        biz: "102-81-11670", bizType: "도소매업", bizItem: "서적·문구",     rep: "교보문고", tel: "1544-1900", join: "20210405", emoji: "📚", cat: "학용품",    dist: 220,  channel: "offline", lat: 36.6406, lng: 127.4912, x: 52, y: 66 },
    { no: "CB10240005", nm: "분식나라",        se: "일반음식점", stts: "정상", addr: "충청북도 청주시 상당구 사직대로 361",     biz: "312-14-55208", bizType: "음식점업", bizItem: "분식",         rep: "최민정", tel: "043-255-8821", join: "20230510", emoji: "🍢", cat: "식비",      dist: 270,  channel: "offline", lat: 36.6447, lng: 127.4862, x: 24, y: 58 },
    { no: "CB10240006", nm: "CU 학원사거리점", se: "편의점",   stts: "정상", addr: "충청북도 청주시 서원구 학천로 45",        biz: "312-86-90233", bizType: "소매업",   bizItem: "체인화 편의점", rep: "정해성", tel: "043-298-4410", join: "20230820", emoji: "🏪", cat: "매점·간식", dist: 340,  channel: "offline", lat: 36.6452, lng: 127.4922, x: 74, y: 24 },
    { no: "CB10249001", nm: "네이버웹툰",      se: "온라인콘텐츠", stts: "정상", addr: null,                                  biz: "220-88-00642", bizType: "정보통신업", bizItem: "디지털콘텐츠", rep: "네이버웹툰", tel: "1588-3820", join: "20220301", emoji: "📱", cat: "문화",      dist: null, channel: "online",  lat: null, lng: null, x: 0, y: 0 },
    { no: "CB10249002", nm: "CGV 예매",        se: "온라인콘텐츠", stts: "정상", addr: null,                                  biz: "117-81-19130", bizType: "예술·여가", bizItem: "영화 상영",    rep: "씨제이씨지브이", tel: "1544-1122", join: "20220301", emoji: "🎬", cat: "문화",      dist: null, channel: "online",  lat: null, lng: null, x: 0, y: 0 },
  ];
  const vouchers = VOUCHER_DIR.map((m) => ({
    MERCHANT_NO:      m.no,
    MERCHANT_NM:      m.nm,
    VOUCHER_SE_NM:    m.se,
    LOCAL_GOV_NM:     "충청북도교육청",
    VOUCHER_STTS_NM:  m.stts,
    USE_YN:           "Y",
    ADDR:             m.addr,
    BIZ_NO:           m.biz,
    MOBILE_NO:        null,
    TEL_NO:           m.tel,
    BIZ_TYPE_NM:      m.bizType,
    BIZ_ITEM_NM:      m.bizItem,
    JOIN_YMD:         m.join,
    TERMINATION_YMD:  null,
    REPRESENTATIVE_NM: m.rep,
    FRST_RGTR_ID:     "system",
    FRST_RGTR_NM:     "배치등록",
    FRST_REG_DT:      m.join.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") + " 09:00:00",
  }));

  // 화면용 가맹점 뷰(기존 카드/지도가 쓰는 형태) — VOUCHER_DIR에서 파생
  const mapCenter = { lat: 36.6424, lng: 127.4890 }; // 청주 북문로 일대(내 위치)
  const merchants = VOUCHER_DIR.map((m) => ({
    name: m.nm, cat: m.cat, dist: m.dist, channel: m.channel,
    lat: m.lat, lng: m.lng, x: m.x, y: m.y, emoji: m.emoji, merchantNo: m.no,
  }));

  // ── TB_COM_PAY_API_LOG ── FOX PAY 결제 승인 로그(자동 결제 건마다 1행) ──
  //   용돈기입장의 'auto' 지출 = 실제 카드/QR 결제 → POS 승인 API 로그로 보관
  const merchantNoByName = (nm) => (VOUCHER_DIR.find((m) => m.nm === nm || m.nm.startsWith(nm)) || {}).no || null;
  const guessMerchantNo = (e) => {
    // 직접 매칭 실패 시 카테고리로 대표 가맹점 매핑(결정적)
    const direct = merchantNoByName(e.merchant || e.title);
    if (direct) return direct;
    const byCat = VOUCHER_DIR.find((m) => m.cat === e.cat);
    return byCat ? byCat.no : null;
  };
  const payApiLogs = ledgerSeed
    .filter((e) => e.type === "expense" && e.source === "auto")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((e, i) => {
      const ymd = e.date.replace(/-/g, "");
      const hm = (e.time || "12:00").replace(":", "");
      const dlng = `FOXPAY${ymd}${String(i + 1).padStart(5, "0")}`;
      const mNo = guessMerchantNo(e);
      const regDt = `${e.date} ${e.time || "12:00"}:00`;
      return {
        PAY_API_LOG_ID:  `PLOG${ymd}${String(i + 1).padStart(4, "0")}`,
        USER_ID:         USER.USER_ID,
        API_NM:          e.channel === "online" ? "ONLINE_APPROVAL" : "POS_APPROVAL",
        DLNG_UNQ_NO:     dlng,
        REQ_JSON:        JSON.stringify({ userId: USER.USER_ID, merchantNo: mNo, amount: e.amount, payType: e.payer === "부모카드" ? "FAMILY" : "VOUCHER", reqDt: regDt }),
        RES_JSON:        JSON.stringify({ resultCd: "0000", dlngUnqNo: dlng, encData: "AES256:••••••" }),
        RES_DECRYPT_JSON: JSON.stringify({ resultCd: "0000", dlngUnqNo: dlng, merchantNo: mNo, merchantNm: e.merchant || e.title, amount: e.amount, apprDt: regDt }),
        RESULT_CD:       "0000",
        RESULT_MSG:      "정상승인",
        FRST_RGTR_ID:    USER.USER_ID,
        FRST_REG_DT:     regDt,
        FRST_RGTR_IP_ADDR: "10.0.12.34",
      };
    });

  // ── TB_COM_ADBK ── 주소록(보호자·담임) — '충전 조르기' 알림 대상 ──
  const adbk = [
    { ADBK_SN: 1, USER_ID: USER.USER_ID, USER_NM: "김미경", USER_NICK_NM: "엄마",   USER_TELNO: "010-3456-7890", FRST_RGTR_ID: USER.USER_ID, FRST_RGTR_NM: USER.USER_NM, FRST_REG_DT: "2026-03-02 09:10:00", FRST_RGTR_IP_ADDR: "10.0.12.34" },
    { ADBK_SN: 2, USER_ID: USER.USER_ID, USER_NM: "김성호", USER_NICK_NM: "아빠",   USER_TELNO: "010-4567-8901", FRST_RGTR_ID: USER.USER_ID, FRST_RGTR_NM: USER.USER_NM, FRST_REG_DT: "2026-03-02 09:11:00", FRST_RGTR_IP_ADDR: "10.0.12.34" },
    { ADBK_SN: 3, USER_ID: USER.USER_ID, USER_NM: "이서연", USER_NICK_NM: "담임선생님", USER_TELNO: "010-5678-9012", FRST_RGTR_ID: USER.USER_ID, FRST_RGTR_NM: USER.USER_NM, FRST_REG_DT: "2026-03-04 14:20:00", FRST_RGTR_IP_ADDR: "10.0.12.34" },
  ];

  // 학교별 비교 모델 — 학교급(초등/중학/고등)별 충북 학교 소비
  //  · 우리 학교(me)=1.0 기준, 결정적 비율. value = 내 이번 달 총지출 × 비율
  //  · 실제 운영 시 학생복지 결제 집계 API의 학교급별 학교 평균으로 교체
  const SCHOOL_SETS = {
    초등: [
      { name: "청주중앙초", ratio: 1.16 },
      { name: "산남초",     ratio: 1.07 },
      { name: "운호초",     ratio: 1.02 },
      { name: "FOX초",      ratio: 1.00, me: true },
      { name: "솔밭초",     ratio: 0.93 },
      { name: "가경초",     ratio: 0.85 },
      { name: "충북 평균",  ratio: 1.10, avg: true },
    ],
    중학: [
      { name: "용암중",     ratio: 1.18 },
      { name: "청주중",     ratio: 1.09 },
      { name: "충주중",     ratio: 1.04 },
      { name: "FOX중",      ratio: 1.00, me: true },
      { name: "운호중",     ratio: 0.96 },
      { name: "상당중",     ratio: 0.88 },
      { name: "충북 평균",  ratio: PROV_RATIO, avg: true },
    ],
    고등: [
      { name: "세광고",     ratio: 1.21 },
      { name: "청주고",     ratio: 1.11 },
      { name: "충북고",     ratio: 1.05 },
      { name: "FOX고",      ratio: 1.00, me: true },
      { name: "운호고",     ratio: 0.97 },
      { name: "충주고",     ratio: 0.90 },
      { name: "충북 평균",  ratio: 1.14, avg: true },
    ],
  };
  const schoolCompareByGrade = {};
  for (const g of Object.keys(SCHOOL_SETS)) {
    schoolCompareByGrade[g] = SCHOOL_SETS[g].map((s) => ({ ...s, value: round100(monthTotal * s.ratio) }));
  }
  const schoolCompare = schoolCompareByGrade["중학"]; // 기본값(중학)

  // 일별 지출 (최근 7일 막대)
  const dayLabel = (iso) => {
    if (iso === TODAY) return "오늘";
    if (iso === dMinus(TODAY, 1)) return "어제";
    const d = new Date(iso + "T00:00:00");
    return (d.getMonth() + 1) + "/" + d.getDate();
  };
  const daySumExpense = (iso, ledger) => (ledger || ledgerSeed)
    .filter((e) => e.date === iso && e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const dailySpending = Array.from({ length: 7 }, (_, i) => {
    const iso = dMinus(TODAY, 6 - i);
    return { label: dayLabel(iso), iso, amount: daySumExpense(iso) };
  });

  // ── 추이 (월별) ─────────────────────────────────────────────────
  // 월별 추이 — 최근 12개월 실제 데이터 (오래된→최신). N개월 질의 시 잘라서 사용
  const monthlyTrendAll = [];
  for (let i = 11; i >= 0; i--) {
    const r = monthRangeOf(monthAnchorBack(i));
    monthlyTrendAll.push({ label: (+r.start.slice(5, 7)) + "월", amount: sumExpenseIn(r), start: r.start, end: r.end });
  }
  const monthlyTrend = monthlyTrendAll.slice(-3);

  // 조르기 월별 집계 + 또래 평균 (결정적)
  const nudgeByMonth = monthlyTrendAll.map((m) => {
    const ns = nudgesIn({ start: m.start, end: m.end });
    return { label: m.label, count: ns.length, amount: ns.reduce((s, e) => s + e.amount, 0) };
  });
  const myNudge = nudgeByMonth[nudgeByMonth.length - 1] || { count: 0, amount: 0 };
  const avgMonthlySpend = Math.round(monthlyTrend.reduce((s, m) => s + m.amount, 0) / monthlyTrend.length);

  // ── 기타 핵심 지표 ───────────────────────────────────────────────
  const convenience = { amount: (monthCategories.find((c) => c.name === "매점·간식") || { value: 0 }).value, deltaPct: 34 };
  const voucherBalance = 45000;                        // 바우처 잔액
  const points = 1000;                                 // 에듀페이 포인트 잔액
  const ocrResult = { amount: 4500, cat: "식비", memo: "GS25 편의점", emoji: "🏪" };

  const incomeCats  = [ { key: "용돈", emoji: "💸" }, { key: "선물", emoji: "🎁" }, { key: "기타수입", emoji: "💰" } ];
  const expenseCats = [ { key: "식비", emoji: "🍱" }, { key: "교통", emoji: "🚌" }, { key: "학용품", emoji: "📚" }, { key: "문화", emoji: "🎮" }, { key: "기타", emoji: "💡" } ];

  // ── 금융교육 추천: 상단 멘트 (학년별) ────────────────────────────
  const recommendIntro = {
    초등: `이번 달 매점·간식에 ${num(convenience.amount)}원 썼어요! 🍫\n도움 되는 걸 골라봤어요 👇`,
    중학: `이번 달 편의점 지출이 ${convenience.deltaPct}% 늘었어! 📈\n네 소비 데이터에 맞는 콘텐츠를 추천해 👇`,
    고등: `편의점 지출이 전월 대비 ${convenience.deltaPct}% 증가했습니다.\n소비 데이터 기반으로 콘텐츠를 추천드려요 👇`,
  };

  // ── 금융교육 추천 콘텐츠 (학년별 3개 + 모달 페이로드) ────────────
  const recommendContent = {
    초등: [
      {
        id: "e1", emoji: "🛒", badge: "초등", tag: "소비 이해", color: "#D99A36",
        title: "필요한 것 vs 갖고 싶은 것", highlight: `이번 달 매점·간식 ${num(18200)}원`, readTime: "3분", widget: "quiz",
        summary: "이번 달 매점·간식에 18,200원을 썼어요. 다른 곳보다 많았답니다! 🍫",
        concept: "'필요한 것'은 꼭 있어야 하는 거예요 (예: 공책, 버스비).\n'갖고 싶은 것'은 없어도 괜찮은 거예요 (예: 과자, 장난감).\n사기 전에 둘 중 뭔지 생각해봐요! 😊",
        tips: ["사기 전에 '필요해?' 3초 생각하기", "갖고 싶은 건 다음 주에 다시 생각하기", "용돈의 반은 꼭 남기기"],
        goalLabel: "이번 주 간식 목표 금액",
        quiz: { kind: "ox", q: "'학교 갈 때 타는 버스비'는 필요한 것일까요?", options: [{ label: "맞아요 (필요해요)", correct: true }, { label: "아니에요" }], explain: "버스비는 학교에 가려면 꼭 필요해요! 🚌" },
      },
      {
        id: "e2", emoji: "🐷", badge: "초등", tag: "저축 습관", color: "#2E9E7B",
        title: "저금통 미션 도전!", highlight: "하루 1,000원이면 한 달 30,000원!", readTime: "5분", widget: "mission",
        summary: "지난달 71,000원, 이번 달 78,500원 썼어요. 조금만 아끼면 저금할 수 있어요!",
        concept: "매일 조금씩 모으면 큰돈이 돼요.\n저금통에 1,000원씩 넣어볼까요? 🐷\n한 달이면 30,000원이나 모인답니다!",
        tips: ["매일 1,000원 저금통에 넣기", "군것질 한 번 참고 저금하기", "목표를 적어서 저금통에 붙이기"],
        goalLabel: "한 달 저축 목표 금액",
        quiz: { kind: "ox", q: "매일 1,000원씩 30일 모으면 30,000원이 될까요?", options: [{ label: "맞아요", correct: true }, { label: "아니에요" }], explain: "1,000원 × 30일 = 30,000원! 대단하죠? 🎉" },
      },
      {
        id: "e3", emoji: "🎮", badge: "초등", tag: "소비 게임", color: "#5B4DD6",
        title: "소비왕 OX 퀴즈", highlight: "퀴즈 풀고 소비왕 배지 받기!", readTime: "3분", widget: "quiz",
        summary: "내 소비 습관, 퀴즈로 확인해봐요!",
        concept: "돈을 똑똑하게 쓰는 방법을 퀴즈로 배워봐요!\n정답을 맞히면 소비왕이 될 수 있어요 👑",
        tips: ["받은 용돈은 바로 다 쓰지 않기", "사고 싶은 게 있으면 가격 비교하기", "영수증 모으기"],
        goalLabel: "이번 주 절약 목표 금액",
        quiz: { kind: "ox", q: "용돈을 받으면 바로 다 쓰는 게 좋을까요?", options: [{ label: "좋아요" }, { label: "아니에요", correct: true }], explain: "조금 남겨두면 갑자기 필요할 때 쓸 수 있어요! 😊" },
      },
    ],
    중학: [
      {
        id: "m1", emoji: "📊", badge: "중등", tag: "소비 진단", color: "#5B4DD6",
        title: "내 소비 유형 진단", highlight: "식비 43% · 매점 23% · 교통 11%", readTime: "4분", widget: "diagnose",
        summary: "이번 달 78,500원 중 식비가 43%로 가장 높아요. 매점·간식도 23%!",
        concept: "소비 유형은 돈을 어디에 많이 쓰는지를 보여줘.\n너는 '먹는 데 진심인 타입'! 식비·간식 비중이 높아.\n나쁜 건 아니지만, 비중을 알면 조절하기 쉬워 😉",
        tips: ["가장 큰 지출 항목부터 점검하기", "간식은 일주일 예산 정해두기", "주 1회 소비 돌아보기"],
        goalLabel: "줄이고 싶은 항목 목표 금액",
        quiz: { kind: "mc", q: "이번 달 가장 많이 쓴 항목은?", options: [{ label: "식비", correct: true }, { label: "교통" }, { label: "학용품" }], explain: "식비가 33,500원으로 전체의 43%였어요!" },
      },
      {
        id: "m2", emoji: "💡", badge: "중등", tag: "예산 관리", color: "#2E9E7B",
        title: "예산 50/30/20 계산기", highlight: "내 월 용돈으로 예산 자동 계산", readTime: "6분", widget: "budget",
        summary: "월 평균 지출 71,500원과 비교해서 예산을 짜보자!",
        concept: "50/30/20 규칙: 용돈의 50%는 꼭 필요한 곳(필수),\n30%는 갖고 싶은 것, 20%는 저축!\n균형 잡힌 소비 습관의 기본이야.",
        tips: ["월 초에 예산 먼저 정하기", "저축 20%는 먼저 떼어두기", "주별로 남은 예산 확인하기"],
        goalLabel: "이번 달 저축 목표 금액",
        quiz: { kind: "mc", q: "50/30/20에서 '20'은 무엇일까요?", options: [{ label: "저축", correct: true }, { label: "간식" }, { label: "교통" }], explain: "20%는 미래를 위한 저축이에요! 💰" },
      },
      {
        id: "m3", emoji: "⚠️", badge: "중등", tag: "소비 습관", color: "#D99A36",
        title: "충동구매 탈출법", highlight: `편의점 ${num(18200)}원 (+34%)`, readTime: "5분", widget: "quiz",
        summary: "이번 달 편의점 지출이 지난달보다 34% 늘었어요. 충동구매 신호일 수 있어!",
        concept: "충동구매는 계획 없이 '그냥' 사는 거야.\n편의점·매점에서 자주 생겨.\n사기 전 10초만 멈춰도 많이 줄일 수 있어!",
        tips: ["편의점 갈 땐 살 것만 정하고 가기", "'10초 멈춤' 규칙 지키기", "현금만 들고 가기"],
        goalLabel: "다음 달 편의점 지출 목표 금액",
        quiz: { kind: "ox", q: "편의점에서 계획 없이 자주 사면 충동구매일까요?", options: [{ label: "맞아요", correct: true }, { label: "아니에요" }], explain: "계획 없는 잦은 소비가 바로 충동구매예요!" },
      },
    ],
    고등: [
      {
        id: "h1", emoji: "💰", badge: "고등", tag: "저축·투자", color: "#5B4DD6",
        title: "복리 시뮬레이터", highlight: "매달 모으면 얼마? 직접 계산", readTime: "8분", widget: "compound",
        summary: "이번 달 절약 가능액을 저축한다면? 복리로 계산해 봅니다.",
        concept: "복리는 '이자에 이자가 붙는' 구조입니다.\n원금뿐 아니라 누적 이자에도 이자가 붙어,\n기간이 길수록 단리와의 격차가 커집니다.",
        tips: ["일찍 시작할수록 복리 효과가 큽니다", "매달 자동이체로 강제 저축", "이율보다 '꾸준함'이 더 중요합니다"],
        goalLabel: "월 저축 목표 금액",
        quiz: { kind: "mc", q: "복리가 단리보다 유리해지는 핵심 조건은?", options: [{ label: "긴 기간", correct: true }, { label: "짧은 기간" }, { label: "관계 없음" }], explain: "기간이 길수록 복리 효과가 커집니다!" },
      },
      {
        id: "h2", emoji: "📉", badge: "고등", tag: "데이터 분석", color: "#2E9E7B",
        title: "나의 소비 성향 진단", highlight: "3개월 추이 65,000 → 78,500원", readTime: "7분", widget: "diagnose",
        summary: "최근 3개월 지출이 65,000 → 71,000 → 78,500원으로 우상향했습니다 (+20.8%).",
        concept: "소비 성향 진단은 지출 추세와 변동성을 분석합니다.\n최근 3개월 우상향 추세이며,\n변동성이 큰 항목(매점·간식)이 증가를 견인했습니다.",
        tips: ["증가 추세 항목을 우선 점검", "고정지출과 변동지출 분리", "월 예산 상한선 설정"],
        goalLabel: "다음 달 지출 상한 목표 금액",
        quiz: { kind: "mc", q: "최근 3개월 지출 추세는?", options: [{ label: "증가", correct: true }, { label: "감소" }, { label: "일정" }], explain: "65,000 → 78,500원으로 약 20.8% 증가했습니다." },
      },
      {
        id: "h3", emoji: "🏠", badge: "고등", tag: "재무 설계", color: "#8E82E0",
        title: "대학생 생활비 예측", highlight: "현재 패턴 기반 월 생활비 추정", readTime: "10분", widget: "quiz",
        summary: "현재 월 78,500원 소비 구조를 자취 대학생 생활에 대입하면 월 약 45만원이 예상됩니다.",
        concept: "생활비 예측은 현재 소비 구조의 비중이 유지된다고 가정하고\n미래 규모를 추정합니다.\n식비 비중이 높아, 자취 시 식비 관리가 핵심 변수입니다.",
        tips: ["식비 비중 관리가 핵심", "고정비(주거·통신) 먼저 확보", "비상금 3개월치 목표"],
        goalLabel: "목표 월 생활비",
        quiz: { kind: "mc", q: "자취 대학생의 가장 큰 변수는?", options: [{ label: "식비 관리", correct: true }, { label: "문화비" }, { label: "교통비" }], explain: "식비 비중이 높아 자취 시 가장 큰 변수입니다." },
      },
    ],
  };

  // ── 키워드 → 의도 분류 ───────────────────────────────────────────
  function classify(text) {
    const t = (text || "").replace(/\s/g, "");
    if (/(용돈기입장|기입장|기입|가계부|기록|내역|지출목록)/.test(t)) return "ledger";
    if (/(분석|패턴|리포트|보고서|습관|추이)/.test(t)) return "report";
    if (/(추천|공부|학습|교육|배우|금융)/.test(t)) return "recommend";
    if (/(얼마|소비|썼|지출|결제|이번달|사용|바우처|잔액)/.test(t)) return "spending";
    return "offtopic";
  }

  // ── 학년별 응답 텍스트 ───────────────────────────────────────────
  const top = monthCategories[0]; // 식비
  const topPct = Math.round((top.value / monthTotal) * 100);

  const responses = {
    spending: {
      초등: `안녕! 🌟 이번 달 FOX PAY로 쓴 돈 알려줄게요!\n🍱 식비 ${num(33500)}원  🏪 매점·간식 ${num(18200)}원\n📚 학용품 ${num(12000)}원  🚌 교통 ${num(8500)}원\n💰 합계 ${num(monthTotal)}원이에요! 지난달보다 조금 더 썼어요 😊`,
      중학: `이번 달 FOX PAY 소비는 총 ${won(monthTotal)}야.\n제일 많이 쓴 건 ${top.name}(${won(top.value)})! 지난달보다 ${num(monthTotal - lastMonthTotal)}원 더 썼어 📈\n바우처 잔액은 ${won(voucherBalance)} 남았어!`,
      고등: `이번 달 FOX PAY 소비 현황입니다 📊\n총 소비: ${won(monthTotal)} (전월 대비 +${deltaPct}%)\n${top.name} ${topPct}% · 매점·간식 23% · 학용품 15%\n${top.name} 비중이 높게 나타났습니다. 바우처 잔액 ${won(voucherBalance)}.`,
    },
    report: {
      초등: `소비 습관을 살펴봤어요! 📊\n2주차에 가장 많이 썼고, 그 뒤로 점점 아꼈어요 👏\n[주간]과 [월간]을 눌러서 비교해봐요!`,
      중학: `소비 흐름을 분석해봤어.\n2주차(${won(24500)})에 지출이 몰렸고, 최근 3개월은 계속 늘고 있어 📈\n[주간]·[월간] 탭으로 자세히 볼 수 있어!`,
      고등: `소비 추이를 분석했습니다.\n주간은 2주차 피크 후 안정세, 월간은 3개월 연속 우상향(+20.8%)입니다.\n변동성이 큰 매점·간식을 고정 예산화하면 편차를 줄일 수 있어요.`,
    },
    ledger: {
      초등: `용돈기입장이에요! 📓\n[내역 보기]로 쓴 돈을 보고,\n[직접 입력]에서 사진으로 자동 입력도 할 수 있어요 📷✨`,
      중학: `용돈기입장이야.\nFOX PAY 결제는 자동으로 기록되고, [직접 입력] 탭에서 영수증 사진을 찍으면 빠르게 추가돼! 🗂️`,
      고등: `용돈기입장입니다.\nFOX PAY 결제는 자동으로 연동되며, [직접 입력] 탭에서 영수증 사진을 찍으면 현금 거래도 등록·수정·삭제할 수 있습니다.`,
    },
    recommend: {
      초등: recommendIntro["초등"],
      중학: recommendIntro["중학"],
      고등: recommendIntro["고등"],
    },
    offtopic: {
      초등: `앗, 그건 잘 모르겠어요 😅\n저는 FOX PAY 결제 데이터 기반으로만 답변할 수 있어요 😊\n"이번 달에 얼마 썼어?"처럼 물어봐요!`,
      중학: `미안! 그건 도와주기 어려워.\n난 FOX PAY 결제 데이터 기반으로만 답변할 수 있어 😊\n아래 자주 쓰는 질문을 눌러봐 👇`,
      고등: `해당 질문은 답변하기 어렵습니다.\n저는 FOX PAY 결제 데이터 기반으로만 답변할 수 있어요 😊\n소비 조회·분석·용돈기입장·금융학습을 도와드립니다.`,
    },
  };

  function answer(intent, grade) {
    const g = responses[intent] || responses.offtopic;
    return g[grade] || g["중학"];
  }

  // ── 실제 AI용 시스템 프롬프트 (학생 소비 데이터 주입) ────────────
  const GRADE_KO = { "초등": "초등학생", "중학": "중학생", "고등": "고등학생" };
  function buildSystemPrompt(grade, ledger) {
    const data = ledger || ledgerSeed;
    const catLines = monthCategories
      .map((c) => `  - ${c.name}: ${won(c.value)} (${Math.round((c.value / monthTotal) * 100)}%)`)
      .join("\n");
    const trend = monthlyTrend.map((m) => `${m.label} ${won(m.amount)}`).join(" → ");
    const week = dailySpending.map((w) => `${w.label} ${won(w.amount)}`).join(", ");
    const led = [...data]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => `  - ${e.date} [${e.type === "income" ? "수입" : "지출"}] ${e.cat}/${e.title} ${won(e.amount)}`)
      .join("\n");
    // 날짜별 지출 합계(최근 5일) — 날짜 특정 질문에 정확히 답하기 위함
    const daySum = (iso) => data
      .filter((e) => e.date === iso && e.type !== "income")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const dayLabels = ["오늘", "어제", "그저께", "3일 전", "4일 전"];
    const dayLines = dayLabels
      .map((lbl, i) => {
        const iso = dMinus(TODAY, i);
        const sum = daySum(iso);
        return `  - ${lbl}(${iso}) 지출: ${sum > 0 ? won(sum) : "0원 (기록 없음)"}`;
      })
      .join("\n");
    const tone = {
      초등: "상대는 초등학생이야. 반말로, 아주 쉽고 다정하게 말해. 어려운 한자어·금융용어는 풀어서 설명하고, 이모지를 1~2개 자연스럽게 써.",
      중학: "상대는 중학생이야. 친근한 반말로, 핵심을 짚어 간결하게 말해. 이모지는 가끔만.",
      고등: "상대는 고등학생이야. 정중한 존댓말로, 군더더기 없이 똑똑하고 간결하게. 필요하면 구체적인 수치를 활용해.",
    }[grade] || "친근한 반말로 간결하게 말해.";

    return `너는 'FOX PAY'의 AI 금융친구야. 이름은 '폭스', 충청북도 학생들의 용돈과 소비를 도와주는 다정한 여우 캐릭터지.
${tone}

[역할 범위]
- 학생의 소비 조회·분석, 용돈 관리, 금융·경제 학습만 도와줘.
- 숙제 풀이·일반 상식·코딩·시사 등 범위 밖 질문은 정중히 거절하고 "소비·용돈 이야기로 도와줄게"라고 자연스럽게 유도해.
- 아래 '학생 데이터'에 있는 숫자만 근거로 써. 없는 수치는 지어내지 말고, 모르면 모른다고 해.

[날짜 처리 규칙 — 최우선, 반드시 이 순서대로]
1) 사용자가 말한 기간을 먼저 "시작일 ~ 종료일"(YYYY-MM-DD)로 변환한다.
   · "5월/5월달/5월 내역" → 그 해 05-01 ~ 05-31
   · "5/10" 또는 "5월 10일" → 그 해 05-10 ~ 05-10 (그 하루만). M/D는 한국식 월/일 (5/10=5월10일, 절대 10월5일 아님)
   · "이번 달" → 오늘 기준 이번 달 1일~말일, "지난달" → 직전 달 1일~말일
   · "최근/요즘" → 오늘 기준 최근 7일
   · 연도를 안 말하면 항상 오늘 날짜의 연도를 쓴다.
2) 응답 맨 첫 줄에 변환한 기간을 표기한다. 예) "📅 ${TODAY.slice(0, 4)}년 5월 10일 내역이에요"
3) '용돈기입장' 전체를 처음부터 끝까지 확인해, 거래일이 [시작일 ≤ 거래일 ≤ 종료일]에 드는 건만 포함한다. 범위 밖 거래는 한 건도 넣지 말고, 범위 안 거래는 한 건도 빠뜨리지 마.
4) 해당 기간 거래가 0건이면 지어내지 말고 "그 기간엔 기록이 없어"라고 그대로 안내한다.
5) 건수·합계는 통과한 거래만으로 다시 계산한다. 기간 밖 금액을 합계에 절대 섞지 마. 수입(용돈·지원금·충전금)은 지출 합계와 분리해 표기한다.
- 기간을 안 밝히고 "얼마 썼어?"라고만 물으면 이번 달 기준으로 답해.
- 한국어로만, 2~5줄로 짧게 답해. 마크다운 표·별표(**)·머리말 기호는 쓰지 마.

[학생 데이터 — 전부 FOX PAY 결제 기반, 가상 데이터]
- 학년: ${GRADE_KO[grade] || grade}
- 이번 달(${mLabel(0)}) 총 소비: ${won(monthTotal)} (지난달 ${won(lastMonthTotal)}, 전월 대비 +${deltaPct}%)
- 카테고리별:
${catLines}
- 날짜별 지출(최근 5일):
${dayLines}
- 최근 7일 일별: ${week}
- 최근 3개월 추이: ${trend} (월 평균 ${won(avgMonthlySpend)})
- 편의점 이번 달: ${won(convenience.amount)} (지난달 대비 +${convenience.deltaPct}%)
- 바우처 잔액: ${won(voucherBalance)}
- 용돈기입장(최근):
${led}

[할 수 있는 일]
- 너는 학생을 대신해 용돈기입장에 항목을 직접 추가할 수 있어. "기록해줘 / 써줘 / 적어줘 / 추가해줘" 같은 요청이 오면 거절하지 말고 아래 action으로 실제로 기록해.
- 날짜·금액·내용이 빠졌으면 짧게 되물어보고, 정보가 충분하면 바로 기록한 뒤 "기록했어!"라고 확인해줘.

[오늘 날짜] ${TODAY} (연도 안 적으면 ${TODAY.slice(0, 4)}년으로 가정)

[출력 형식 — 매우 중요]
반드시 아래 JSON 객체 '하나만' 출력해. 코드블록·설명 없이 JSON만.
{"reply": "학생에게 보여줄 답변", "card": "spending"|"report"|"ledger"|"recommend"|"none", "action": null 또는 {"op":"addLedger","type":"expense"|"income","date":"YYYY-MM-DD","cat":"분류","title":"내용","amount":숫자,"memo":"메모"}}
card 규칙:
- 이번 달/얼마/지출 금액·잔액 관련 → "spending"
- 추이·패턴·습관·분석·리포트 → "report"
- 용돈기입장·기록·내역·가계부, 그리고 action으로 기록했을 때 → "ledger"
- 금융 공부·추천·배우기 → "recommend"
- 그 외(인사·잡담·범위 밖) → "none"
action 규칙:
- 기입장에 추가해달라는 요청이고 정보가 충분할 때만 action을 채워. 그 외엔 반드시 null.
- type: 쓴 돈은 "expense", 받은 돈(용돈·선물 등)은 "income".
- cat(지출): 식비/교통/학용품/문화/기타 중 하나. cat(수입): 용돈/선물/기타수입 중 하나. (편의점·간식·매점은 "식비")
- title: 가게나 내용을 짧게(예: "편의점", "GS25"). amount: 원 단위 정수.
- action을 채웠으면 card는 "ledger"로 하고, reply에 무엇을 기록했는지 한 줄로 확인해줘.`;
  }

  // ── 맞춤 금융 퀴즈: 학생 실제 소비 데이터로 문제 생성 ──────────────
  function buildQuiz(grade) {
    const cats = monthCategories.slice();
    const top = cats[0] || { name: "식비", value: 0 };
    const conv = convenience;
    const seedBase = (top.name || "").length + curM;
    const shuffle = (arr, seed) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = Math.floor(seed / 233280 * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    };
    const mc = (q, opts, explain, seed) => ({ kind: "mc", q, options: shuffle(opts, seed), explain });
    const ox = (q, yes, explain) => ({ kind: "ox", q, options: [{ label: "맞아요", correct: yes }, { label: "아니에요", correct: !yes }], explain });

    // 소비 패턴 기반 '관심 주제' (개념 문제를 고르는 데 사용 — 숫자 암기가 아니라 금융 지식)
    const convHeavy = conv.deltaPct >= 0 || top.name === "매점·간식" || top.name === "식비";

    // 학년별 금융 지식 문제 풀 (실제 금융 개념)
    const POOL = {
      초등: [
        mc("다음 중 '꼭 필요한 것(필요)'은 무엇일까요?", [{ label: "학교 가는 버스비", correct: true }, { label: "새로 나온 장난감" }, { label: "게임 아이템" }], "버스비처럼 없으면 안 되는 게 '필요', 없어도 되는 건 '갖고 싶은 것'이에요.", 3),
        ox("사고 싶은 게 생기면, 사기 전에 '정말 필요할까?' 한 번 생각하는 게 좋을까요?", true, "사기 전 잠깐 멈춰 생각하면 충동구매를 줄일 수 있어요.", ),
        mc("'저축'은 무엇을 말할까요?", [{ label: "돈을 조금씩 모으는 것", correct: true }, { label: "돈을 한 번에 다 쓰는 것 " }, { label: "친구에게 빌리는 것" }], "저축은 쓰지 않고 모아두는 거예요. 작은 돈도 모이면 커져요!", 5),
        mc("용돈기입장을 쓰면 좋은 점은?", [{ label: "돈을 어디에 썼는지 알 수 있다", correct: true }, { label: "돈이 저절로 늘어난다" }, { label: "숙제가 줄어든다" }], "기록하면 내 소비 습관이 한눈에 보여요.", 8),
        ox("친구가 산다고 나도 따라서 바로 사는 건 좋은 소비 습관일까요?", false, "남을 따라 사기보다 내게 정말 필요한지 먼저 생각해요.", ),
      ],
      중학: [
        mc("50·30·20 예산 규칙에서 '20'은 무엇일까?", [{ label: "저축", correct: true }, { label: "갖고 싶은 것" }, { label: "꼭 필요한 것" }], "50%는 필수, 30%는 갖고 싶은 것, 20%는 저축이에요.", 4),
        mc("충동구매를 줄이는 가장 좋은 방법은?", [{ label: "사기 전 10초 멈추고 생각하기", correct: true }, { label: "배고플 때 장보기" }, { label: "매일 편의점 들르기" }], "잠깐 멈추는 '10초 규칙'만으로도 불필요한 소비가 줄어요.", 9),
        mc("'예산을 세운다'는 것은 무슨 뜻일까?", [{ label: "쓸 돈을 미리 정해두는 것", correct: true }, { label: "돈을 전부 쓰는 것" }, { label: "돈을 아예 안 쓰는 것" }], "예산은 미리 한도를 정해 계획적으로 쓰는 거예요.", 12),
        mc("같은 물건을 살 때 '가격 비교'를 하면 좋은 점은?", [{ label: "더 싸게 살 수 있다", correct: true }, { label: "품질이 나빠진다" }, { label: "돈이 더 든다" }], "조금만 비교해도 같은 물건을 더 저렴하게 살 수 있어요.", 15),
        ox("'필요(needs)'와 '갖고 싶은 것(wants)' 중에서는 필요를 먼저 챙기는 게 좋을까?", true, "한정된 용돈은 꼭 필요한 것부터 쓰는 게 현명해요.", ),
      ],
      고등: [
        mc("복리가 단리보다 유리해지는 핵심 조건은?", [{ label: "오래 투자할수록", correct: true }, { label: "짧게 투자할수록" }, { label: "관계없다" }], "복리는 이자에 이자가 붙어 기간이 길수록 효과가 커져요.", 4),
        mc("50·30·20 예산 규칙에서 '30'은 무엇일까?", [{ label: "갖고 싶은 것(여가·취미)", correct: true }, { label: "꼭 필요한 것" }, { label: "저축" }], "30%는 여가·취미 같은 '갖고 싶은 것'에 배정해요.", 7),
        mc("비상금은 보통 어느 정도를 목표로 모을까?", [{ label: "생활비 3개월치 정도", correct: true }, { label: "하루치" }, { label: "10년치" }], "갑작스런 일에 대비해 3개월치 생활비가 일반적인 목표예요.", 11),
        mc("신용점수를 높이는 좋은 습관은?", [{ label: "연체 없이 제때 갚기", correct: true }, { label: "갚지 않고 미루기" }, { label: "최대한 많이 빌리기" }], "약속한 날 제때 갚는 기록이 쌓이면 신용이 좋아져요.", 14),
        mc("물가(인플레이션)가 오르면 같은 돈의 가치는?", [{ label: "떨어진다", correct: true }, { label: "올라간다" }, { label: "변화 없다" }], "물가가 오르면 같은 돈으로 살 수 있는 게 줄어요. 그래서 저축·투자가 중요해요.", 17),
      ],
    };
    const pool = POOL[grade] || POOL["중학"];
    // 관심 주제(충동구매/소비 습관) 문제를 앞으로 — 학생 패턴과 연결
    const ordered = convHeavy ? pool : shuffle(pool, seedBase);
    return ordered.slice(0, 4);
  }

  return {
    monthCategories, weekCategories, monthTotal, weekTotal, lastMonthTotal, deltaPct,
    dailySpending, monthlyTrend, monthlyTrendAll, avgMonthlySpend, convenience, voucherBalance, points, ocrResult,
    compareTotals, nudgeByMonth, supportTotal, supportUsed, supportRemaining, merchants, mapCenter, schoolCompare, schoolCompareByGrade,
    sumExpenseIn, thisMonthRange,
    schema: { user: USER, userOf: makeUser, vouchers, payApiLogs, adbk },
    TODAY, dMinus, dayLabel, daySumExpense, CAT_META, weekRange, weekRangeOf, monthRangeOf,
    ledgerSeed, incomeCats, expenseCats,
    recommendIntro, recommendContent,
    classify, answer, buildSystemPrompt, buildQuiz, won, num,
  };
})();

/* 가로 스크롤 컨테이너에 마우스 드래그 + 휠 가로스크롤 부여 (터치는 네이티브 유지) */
export const dragScroll = function (el) {
  if (!el || el.__dragInit) return;
  el.__dragInit = true;
  let down = false, startX = 0, startLeft = 0, moved = 0;
  el.style.cursor = "grab";
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return; // 터치/펜은 네이티브 스크롤
    down = true; moved = 0; startX = e.clientX; startLeft = el.scrollLeft;
    el.style.cursor = "grabbing";
  });
  el.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    el.scrollLeft = startLeft - dx;
  });
  const end = () => { down = false; el.style.cursor = "grab"; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("pointerleave", end);
  // 드래그 후 발생하는 클릭은 무시(버튼 오선택 방지)
  el.addEventListener("click", (e) => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } }, true);
  // 세로 휠 → 가로 스크롤
  el.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
};
