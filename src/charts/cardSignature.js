// cardSignature — 순수 시그니처 분류기(§4 매핑). 질의 텍스트(cardIntent) 대신 operia 응답
//   '컬럼 시그니처'(역할·이름·값패턴)로 8종 카드 + generic 을 결정한다. 현행 SLOTS/roleOf/
//   각 카드 SQL 시그니처(mock/operia/queries.js)에서 역산 → 패리티 기준은 "현행 동작 재현".
//
// ★ ZERO import — node --test 로 직접 검증(vitest 등 새 의존성 없음). 셰이핑(shapedData)은
//   fallbackShape.pickCardSignature 가 기존 shapeForIntent/pickFallbackShape 로 위임(패리티 안전).
//
// 반환 카드키(= QUERIES intent 와 동일):
//   merchantMap | balance | dayTxns | channel | schoolCompare | friendCompare | report | reportDaily | merchantBreakdown
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
// dayTxns(L, 범용 건별 거래 리스트) 시그니처: 상품명(gds_nm)은 operia 1000질의(v2) 실측상 L(90행)에만 존재,
//   타 13 intent 0 → gds_nm 이 L↔CH 유일 구분자(CH 는 category_nm 만, gds_nm 없음). "item" 은 스키마 BIZ_ITEM_NM(종목)과
//   충돌하므로 제외. 행별 시각(dlng_tm/_tm$/시각)까지 있어야 '건별 거래'로 확정(집계형 오인 방지).
const GDS_RE = /gds_nm|goods|상품|product/i;
const TXN_TIME_RE = /dlng_tm|_tm$|시각/i;
// 코어25 #74 채널 %가드: 채널카드는 '합계 대비 %' 스택바 전제 → 비가산 measure(평균/최대/최소)면 % 무의미.
//   비가산 컬럼만 있고 가산(합계/건수) 컬럼이 없으면 channel 라우팅을 건너뛰고 일반 바리스트로 흘린다.
//   ★ 영문+한글 both: operia 가 tableData/columnMetadata 키를 영문(max_amt)↔한글("최대 결제액") 오락가락 보냄
//     (CLAUDE.md 기록) → 영문만이면 라이브 한글 컬럼에서 가드 미발동. catContext.MEASURE_RES 와 어휘 정렬.
//   ⚠️ 컬럼명은 폴백일 뿐: 라이브 operia 는 MAX(dlng_amt) 를 하고도 응답 컬럼을 raw 'DLNG_AMT'(label "총 금액")로
//     별칭을 버려 보낸다 → 컬럼명엔 max 신호 없음. 그래서 아래 hasNonAddMetric(queryBreakdown.metrics.func) 이 1차 신호.
const NONADD_MEASURE_RE = /avg_amt|max_amt|min_amt|(^|_)(avg|average|mean|max|min)(_|$)|평균|최대|최소|최고|최저/i;
const ADD_MEASURE_RE = /amt|amount|sum|tot|total|dlng|spend|금액|합계|결제액|사용액|(^|_)cnt(_|$)|count|건수|횟수/i;
// queryBreakdown.metrics[].func 가 비가산(MAX/MIN/AVG) 집계면 '합계 대비 %'(채널 스택바) 부적합 — 구조적 신호(컬럼명보다 신뢰).
const NONADD_FUNC_RE = /^(max|min|avg|average|mean)$/i;
function hasNonAddMetric(queryBreakdown) {
  const ms = queryBreakdown && Array.isArray(queryBreakdown.metrics) ? queryBreakdown.metrics : null;
  return !!ms && ms.some((m) => m && m.aggregated && NONADD_FUNC_RE.test(String(m.func || "")));
}

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
 * @param {Object} [queryBreakdown] 봉투 queryBreakdown — metrics[].func(MAX/MIN/AVG) 로 비가산 measure 판별(#74 채널 %가드)
 * @returns {string} 카드키 | "generic"
 */
export function classifyCard(rows, columnMetadata, queryBreakdown) {
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
  // dayTxns(L): 다행 + 상품명(gds_nm) + 행별 시각. 반드시 channel 체크보다 앞 — L 은 channel_nm 을 갖고 있어
  //   뒤에 두면 channel 로 hijack 된다. CH 는 gds_nm 이 없어 이 체크(AND)를 통과 못 하고 channel 로 정상 진행 → 회귀 0.
  if (R.length >= 2
      && keys.some((c) => GDS_RE.test(String(c)) && !isIdent(c))
      && keys.some((c) => TXN_TIME_RE.test(String(c)))) return "dayTxns";
  if (catCols.some((c) => isChannelCol(c, R))) {
    // #74 %가드: 채널 카드는 '합계 대비 %' 스택바 전제 → 비가산 measure(MAX/MIN/AVG)면 % 무의미 → merchantBreakdown 바리스트로.
    //   1차 신호 = queryBreakdown.metrics.func(구조적, operia 가 별칭 버려도 살아있음). 2차 = 컬럼명 정규식(폴백).
    if (!hasNonAddMetric(queryBreakdown)) {
      const valCols = byRole.value;
      const hasNonAdd = valCols.some((c) => NONADD_MEASURE_RE.test(String(c)));
      const hasAdd = valCols.some((c) => !NONADD_MEASURE_RE.test(String(c)) && ADD_MEASURE_RE.test(String(c)));
      if (!hasNonAdd || hasAdd) return "channel";
    }
    // func 가 비가산이면 여기로 흘러 merchantBreakdown(일반 바리스트).
  }
  // grade/학년도 학교별과 동일 비교 카드(barlist). operia 가 grade 를 문자열('2'/'중2')로 반환해 범주로 잡힘
  //   (정수로 오면 roleOf 가 '값'으로 분류 → 여기 도달 못 하고 generic). ceiling: 정수 반환 시 operia 조정 필요.
  if (catCols.some((c) => /sch|school|학교|grade|학년/i.test(String(c)))) return "schoolCompare";
  // friendCompare: operia 친구비교 응답의 범주 컬럼명이 'scope'(값: 나/우리 학교 평균/충북 전체 평균, 3행).
  //   결정적 이름 매칭 → schoolCompare 다음, report(시간축)·merchantBreakdown(범주+값)보다 앞에 둬야
  //   scope 가 일반 범주카드로 새지 않는다. ponytail: 이름 매칭으로 충분(scope 는 F 카드 전용 컬럼).
  if (catCols.some((c) => /^scope$/i.test(String(c).trim()))) return "friendCompare";
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
