import { labelForColumn } from "./codeLabels";
import { monthLabel, dayLabel } from "./util";
/* 폴백 shape 결정(순수 함수 — 골든 테스트 대상). cardIntent 가 못 잡은 응답을 데이터 '모양'으로
 * 예쁜 차트에 매핑한다(reportPlan 앞에서 가로챔). 정직하게 안 되는 것만 null → 표.
 *   template: "kpi"(1×1 단일) | "statList"(1행×N숫자 멀티KPI) | "line"(시계열+값) | "barlist"(범주+값). 도넛 제외. */

// 범주/시간축 '값'(컬럼명 아님)을 예쁘게: 코드→한글, YYYY-MM→월, YYYY-MM-DD→일.
const CODE_LABEL = { OFFLINE: "오프라인", ONLINE: "온라인", VOUCHER: "바우처(지원금)", APPCARD: "부모카드", BEG: "조르기" };
const fmtCat = (v) => {
  const s = String(v == null ? "" : v);
  if (CODE_LABEL[s]) return CODE_LABEL[s];
  if (/^\d{4}-\d{2}$/.test(s)) return monthLabel(s);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return dayLabel(s);
  return s;
};

export function pickFallbackShape(rows, columnMetadata) {
  const R = Array.isArray(rows) ? rows : [];
  if (!R.length) return null;
  const cols = Object.keys(R[0] || {});
  const metaOf = (c) => { const m = Array.isArray(columnMetadata) ? columnMetadata.find((x) => x && x.column === c) : null; return m && m.label; };
  // KPI/멀티KPI 라벨은 컬럼명→한글(labelForColumn). 한글 못 얻으면 그 모양 포기(raw 영문 노출 금지, CLAUDE.md).
  const koLabel = (c) => { const l = labelForColumn(c, metaOf(c)); return /[가-힣]/.test(l) ? l : null; };
  const unitOf = (c) => { const s = String(c) + String(koLabel(c) || ""); return /P$|POINT|포인트/i.test(s) ? "P" : (/AMT|AMOUNT|BLNC|BALANCE|COST|PRICE|금액|잔액|충전금|지원금|비용|가격|원/i.test(s) ? "원" : ""); };
  const isNum = (c) => R.some((r) => r[c] != null) && R.every((r) => r[c] == null || typeof r[c] === "number");
  const isTemporal = (c) => R.some((r) => r[c] != null) && R.every((r) => r[c] == null || /^\d{4}-\d{2}(-\d{2})?$/.test(String(r[c])));
  const numCols = cols.filter(isNum);
  const nonNum = cols.filter((c) => !isNum(c));
  const isIdent = (c) => /_no$|_id$|번호|코드/i.test(c);
  const catCols = nonNum.filter((c) => !isIdent(c)); // 의미있는 범주(식별자 _no/_id 제외)

  if (R.length === 1) {
    // 범주(식별자 제외)+값 1개 → barlist(1항목). barlist 템플릿이 단일범주면 KPI로 강등(항목명 라벨 표시).
    if (catCols.length >= 1 && numCols.length === 1) {
      const ccol = catCols.find((c) => !isTemporal(c)) || catCols[0];
      return { template: "barlist", unit: unitOf(numCols[0]), items: [{ label: fmtCat(R[0][ccol]), value: Number(R[0][numCols[0]]) || 0 }] };
    }
    // 순수 스칼라(범주 없음) 1개 → 단일 KPI(컬럼 한글 라벨)
    if (numCols.length === 1) { const c = numCols[0]; const lbl = koLabel(c); if (!lbl) return null;
      return { template: "kpi", label: lbl, value: Math.abs(Number(R[0][c]) || 0), unit: unitOf(c) }; }
    // 숫자 N개(범주 없음) → 멀티 KPI(한글 라벨 2개↑ 없으면 표)
    if (numCols.length >= 2) {
      const items = numCols.map((c) => ({ label: koLabel(c), value: Math.abs(Number(R[0][c]) || 0), unit: unitOf(c) })).filter((x) => x.label);
      return items.length >= 2 ? { template: "statList", items } : null;
    }
    return null;
  }

  // M행(≥2): 숫자값이 정확히 1개일 때만 차트(0개/2개↑ → 표)
  if (numCols.length !== 1) return null;
  const vcol = numCols[0];
  const tcol = nonNum.find(isTemporal);
  if (tcol) return { template: "line", valLabel: koLabel(vcol), series: R.map((r) => ({ label: fmtCat(r[tcol]), value: Number(r[vcol]) || 0 })) };
  const ccol = catCols.find((c) => !isTemporal(c));
  if (ccol) {
    let items = R.map((r) => ({ label: fmtCat(r[ccol]), value: Number(r[vcol]) || 0 })).sort((a, b) => b.value - a.value);
    // 가드레일: 범주 > 8 → 상위 8 + "그 외"(나머지 합계) 1행으로 축약(막대 과밀 방지).
    if (items.length > 8) {
      const rest = items.slice(8).reduce((s, x) => s + (x.value || 0), 0);
      items = items.slice(0, 8).concat([{ label: "그 외", value: rest }]);
    }
    return { template: "barlist", unit: unitOf(vcol), items };
  }
  return null;
}

export default pickFallbackShape;
