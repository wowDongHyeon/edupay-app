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
