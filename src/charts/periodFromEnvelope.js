// 응답 봉투의 실제 적용 날짜필터 → 기간 배지 라벨(A방식: 범위 그대로).
// 근거: docs/프론트설계/02_기간라벨정책.md D1~D6.
//   - D1: 라벨 소스 = 봉투 queryBreakdown.filters[](백업 queryInfo.조건). appliedPeriod 없어도 됨.
//   - D2: 날짜필터 없으면 null(배지 미표시 = 기간무관).
//   - D3-B 금지: 정책 버킷(3/6개월·전체) 이름 역매핑 안 함 — 실제 범위 그대로.
// now 주입으로 "이번 달/오늘" 판정을 결정적으로(테스트 시간 비의존).

// 날짜 컬럼 화이트리스트(대소문자 무시): 'month'=YYYYMM, 'day'=YYYYMMDD.
const DATE_COLS = { dlng_ym: "month", dlng_dt: "day" };

const granularityOf = (col) => DATE_COLS[String(col || "").trim().toLowerCase()] || null;

// queryBreakdown.filters[]에서 날짜컬럼 BETWEEN → {gran,start,end}. 단측/기타/없음 → null.
function fromBreakdown(qb) {
  const filters = qb && Array.isArray(qb.filters) ? qb.filters : null;
  if (!filters) return null;
  for (const f of filters) {
    const gran = granularityOf(f && (f.column || f.label));
    if (!gran) continue;
    const lits = Array.isArray(f.literals) ? f.literals.map((x) => String(x).trim()) : [];
    // 라벨은 양측 범위(BETWEEN)만 — 단측(>=,<=)은 정직한 이름 불가 → null(무배지).
    if (String(f.op || "").toUpperCase() === "BETWEEN" && lits[0] && lits[1]) {
      return { gran, start: lits[0], end: lits[1] };
    }
  }
  return null;
}

// 백업: queryInfo.조건 문자열 배열 — "DLNG_YM BETWEEN 202601, 202607".
function fromQueryInfo(qi) {
  const conds = qi && Array.isArray(qi["조건"]) ? qi["조건"] : [];
  for (const s of conds) {
    const m = String(s || "").match(/(\w+)\s+BETWEEN\s+(\d+)\s*,\s*(\d+)/i);
    if (!m) continue;
    const gran = granularityOf(m[1]);
    if (gran) return { gran, start: m[2], end: m[3] };
  }
  return null;
}

const ym = (v) => (/^\d{6}$/.test(String(v)) ? { y: +String(v).slice(0, 4), m: +String(v).slice(4, 6) } : null);
const ymd = (v) => (/^\d{8}$/.test(String(v)) ? { y: +String(v).slice(0, 4), m: +String(v).slice(4, 6), d: +String(v).slice(6, 8) } : null);

function monthLabel(start, end, now) {
  const a = ym(start), b = ym(end);
  if (!a || !b) return null;
  const n = (b.y * 12 + b.m) - (a.y * 12 + a.m) + 1; // 포함 개월수
  if (n < 1) return null;
  const isThisMonth = b.y === now.getFullYear() && b.m === now.getMonth() + 1;
  if (isThisMonth) return `최근 ${n}개월`;
  const p = (o) => `${o.y}.${String(o.m).padStart(2, "0")}`;
  return `${p(a)}~${p(b)}`;
}

function dayLabel(start, end, now) {
  const a = ymd(start), b = ymd(end);
  if (!a || !b) return null;
  const n = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000) + 1; // 포함 일수
  if (n < 1) return null;
  // "오늘" 판정 ±3일 허용오차: operia date_filter 의 end 가 오늘 근처(수집지연·경계)여도 "최근 N" 계열로(날짜범위 대신).
  const endMs = Date.UTC(b.y, b.m - 1, b.d);
  const nowMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const isToday = Math.abs(nowMs - endMs) <= 3 * 86400000;
  if (isToday) {
    // 큰 일수는 개월로 자연화("최근 92일"→"최근 3개월"). A방식: 실제 범위의 캘린더 월 차이 환산(정책버킷 역매핑 아님).
    if (n >= 60) {
      const months = Math.round(((b.y * 12 + b.m) - (a.y * 12 + a.m)) + (b.d - a.d) / 30);
      if (months >= 1) return `최근 ${months}개월`;
    }
    return `최근 ${n}일`;
  }
  const p = (o) => `${o.m}/${o.d}`;
  return `${p(a)}~${p(b)}`;
}

/**
 * 봉투에서 기간 배지 라벨을 도출. 날짜필터 없거나 단측/파싱실패 → null(배지 숨김).
 * @param {{queryBreakdown?:Object, queryInfo?:Object}} envelope
 * @param {Date} [now] 기준시각(테스트 결정성). 기본 new Date().
 * @returns {string|null}
 */
export function derivePeriod({ queryBreakdown, queryInfo } = {}, now = new Date()) {
  const r = fromBreakdown(queryBreakdown) || fromQueryInfo(queryInfo);
  if (!r) return null;
  return (r.gran === "month" ? monthLabel(r.start, r.end, now) : dayLabel(r.start, r.end, now)) || null;
}
