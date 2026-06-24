import React from "react";
import { ChartShell, num } from "./util";
/* TableCard : ChartRenderer의 기본(default) 렌더 — 매핑된 차트 유형이 없을 때 result를 범용 표로 표시.
   - result가 객체 배열: 키를 열로 하는 표
   - result가 객체: 키/값 2열 표 (중첩 배열·객체는 요약)
   - 그 외: JSON 텍스트 */

const fmtVal = (v) => {
  if (v == null) return "";
  if (typeof v === "number") return num(v);
  if (typeof v === "object") return Array.isArray(v) ? `[${v.length}]` : JSON.stringify(v);
  return String(v);
};

/**
 * 표 컬럼 순서 + 헤더 라벨 결정(폴백 표용).
 * - 헤더: columnMetadata.label(한글) 우선, 비었거나 없으면 컬럼 키(영문) 폴백 → 회귀 0.
 * - 순서: columnMetadata 순(displayOrder 있으면 그 순) 중 data 에 있는 컬럼 → 그 외 data 키. metadata 없으면 기존 Object.keys 순.
 * - 셀은 항상 key(컬럼명)로 조회하므로 라벨 매핑이 값에 영향 없음.
 * @returns {{cols: string[], headers: {key:string,label:string}[]}}
 */
export function tableColumns(rows, columnMetadata) {
  const dataKeys = Array.from((rows || []).reduce((s, r) => {
    if (r && typeof r === "object") Object.keys(r).forEach((k) => s.add(k));
    return s;
  }, new Set()));
  const meta = Array.isArray(columnMetadata) ? columnMetadata.filter((m) => m && m.column != null) : [];
  let cols;
  if (meta.length) {
    const hasOrder = meta.some((m) => m.displayOrder != null);
    const ordered = (hasOrder
      ? meta.slice().sort((a, b) => (a.displayOrder == null ? 1e9 : a.displayOrder) - (b.displayOrder == null ? 1e9 : b.displayOrder))
      : meta
    ).map((m) => m.column).filter((c) => dataKeys.includes(c));
    const rest = dataKeys.filter((c) => !ordered.includes(c));
    cols = [...ordered, ...rest];
  } else {
    cols = dataKeys;
  }
  const labelByCol = new Map(meta.map((m) => [m.column, (m.label != null && String(m.label).trim() !== "") ? String(m.label) : null]));
  const headers = cols.map((c) => ({ key: c, label: labelByCol.get(c) || c }));
  return { cols, headers };
}

export function TableCard({ result, intent, columnMetadata }) {
  let body;
  // AI 시뮬이 rows를 객체로 감싸 반환({rows:[...]})하는 경우 → 내부 배열을 펼쳐 표로 렌더
  let data = result;
  if (data && !Array.isArray(data) && typeof data === "object") {
    const arrKey = ["rows", "data", "items", "list", "records", "result"].find((k) => Array.isArray(data[k]))
      || Object.keys(data).find((k) => Array.isArray(data[k]));
    if (arrKey) data = data[arrKey];
  }
  if (Array.isArray(data) && data.length && typeof data[0] === "object") {
    const result = data; // 아래 표 렌더가 result를 참조
    // 헤더 = columnMetadata.label(한글) 우선·영문 키 폴백, 순서 = metadata(displayOrder) 우선
    const { cols, headers } = tableColumns(result, columnMetadata);
    body = (
      <div className="mt-3 overflow-x-auto edupay-noscroll">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-100">
              {headers.map((h) => <th key={h.key} className="font-semibold py-1.5 pr-3 whitespace-nowrap">{h.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {result.map((r, i) => (
              <tr key={i} className="border-b border-gray-50">
                {cols.map((c) => <td key={c} className="py-1.5 pr-3 text-gray-700 tabular-nums whitespace-nowrap">{fmtVal(r[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (Array.isArray(data)) {
    // 빈 결과(0행) — 쿼리는 실행됐지만 매칭 없음
    body = <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-7 text-center text-[13.5px] text-gray-500">조회 결과가 없어요 👍</div>;
  } else if (result && typeof result === "object") {
    const entries = Object.entries(result);
    body = (
      <div className="mt-3 flex flex-col gap-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-3 text-[12.5px] py-1.5 border-b border-gray-50">
            <span className="w-[120px] shrink-0 font-semibold text-gray-500">{k}</span>
            <span className="flex-1 text-gray-700 break-all">{fmtVal(v)}</span>
          </div>
        ))}
      </div>
    );
  } else {
    body = <pre className="mt-3 text-[12px] text-gray-600 whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</pre>;
  }
  return (
    <ChartShell badge="데이터" title="조회 결과" sub={intent ? `intent: ${intent}` : "표 형식"}>
      {body}
    </ChartShell>
  );
}

export default TableCard;
