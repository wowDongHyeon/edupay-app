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
      // badge 제거: 기간 배지는 operia appliedPeriod 로만(코어50 기간정책 02). 없으면 미표시.
      month: {
        title: "월별 사용 내역", subtitle: "FOX PAY 결제 · 월별 추이",
        // 당월(막대 key === 오늘 YYYYMM) 처리: 비교는 완결월끼리(당월 제외), 당월은 별도 안내.
        //   · 당월에 사용액 있으면 "지금까지 N원 썼어요"(집계중 문구 금지 — 데이터 있는데 오해 소지).
        //   · 당월 데이터 없으면(series에 당월 막대 없음) "아직 사용 내역이 없어요".
        //   · 과거만 조회(당월 막대 없음)면 마지막 vs 직전 비교(기존).
        //   · d.metric='count'(건수)면 단위 "N번", 아니면 "N원"(코어50 #2).
        insight: (d) => {
          const s = d.series || [];
          if (!s.length) return "";
          const fmt = d.metric === "count" ? (v) => `${num(v)}번` : won;
          // 코어25 #75: 월별 avg/max/min 은 합계 비교("더 썼어") 부적합 → '한 번에 평균/최대/최소' 맥락 문구.
          if (d.metric === "avg" || d.metric === "max" || d.metric === "min") {
            const last = s[s.length - 1];
            const word = d.metric === "avg" ? "평균" : d.metric === "max" ? "최대" : "최소";
            return last ? `${last.label}엔 한 번에 ${word} ${fmt(last.value)} 썼어 📊` : "";
          }
          const curKey = d.currentMonthKey;
          const curBar = curKey ? s.find((x) => x.key === curKey) : null; // 당월 막대(있으면)
          // 축과 일치: 당월 막대가 있으면 그 라벨(mLbl 결과, showYear 규칙 반영)을 그대로. 없으면 연도 포함 폴백.
          const curDigits = curKey ? String(curKey).replace(/\D/g, "") : "";
          const curLabel = curBar ? curBar.label
            : (curDigits.length >= 6 ? `${curDigits.slice(0, 4)}년 ${+curDigits.slice(4, 6)}월` : "");
          const pool = curBar ? s.filter((x) => x.key !== curKey) : s; // 비교 대상 = 완결월(당월 제외)
          const cur = pool[pool.length - 1], prev = pool[pool.length - 2];
          // 당월 안내: 데이터 있으면 실제 사용액, 없으면 '아직 사용 내역 없음'(집계중 문구 폐기)
          const note = curBar
            ? ` ${curLabel}은 지금까지 ${fmt(curBar.value)} 썼어요.`
            : (curLabel ? ` ${curLabel}은 아직 사용 내역이 없어요.` : "");
          if (cur && prev && prev.value) {
            const diff = cur.value - prev.value, pct = Math.round(Math.abs(diff) / prev.value * 100);
            const msg = diff >= 0
              ? `${cur.label}은 ${prev.label}보다 ${fmt(diff)}(${pct}%) 더 썼어. 다음 달엔 조금 아껴볼까? 💪`
              : `${cur.label}은 ${prev.label}보다 ${fmt(-diff)}(${pct}%) 덜 썼어. 잘하고 있어 👏`;
            return msg + note;
          }
          if (cur) return `${cur.label}에 ${fmt(cur.value)} 썼어.${note || " 계획해서 써보자 📊"}`;
          // 완결월 없음(당월 데이터뿐) → 당월 사용액만 안내(집계중 문구 없이)
          return curBar ? `${curLabel}에 지금까지 ${fmt(curBar.value)} 썼어 📊` : "";
        },
      },
      day: {
        title: "일별 사용 내역", subtitle: "FOX PAY 결제 · 일별 흐름",
        insight: (d) => {
          const s = d.series || [];
          if (!s.length) return "";
          const fmt = d.metric === "count" ? (v) => `${num(v)}번` : won;
          const sum = s.reduce((a, x) => a + (x.value || 0), 0);
          return `최근 ${s.length}일 동안 ${fmt(sum)} 썼어. 하루 평균 ${fmt(Math.round(sum / s.length))} 정도야 📊`;
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
    // badge 제거: 기간 배지는 operia appliedPeriod 로만(코어50 기간정책 02). 없으면 미표시.
    title: "내 조르기 추이", subtitle: "이번 달 vs 지난달 · 월별 충전 요청",
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
    // 범주 말투 분기(코어50 #5): d._catKind='merchant'(또는 미지정)면 장소 말투, dow/hour/other(요일/시간대/업종/상품)면 중립.
    //   _catKind 는 ChartRenderer 가 catKindOf 로, _metric(sum|count|avg|max|min)·_direction(asc|desc|null)은 measureKind/orderDirection 으로 주입.
    //   합계(sum)+desc 는 기존 코어50 문구 100% 보존(회귀 0). 나머지는 코어25 measure/정렬 톤.
    insight: (d) => {
      const items = d.items || [];
      const t = items[0];
      if (!t) return "";
      const m = d._metric || "sum";
      const asc = d._direction === "asc";
      const kind = d._catKind;
      const isPlace = (kind === "merchant" || kind == null);
      const nameOf = (x) => (kind === "dow" ? `${x.label}요일` : x.label); // 요일 라벨은 "수"→"수요일"
      const least = items[items.length - 1]; // shape 는 값 내림차순 → 최솟값은 마지막(하위N 톤용)

      // 합계(sum) — 기존 문구 보존. asc(하위N, 코어25 #66)만 신규 '적게' 분기.
      if (m === "sum") {
        if (asc) return isPlace
          ? `${nameOf(least)}에서 제일 적게 썼어 (${num(least.value)}원).`
          : `${nameOf(least)}에 제일 적게 썼어 (${num(least.value)}원).`;
        if (isPlace) {
          if (items.length === 1) return `${t.label}에서 ${num(t.value)}원 썼어.`;
          return `${t.label}에서 제일 많이 썼어 (${num(t.value)}원, 전체의 ${t.pct}%). 자주 가는 곳이네!`;
        }
        const val = nameOf(t);
        if (items.length === 1) return `${val}에 ${num(t.value)}원 썼어.`;
        return `${val}에 가장 많이 썼어 (${num(t.value)}원, 전체의 ${t.pct}%).`;
      }
      // 건수(count, 코어25 #69) — "번". asc=적게/desc=자주.
      if (m === "count") {
        const b = asc ? least : t;
        const nm = nameOf(b);
        if (asc) return isPlace ? `${nm}에 제일 안 갔어 (${num(b.value)}번).` : `${nm}이(가) 제일 적어 (${num(b.value)}번).`;
        return isPlace ? `${nm}에 제일 자주 갔어 (${num(b.value)}번).` : `${nm}이(가) 제일 많아 (${num(b.value)}번).`;
      }
      // 비가산 measure(평균/최대/최소, 코어25 #70·71·72·73) — % 없음(합계 아님), "원".
      const label = nameOf(t);
      if (m === "avg") return `${label}이(가) 평균이 제일 높아 (${num(t.value)}원).`;
      if (m === "max") return isPlace ? `${label}에서 한 번에 제일 크게 썼어 (${num(t.value)}원).` : `${label}은(는) 한 번에 최대 ${num(t.value)}원 썼어.`;
      if (m === "min") return isPlace ? `${label}에서 한 번에 제일 적게 썼어 (${num(t.value)}원).` : `${label}은(는) 한 번에 최소 ${num(t.value)}원 썼어.`;
      return "";
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
