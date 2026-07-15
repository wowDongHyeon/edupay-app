// cardSignature — 순수 시그니처 분류기(§4 매핑). 질의 텍스트(cardIntent) 대신 operia 응답
//   '컬럼 시그니처'(역할·이름·값패턴)로 8종 카드 + generic 을 결정한다. 현행 SLOTS/roleOf/
//   각 카드 SQL 시그니처(mock/operia/queries.js)에서 역산 → 패리티 기준은 "현행 동작 재현".
//
// ★ ZERO import — node --test 로 직접 검증(vitest 등 새 의존성 없음). 셰이핑(shapedData)은
//   fallbackShape.pickCardSignature 가 기존 shapeForIntent/pickFallbackShape 로 위임(패리티 안전).
//
// 반환 카드키(= QUERIES intent 와 동일):
//   merchantMap | balance | channel | schoolCompare | report | reportDaily | merchantBreakdown
//   + "kpi"(단일 KPI) | "generic"(그 외 → 폴백 4템플릿)

const TEMPORAL_RE = [/^\d{4}-\d{2}(-\d{2})?$/, /^\d{6}(\d{2})?$/]; // YYYY-MM[-DD] / YYYYMM[DD]
const isTemporalVal = (s) => s != null && TEMPORAL_RE.some((re) => re.test(String(s)));
const isDailyVal = (s) => /^\d{4}-\d{2}-\d{2}|^\d{8}$/.test(String(s)); // 일축(YYYY-MM-DD/YYYYMMDD)

// 식별자(집계 범주 아님): _no/_id/_cd/번호/코드 → 범주에서 제외(MERCHANT_NO 를 가맹점 범주로 오인 방지).
const isIdent = (c) => /_no$|_id$|_cd$|_code$|번호|코드/i.test(String(c));
// 잔액/자산 컬럼명(단일 출처 아님 — 이름 힌트): balance 시그니처 판정용.
const BAL_RE = /bl?nc|balance|잔액|지원금|charg|voucher|바우처|용돈|충전|point|포인트|계좌/i;
// 채널 범주 값 어휘(코드/영문/한글). 이 어휘로만 이뤄진 범주 컬럼 = 채널.
const CHANNEL_VAL = /^(on|off|online|offline|온라인|오프라인)$/i;

// 컬럼 → 역할. shapeForIntent.roleOf 미러(순수·import 없이): coord > temporal > value > category.
//   좌표는 이름으로 먼저(숫자 오인 방지), 시간축은 type=date 또는 값패턴(YYYY-MM[-DD]).
function roleOf(col, rows, type) {
  const name = String(col || "").toLowerCase().replace(/\s+/g, "");
  if (/^(lat|latitude|위도)$/.test(name) || /^(lon|lng|longitude|경도)$/.test(name)) return "coord";
  const t = String(type || "").toLowerCase();
  if (t === "date" || t === "datetime" || t === "timestamp") return "temporal";
  const vals = rows.map((r) => r[col]).filter((v) => v != null);
  if (vals.length && vals.every((v) => typeof v === "number" && !Number.isNaN(v))) return "value";
  const sample = vals.find((v) => v != null);
  if (isTemporalVal(sample)) return "temporal";
  return "category";
}

// 범주 컬럼의 값이 전부 채널 어휘인가(비어있지 않게). 이름(channel/채널)도 힌트로 인정.
function isChannelCol(col, rows) {
  if (/channel|채널/i.test(String(col))) return true;
  const vals = rows.map((r) => r[col]).filter((v) => v != null);
  return vals.length > 0 && vals.every((v) => CHANNEL_VAL.test(String(v).trim()));
}

// balance 시그니처: (A) mock 계산형 {k,v} used/recv/points, (B) 잔액명 컬럼 존재.
//   ceiling: 다른 카드가 '지원금/충전' 등 잔액어휘를 컬럼명에 쓰면 오분류 가능(현행 8종 시그니처엔 없음).
//   ponytail: 이름 휴리스틱. operia 가 balance 전용 status/타입을 주면 그걸로 승격.
function isBalanceSig(rows, keys) {
  if (keys.includes("k") && keys.includes("v") && rows.some((r) => /used|recv|points/i.test(String(r.k)))) return true;
  return keys.some((k) => BAL_RE.test(k));
}

/**
 * 응답 컬럼 시그니처 → 카드키. 순수 함수.
 * @param {Object[]} rows tableData
 * @param {Array} [columnMetadata] [{column,type,label}] — 있으면 역할 판정에 type 사용, 없으면 값으로 추론
 * @returns {string} 카드키 | "generic"
 */
export function classifyCard(rows, columnMetadata) {
  const R = Array.isArray(rows) ? rows : [];
  if (!R.length) return "generic";
  const keys = Object.keys(R[0] || {});
  const typeOf = (c) => {
    const m = Array.isArray(columnMetadata) ? columnMetadata.find((x) => x && x.column === c) : null;
    return m && m.type;
  };
  const byRole = { coord: [], temporal: [], value: [], category: [] };
  for (const c of keys) (byRole[roleOf(c, R, typeOf(c))] || byRole.category).push(c);
  const catCols = byRole.category.filter((c) => !isIdent(c)); // 의미범주(식별자 제외)

  // 특이도 높은 순(§4). balance 는 잔액어휘라 다른 범주/값 카드와 충돌 안 함 → 좌표 다음 우선.
  if (byRole.coord.length >= 2) return "merchantMap";
  if (isBalanceSig(R, keys)) return "balance";
  if (catCols.some((c) => isChannelCol(c, R))) return "channel";
  if (catCols.some((c) => /sch|school|학교/i.test(String(c)))) return "schoolCompare";
  if (byRole.temporal.length && byRole.value.length) {
    const tcol = byRole.temporal[0];
    const sample = R.map((r) => r[tcol]).find((v) => v != null);
    return isDailyVal(sample) ? "reportDaily" : "report";
  }
  if (catCols.length && byRole.value.length) return "merchantBreakdown"; // D6: catSpend/merchantBreakdown 병합
  if (R.length === 1 && byRole.value.length === 1 && !catCols.length) return "kpi";
  return "generic";
}

export default classifyCard;
