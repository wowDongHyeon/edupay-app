// codeLabels — 코드값 → 한글 라벨 사전 (DATASOURCE_설계.md §6-1/§13.1, 백엔드 CODE_VALUES)
//
// 실 backend(_DEV)가 범주 dim 을 코드값으로 주는 경우(CATEGORY_CD/CHANNEL_CD/PAY_MEAN_CD)
// 사람이 읽을 한글로 변환한다. mock 은 이미 한글 텍스트(가맹점명/업종명)라 코드 사전에 없어 '원문 그대로' 통과(회귀 0).
//   · columnMetadata.label 이 한글이면 그걸 우선(백엔드가 라벨을 직접 주는 경우).
//   · 사전에 없는 코드/한글 값은 원문 유지.
//   · backend·mock 코드를 함께 수용(예: 부모카드 = PARENT_CARD(backend) / APPCARD(mock)).

export const CODE_LABELS = {
  CATEGORY_CD: { FOOD: "음식", CVS: "편의점", TRANSPORT: "교통", BOOK: "도서", ONLINE: "온라인" },
  CHANNEL_CD: { ON: "온라인", OFF: "오프라인", ONLINE: "온라인", OFFLINE: "오프라인" },
  PAY_MEAN_CD: { VOUCHER: "바우처(지원금)", PARENT_CARD: "부모카드", APPCARD: "부모카드", JORUGI: "조르기", BEG: "조르기" },
};

// 채널 표준 키(txList groupStyles 키와 정렬): ON/OFF(backend) → ONLINE/OFFLINE(mock·템플릿).
export const CHANNEL_CANON = { ON: "ONLINE", OFF: "OFFLINE", ONLINE: "ONLINE", OFFLINE: "OFFLINE" };

const hasKorean = (s) => typeof s === "string" && /[가-힣]/.test(s);

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
