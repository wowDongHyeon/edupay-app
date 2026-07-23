// codeLabels — 코드값 → 한글 라벨 사전 (DATASOURCE_설계.md §6-1/§13.1, 백엔드 CODE_VALUES)
//
// 실 backend(_DEV)가 범주 dim 을 코드값으로 주는 경우(CATEGORY_CD/CHANNEL_CD/PAY_MEAN_CD)
// 사람이 읽을 한글로 변환한다. mock 은 이미 한글 텍스트(가맹점명/업종명)라 코드 사전에 없어 '원문 그대로' 통과(회귀 0).
//   · columnMetadata.label 이 한글이면 그걸 우선(백엔드가 라벨을 직접 주는 경우).
//   · 사전에 없는 코드/한글 값은 원문 유지.
//   · backend·mock 코드를 함께 수용(예: 부모카드 = PARENT_CARD(backend) / APPCARD(mock)).

export const CODE_LABELS = {
  CATEGORY_CD: { FOOD: "음식", CVS: "편의점", TRANSPORT: "교통", BOOK: "도서/문구", ONLINE: "온라인" },
  CHANNEL_CD: { ON: "온라인", OFF: "오프라인", ONLINE: "온라인", OFFLINE: "오프라인" },
  PAY_MEAN_CD: { VOUCHER: "바우처(지원금)", PARENT_CARD: "부모카드", APPCARD: "부모카드", JORUGI: "조르기", BEG: "조르기" },
};

// 채널 표준 키(txList groupStyles 키와 정렬): backend 가 코드(ON/OFF)·영문(ONLINE/OFFLINE)·한글("온라인"/"오프라인")
//   무엇을 줘도 표준키 ONLINE/OFFLINE 로 매핑(한글 미수용 시 그룹 매칭 실패 → 0원/0건 회귀 발생).
export const CHANNEL_CANON = {
  ON: "ONLINE", OFF: "OFFLINE", ONLINE: "ONLINE", OFFLINE: "OFFLINE",
  "온라인": "ONLINE", "오프라인": "OFFLINE",
};

// 채널 값 → 표준키. 공백 trim + ASCII 대문자 폴백(한글은 그대로 매칭). 미지정 값은 원문 유지.
export function canonChannel(c) {
  if (c == null) return c;
  const k = String(c).trim();
  return CHANNEL_CANON[k] || CHANNEL_CANON[k.toUpperCase()] || c;
}

// 영문 원컬럼명 → 사용자 노출용 한글 라벨(단일 출처). operia columnMetadata.label 이 원컬럼명(영문)이라 필요.
//   mock/backend 표준 컬럼명(month/amount/merchant 등)은 이 맵에 없어 metaLabel 폴백 → 회귀 0.
//   키는 모두 대문자(labelForColumn 이 column 을 대문자로 정규화해 대소문자 무시로 조회). 식별자(MERCHANT_NO 등)는 넣지 않는다.
export const COLUMN_LABELS = {
  // 잔액/자산(balance 3항목 하드코딩 유지)
  ACCOUNT_BALANCE_AMT: "사용 가능 금액",
  CARD_BALANCE_AMT: "용돈 충전금",
  CURRENT_POINT: "에듀포인트",
  CARD_VOUCHER_BLNC: "남은 지원금(바우처)", // operia 회신#1 — V_USER_ASSET 자산 잔액(바우처), raw 노출 방지
  CARD_ADD_CHARG_BLNC: "용돈 충전금",  // 0709 Q6 컬럼교체 / 0716 라벨 일원화: CARD_BALANCE_AMT와 동일 표기(전체·focus 카드 라벨 통일)
  CARD_YN: "카드", CARD_DAY_LIMIT_AMT: "1일 한도", // 카드 발급여부 + 1일 한도(balance 4번째 항목)
  // 날짜/시간
  DLNG_YM: "월", DLNG_DT: "일자", DLNG_DTM: "거래일시", DLNG_TM: "시간",
  // 금액/집계
  DLNG_AMT: "금액", TOTAL_AMOUNT: "금액", SUM_PAY_DLNG_AMT: "금액", SUM_DLNG_AMT: "금액",
  CNT_PAY: "건수", CNT: "건수", RATIO_PCT: "비율",
  // 오페리아 1000질의 최종(0722) — 소문자 별칭(labelForColumn 이 대문자 정규화 조회). 채널/친구비교/학교집계 컬럼.
  CHANNEL: "채널", CHANNEL_NM: "채널",
  SCOPE: "구분", AVG_AMT: "평균",
  SCH_NM: "학교", USER_CNT: "인원수", AVG_PER_USER: "1인 평균",
  // 코어50(0722) 신규 컬럼. dow/hour 는 값 매핑(요일·시)은 별도 — 여기선 헤더 라벨만.
  DOW: "요일", HOUR: "시간대", MERCHANT_CNT: "가맹점 수", DAY_CNT: "사용 일수", GRADE: "학년",
  AVG_PER_DAY: "하루 평균",
  // 가맹점/상품/분류
  MERCHANT_NM: "가맹점", GDS_NM: "상품명",
  CATEGORY_NM: "카테고리", CATEGORY_CD: "카테고리",
  BIZ_TYPE_NM: "업종", BIZ_ITEM_NM: "업종",
  // 위치(근처 가맹점 — reportPlan 집계 라벨 "주소 종류" 를 하드코딩이 덮어 방어)
  ADDR: "주소", LATITUDE: "위도", LONGITUDE: "경도",
};

const hasKorean = (s) => typeof s === "string" && /[가-힣]/.test(s);

/**
 * 컬럼명 → 한글 라벨. 우선순위: ① COLUMN_LABELS 하드코딩(대소문자 무시) → ② metaLabel 이 한글일 때만 → ③ raw 컬럼명.
 *   ①이 최우선이라 reportPlan 의 집계형 오라벨("주소 종류" 등)을 하드코딩이 덮어 방어한다.
 *   ②는 한글일 때만 → operia 의 영문 라벨(MERCHANT_NM 등)이 새어나오지 않고, App 이 reportPlan 한글로 채운 값만 통과.
 *   mock/backend 표준컬럼은 metaLabel===column(영문/표준)이라 ②를 건너뛰고 ③에서 동일 문자열 반환 → 회귀 0.
 * @param {*} column 원컬럼명
 * @param {*} [metaLabel] columnMetadata.label
 */
export function labelForColumn(column, metaLabel) {
  if (column != null) {
    const key = String(column).trim().toUpperCase();
    if (COLUMN_LABELS[key] != null) return COLUMN_LABELS[key];
  }
  if (hasKorean(metaLabel)) return String(metaLabel);
  return column == null ? "" : String(column);
}

/**
 * 코드 → 한글 라벨. domain 지정 시 그 사전 우선, 미지정이면 전 사전 탐색. 모르는 값/한글은 원문.
 * @param {*} code 범주 값(코드 또는 이미 한글)
 * @param {string} [domain] "CATEGORY_CD" | "CHANNEL_CD" | "PAY_MEAN_CD"
 */
export function labelOfCode(code, domain) {
  if (code == null) return code;
  const key = String(code);
  if (domain && CODE_LABELS[domain] && CODE_LABELS[domain][key] != null) return CODE_LABELS[domain][key];
  for (const dict of Object.values(CODE_LABELS)) if (dict[key] != null) return dict[key];
  return code;
}

/**
 * columnMetadata.label(한글) 우선, 아니면 코드 변환.
 * @param {*} code 값
 * @param {{domain?:string, metaLabel?:string}} [opt]
 */
export function labelFor(code, opt = {}) {
  if (hasKorean(opt.metaLabel)) return opt.metaLabel;
  return labelOfCode(code, opt.domain);
}

export default labelOfCode;
