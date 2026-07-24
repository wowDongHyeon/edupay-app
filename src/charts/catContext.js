// 카드 맥락 분기(제목/라벨만) — 분류(cardSignature)·데이터·정렬·템플릿 불변.
//   공유 barlist 카드(merchantBreakdown/schoolCompare)가 범주 컬럼(dow/hour/grade)에 따라
//   고정 제목/라벨이 안 맞는 문제를, 응답 범주 컬럼명(+값)으로 감지해 config.contexts 로 오버라이드한다.
//   ★ ZERO JSX import — node --test 로 직접 검증. 제목 문자열은 intentConfig.contexts 가 소유(여기선 감지·적용만).
//   근거(코어50 v2): dow=`ELT(...) AS dow`("월"~"일"), hour=`CONCAT(...,'시') AS hour`("14시"), grade="1"~"6"(문자).

const DOW_SET = new Set(["월", "화", "수", "목", "금", "토", "일"]);
const HOUR_RE = /^\d{1,2}\s*시$/;

// 응답 범주 컬럼 → 맥락키(dow|hour|grade|null). 컬럼명 우선, 없으면 값 기반.
//   grade 는 컬럼명만으로 감지(값 "1~6"은 숫자 라벨과 구분 불가해 오탐 방지 위해 값 폴백 제외).
export function detectCatContext(tableData) {
  const rows = Array.isArray(tableData) ? tableData : [];
  if (!rows.length) return null;
  const keys = Object.keys(rows[0] || {});
  for (const k of keys) {
    const n = String(k).toLowerCase().replace(/\s+/g, "");
    if (n === "dow") return "dow";
    if (n === "hour") return "hour";
    if (n === "grade") return "grade";
  }
  // 값 기반 폴백(dow/hour만 — 값이 결정적). 어떤 컬럼이든 값이 전부 요일/N시면 그 맥락.
  for (const k of keys) {
    const vals = rows.map((r) => r[k]).filter((v) => v != null).map((v) => String(v).trim());
    if (!vals.length) continue;
    if (vals.every((v) => DOW_SET.has(v.replace(/요일$/, "")))) return "dow";
    if (vals.every((v) => HOUR_RE.test(v))) return "hour";
  }
  return null;
}

// barlist(merchantBreakdown) 인사이트 말투 판정: 범주가 '가맹점(장소)'이면 장소 말투("~에서…자주 가는 곳"),
//   그 외(요일/시간대/업종/상품)는 중립. dow/hour 는 detectCatContext 재사용, 가맹점은 컬럼명으로 판정.
//   근거(코어50 #5): 같은 barlist 를 요일/업종/상품에 재사용 → 장소 말투가 비-가맹점에서 어색.
const MERCHANT_RE = /merchant|가맹|상호|store|shop/i;
export function catKindOf(tableData) {
  const ctx = detectCatContext(tableData);
  if (ctx === "dow" || ctx === "hour") return ctx;
  const rows = Array.isArray(tableData) ? tableData : [];
  const keys = Object.keys(rows[0] || {});
  if (keys.some((k) => MERCHANT_RE.test(k))) return "merchant";
  return "other";
}

// 컬럼 alias → measure 종류(avg|max|min|sum|count) 또는 null. 코어25 계약: 프론트는 컬럼 alias 로 의미 판별.
//   avg/max/min 은 '_amt' 를 포함(=sum 정규식과 겹침)하므로 반드시 sum 보다 먼저 검사. count 는 겹치지 않음.
const MEASURE_RES = [
  ["avg", /avg_amt|(^|_)(avg|average|mean)(_|$)|평균/i],
  ["max", /max_amt|(^|_)max(_|$)|최대/i],
  ["min", /min_amt|(^|_)min(_|$)|최소/i],
  ["sum", /amt|amount|sum|tot|total|dlng|spend|금액|합계/i],
  ["count", /(^|_)cnt(_|$)|count|건수|횟수|(^|_)num(_|$)/i],
];
export function classifyMeasureName(col) {
  const s = String(col == null ? "" : col);
  for (const [kind, re] of MEASURE_RES) if (re.test(s)) return kind;
  return null;
}

// queryBreakdown.metrics[].func → measure 종류(구조적 신호, 컬럼명보다 우선). operia 가 별칭(max_amt)을 버리고
//   raw 컬럼(DLNG_AMT "총 금액")으로 보내도 func 는 살아있어 신뢰 가능. 비가산(max/min/avg) 우선 선택.
const FUNC_KIND = { MAX: "max", MIN: "min", AVG: "avg", AVERAGE: "avg", MEAN: "avg", SUM: "sum", COUNT: "count", CNT: "count" };
export function measureKindFromBreakdown(queryBreakdown) {
  const ms = queryBreakdown && Array.isArray(queryBreakdown.metrics) ? queryBreakdown.metrics : null;
  if (!ms) return null;
  const agg = ms.filter((m) => m && m.aggregated && m.func);
  for (const pref of ["max", "min", "avg", "sum", "count"]) {
    if (agg.some((m) => FUNC_KIND[String(m.func).toUpperCase()] === pref)) return pref;
  }
  return null;
}

// barlist(merchantBreakdown) 표시 measure 판정 — 표시 값 = amount-like(합계/평균/최대/최소) 우선(shape amount 슬롯과 정렬),
//   없으면 건수. 판정 대상은 '숫자 값' 컬럼만(문자 범주/시간축 배제). 미상 → "sum"(기존 합계 전제 = 회귀 안전).
export function measureKind(tableData) {
  const rows = Array.isArray(tableData) ? tableData : [];
  if (!rows.length) return "sum";
  const keys = Object.keys(rows[0] || {});
  const numCols = keys.filter((k) => {
    const vals = rows.map((r) => r[k]).filter((v) => v != null);
    return vals.length > 0 && vals.every((v) => typeof v === "number" && !Number.isNaN(v));
  });
  for (const c of numCols) { const k = classifyMeasureName(c); if (k && k !== "count") return k; }
  if (numCols.some((c) => classifyMeasureName(c) === "count")) return "count";
  return "sum";
}

// queryBreakdown.order_by → 정렬 방향("asc"|"desc"|null). 봉투 shape 미확정 대비 방어(객체/배열/direction·dir·order 키 수용).
//   신호 없으면 null → 호출부는 기존(내림차순=많이) 동작 유지(안전). 코어25 #66·69 '적게/하위N' 톤 근거.
export function orderDirection(queryBreakdown) {
  const ob = queryBreakdown && queryBreakdown.order_by;
  if (!ob) return null;
  const first = Array.isArray(ob) ? ob[0] : ob;
  if (first == null) return null;
  const raw = typeof first === "string" ? first : (first.direction || first.dir || first.order);
  const s = String(raw == null ? "" : raw).trim().toUpperCase();
  return s === "ASC" ? "asc" : s === "DESC" ? "desc" : null;
}

// 숫자 라벨에만 "학년" 접미(이미 "N학년"/"중2" 등 비숫자면 그대로).
const gradeLabel = (l) => (/^\d+$/.test(String(l).trim()) ? String(l).trim() + "학년" : l);

// cfg.contexts[감지맥락] 이 있으면 제목/부제 오버라이드 + (grade) 행라벨 "N학년"·푸터 avgLabel 적용.
//   데이터/정렬/템플릿 불변 — 새 객체로 반환(입력 불변). 감지 안 되거나 contexts 없으면 원본 그대로(회귀 0).
export function applyCatContext(cfg, shaped, tableData) {
  if (!cfg || !cfg.contexts) return { cfg, shaped };
  const ctx = detectCatContext(tableData);
  const o = ctx && cfg.contexts[ctx];
  if (!o) return { cfg, shaped };
  const newCfg = { ...cfg, title: o.title || cfg.title, subtitle: o.subtitle || cfg.subtitle };
  let newShaped = shaped;
  if (shaped && o.gradeLabel && Array.isArray(shaped.items)) {
    newShaped = { ...shaped, items: shaped.items.map((it) => ({ ...it, label: gradeLabel(it.label) })) };
    if (shaped.avgRow) newShaped.avgRow = { ...shaped.avgRow, label: o.avgLabel || shaped.avgRow.label };
  } else if (shaped && o.avgLabel && shaped.avgRow) {
    newShaped = { ...shaped, avgRow: { ...shaped.avgRow, label: o.avgLabel } };
  }
  return { cfg: newCfg, shaped: newShaped };
}
