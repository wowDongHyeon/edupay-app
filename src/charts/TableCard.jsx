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

export function TableCard({ result, intent }) {
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
    const cols = Array.from(result.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set()));
    body = (
      <div className="mt-3 overflow-x-auto edupay-noscroll">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-100">
              {cols.map((c) => <th key={c} className="font-semibold py-1.5 pr-3 whitespace-nowrap">{c}</th>)}
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
