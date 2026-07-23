// ② 표현 config (★편집 지점★) — TEMPLATE_설계.md §3
// intent별 { template, title, subtitle, badge, options, insight(data) }.
// 제목·부제·배지·💡문구·옵션은 '여기서만' 편집. 같은 template을 여러 intent가 공유(N:1).
// 데이터(§4 표준형)는 queries.js shaper가, 렌더는 charts/templates/* 가 담당(텍스트/필드 하드코딩 없음).
import { num, won } from "./util";

export const INTENT_CONFIG = {
  // ① report (bar) — 월/일 토글. 탭별 제목·부제·배지·insight는 tabs로 분기(같은 bar 템플릿 사용).
  report: {
    template: "bar",
    options: { toggle: ["month", "day"], breakdown: true, breakdownHeader: "결제수단별 · 합계", loadingText: "일별 내역 불러오는 중…", errorText: "일별 내역을 불러오지 못했어요.", retryText: "다시 시도" },
    tabs: {
      month: {
        title: "월별 사용 내역", subtitle: "FOX PAY 결제 · 월별 추이", badge: "최근 3개월",
        // 당월(막대 key === 오늘 YYYYMM) 처리: 비교는 완결월끼리(당월 제외), 당월은 별도 안내.
        //   · 당월에 사용액 있으면 "지금까지 N원 썼어요"(집계중 문구 금지 — 데이터 있는데 오해 소지).
        //   · 당월 데이터 없으면(series에 당월 막대 없음) "아직 사용 내역이 없어요".
        //   · 과거만 조회(당월 막대 없음)면 마지막 vs 직전 비교(기존).
        insight: (d) => {
          const s = d.series || [];
          if (!s.length) return "";
          const curKey = d.currentMonthKey;
          const curBar = curKey ? s.find((x) => x.key === curKey) : null; // 당월 막대(있으면)
          const curLabel = curKey ? ((+String(curKey).slice(5, 7) || "") + "월") : "";
          const pool = curBar ? s.filter((x) => x.key !== curKey) : s; // 비교 대상 = 완결월(당월 제외)
          const cur = pool[pool.length - 1], prev = pool[pool.length - 2];
          // 당월 안내: 데이터 있으면 실제 사용액, 없으면 '아직 사용 내역 없음'(집계중 문구 폐기)
          const note = curBar
            ? ` ${curLabel}은 지금까지 ${won(curBar.value)} 썼어요.`
            : (curLabel ? ` ${curLabel}은 아직 사용 내역이 없어요.` : "");
          if (cur && prev && prev.value) {
            const diff = cur.value - prev.value, pct = Math.round(Math.abs(diff) / prev.value * 100);
            const msg = diff >= 0
              ? `${cur.label}은 ${prev.label}보다 ${won(diff)}(${pct}%) 더 썼어. 다음 달엔 조금 아껴볼까? 💪`
              : `${cur.label}은 ${prev.label}보다 ${won(-diff)}(${pct}%) 덜 썼어. 잘하고 있어 👏`;
            return msg + note;
          }
          if (cur) return `${cur.label}에 ${won(cur.value)} 썼어.${note || " 계획해서 써보자 📊"}`;
          // 완결월 없음(당월 데이터뿐) → 당월 사용액만 안내(집계중 문구 없이)
          return curBar ? `${curLabel}에 지금까지 ${won(curBar.value)} 썼어 📊` : "";
        },
      },
      day: {
        title: "일별 사용 내역", subtitle: "FOX PAY 결제 · 일별 흐름", badge: "최근 7일",
        insight: (d) => {
          const s = d.series || [];
          if (!s.length) return "";
          const sum = s.reduce((a, x) => a + (x.value || 0), 0);
          return `최근 ${s.length}일 동안 ${won(sum)} 썼어. 하루 평균 ${won(Math.round(sum / s.length))} 정도야 📊`;
        },
      },
    },
  },

  // ② catSpend (donut)
  catSpend: {
    template: "donut",
    title: "사용처별 사용 내역", subtitle: "업종별 사용 금액 · 가맹점 기준", // badge 제거: operia 쿼리에 기간 필터 없음(전체 기간)
    insight: (d) => {
      const slices = d.slices || [];
      const t = slices[0];
      if (!t) return "";
      if (slices.length === 1) return `${t.label}에서 ${num(t.value)}원 썼어.`;  // 단일 항목: "가장 커·전체의 100%" 자명해서 생략
      return `${t.label}이(가) 가장 커 (${num(t.value)}원, 전체의 ${t.pct}%).`;
    },
  },

  // ③ friendCompare (barlist) — 나/우리 학교 평균/충북 전체 평균 3막대, "나" 강조(N:1: schoolCompare와 공유 barlist)
  friendCompare: {
    template: "barlist",
    title: "친구들과 사용 비교", subtitle: "같은 학년 평균과 비교",
    options: { me: true, rank: false, avgRow: false, unit: "원", showPct: false },
    insight: (d) => {
      const items = (d && d.items) || [];
      const me = items.find((x) => x.me);
      const school = items.find((x) => /우리\s*학교/.test(String(x.label)));
      if (!me || !school || !school.value) return "";
      const diff = me.value - school.value;
      return diff >= 0
        ? `우리 학교 같은 학년 평균보다 ${num(Math.abs(diff))}원 더 썼어. 계획해서 써보자 📊`
        : `우리 학교 같은 학년 평균보다 ${num(Math.abs(diff))}원 덜 썼어. 잘 쓰고 있어 👏`;
    },
  },

  // ④ nudgeCompare (trend)
  nudgeCompare: {
    template: "trend",
    title: "내 조르기 추이", subtitle: "이번 달 vs 지난달 · 월별 충전 요청", badge: "이번 달",
    // countNoun/valueNoun = 박스 명사(접두 '이번 달'/'N월'은 trend.jsx 가 current.isCurrentMonth 로 결정). countBox/valueBox 는 폴백.
    options: { labels: { countBox: "이번 달 충전 요청", valueBox: "이번 달 충전 금액", countNoun: "충전 요청", valueNoun: "충전 금액", monthlyHeader: "월별 충전 요청", countUnit: "회" } },
    // 정직 표시: 이전 달이 있을 때만 비교 문구, 없으면 중립(지어내지 않음).
    insight: (d) => {
      const cur = d.current || {};
      const head = cur.isCurrentMonth ? "이번 달" : (cur.label || "");
      if (!d.prev) return cur.count != null ? `${head} ${cur.count}번 충전 요청했어.` : "";
      const dc = d.delta || 0;
      return dc > 0
        ? `${d.prev.label}보다 ${dc}번 더 충전 요청했어. 꼭 필요한지 생각해볼까? 💪`
        : `${d.prev.label}보다 충전 요청이 ${dc < 0 ? "줄었어" : "늘지 않았어"}. 잘 관리하고 있어 👏`;
    },
  },

  // ⑤ merchantMap (map) — 인사이트 없음
  merchantMap: {
    template: "map",
    title: "사용 가능 가맹점", subtitle: "FOX PAY 학생복지 가맹점 · 가까운 순", badge: "내 주변",
  },

  // ⑥ balance (statList) — 3항목 남은 금액(합계 없음). 항목 스타일은 options.itemStyles.
  balance: {
    template: "statList",
    title: "지금 쓸 수 있는 금액", subtitle: "항목별 남은 금액", badge: "실시간",
    options: {
      itemStyles: [
        { icon: "🎫", tint: "#E2F3F2", ink: "#0F5A57" },
        { icon: "💸", tint: "#FAEAF1", ink: "#8E2F52" },
        { icon: "⭐", tint: "#FFF4E0", ink: "#8A5A12" },
        { icon: "💳", tint: "#E8EEFB", ink: "#1F3A8A" },
      ],
      noteStyle: { background: "#F6F6FB", color: "#6B6E78" },
    },
    insight: () => "바우처와 용돈 충전금은 따로 관리돼요. 포인트는 결제와 별개로 쌓이는 거예요!",
  },

  // ⑦ channel (txList) — 스택바 + 그룹 요약박스 + 거래 리스트. 그룹 스타일은 options.groupStyles.
  channel: {
    template: "txList",
    title: "온·오프라인 결제 내역", subtitle: "결제 채널별 · 전체 거래", badge: "전체 내역", // operia 쿼리에 기간 필터 없음 = 전체 기간
    options: {
      limit: 5, // 거래 리스트 초기 노출 5건 → '더보기' +5 (txList 점진 노출)
      groupStyles: {
        OFFLINE: { color: "#5B4DD6", soft: "#EDEBFB", emoji: "🏪" },
        ONLINE: { color: "#16A394", soft: "#E2F3F1", emoji: "🌐" },
      },
    },
  },

  // ⑧ merchantBreakdown (barlist) — 가맹점별 비율 순위(N:1: schoolCompare와 같은 barlist 템플릿)
  merchantBreakdown: {
    template: "barlist",
    title: "주로 어디에 썼을까?", subtitle: "가맹점별 사용 금액 순", // badge 제거: operia 쿼리에 기간 필터 없음(전체 기간)
    // 맥락 분기(catContext): 범주 컬럼이 dow/hour면 제목·부제만 교체(데이터·정렬 불변). 그 외(가맹점/업종)는 위 기본 유지.
    contexts: {
      dow:  { title: "요일별 사용", subtitle: "요일별 사용 금액" },
      hour: { title: "시간대별 사용", subtitle: "시간대별 사용 금액" },
    },
    options: { rank: true, showPct: true, unit: "" },
    insight: (d) => {
      const items = d.items || [];
      const t = items[0];
      if (!t) return "";
      if (items.length === 1) return `${t.label}에서 ${num(t.value)}원 썼어.`;  // 단일 항목: "제일 많이·전체의 100%·자주 가는 곳" 자명·어색해서 완화
      return `${t.label}에서 제일 많이 썼어 (${num(t.value)}원, 전체의 ${t.pct}%). 자주 가는 곳이네!`;
    },
  },

  // ⑨ parentCard (list)
  parentCard: {
    template: "list",
    title: "부모 카드 사용 내역", subtitle: "연계된 보호자 카드 결제", badge: "보호자 카드",
    options: { icon: "💳", itemSuffix: "부모카드", emptyText: "보호자 카드 결제 내역이 없어요 👍", countSuffix: "본인 지원금과 분리 표기" },
  },

  // ⑩ schoolCompare (barlist) — 충북 중학교 TOP5 랭킹 + 우리학교 강조 + 충북 평균(N:1: merchantBreakdown과 공유)
  schoolCompare: {
    template: "barlist",
    title: "학교별 사용 비교", subtitle: "충청북도 중학교 결제 TOP5 · 1인당 평균", badge: "충북 중학교",
    // 맥락 분기(catContext): 범주 컬럼이 grade면 제목·부제 교체 + 행라벨 "N학년"·푸터 "전체 평균"(데이터·정렬 불변). sch_nm(학교)은 기본 유지.
    contexts: {
      grade: { title: "학년별 사용 비교", subtitle: "학년별 1인당 평균", gradeLabel: true, avgLabel: "전체 평균" },
    },
    options: { rank: true, rankAccent: true, me: true, avgRow: true, unit: "원", showPct: false },
    insight: (d) => {
      if (!d.myRank) return "";
      const diff = (d.myAvg || 0) - (d.provinceAvg || 0);
      return `우리 학교는 충북 중학교 중 ${d.myRank}위예요. 충북 평균보다 ${num(Math.abs(diff))}원 ${diff >= 0 ? "많이" : "적게"} 써요.`;
    },
  },
};

// 호환: intent → templateId. ChartRenderer/registry가 사용. 없으면 table.
export function templateFor(intent) {
  return (INTENT_CONFIG[intent] && INTENT_CONFIG[intent].template) || "table";
}
export function configFor(intent) {
  return INTENT_CONFIG[intent] || null;
}
export default INTENT_CONFIG;
