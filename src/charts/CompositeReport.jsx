// 복합 스킬(/자금보고서) 보고서 말풍선 — 요약문 + 슬롯별 강제카드 세로스택.
//   SSOT: _cli-handoff/스킬_슬래시커맨드_설계+CLI핸드오프_0728_v2.md §3·§4.
//   각 슬롯 = App.runComposite 가 앵커별 ephemeral 호출로 채운 응답 필드(+error).
//   렌더는 기존 ChartRenderer(forceCard) 재사용 — 새 차트 로직 0. 실패 슬롯만 작은 안내, 나머지 정상.
import { ChartRenderer } from "./ChartRenderer";

function SlotFail({ title }) {
  return (
    <div>
      {title && <div className="text-[13px] font-bold text-gray-700 mb-1 px-0.5">{title}</div>}
      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl text-[13px] text-gray-400">
        이 항목은 불러오지 못했어요
      </div>
    </div>
  );
}

export function CompositeReport({ report }) {
  const summary = report && report.summary;
  const slots = (report && Array.isArray(report.slots)) ? report.slots : [];
  return (
    <div className="flex flex-col gap-3">
      {summary &&
        <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl rounded-tl-md text-[14px] text-gray-800 leading-relaxed whitespace-pre-line shadow-sm">
          {summary}
        </div>}
      {slots.map((slot, i) => (
        slot && !slot.error ? (
          <div key={i}>
            {slot.title && <div className="text-[13px] font-bold text-gray-700 mb-1 px-0.5">{slot.title}</div>}
            <ChartRenderer
              forceCard={slot.card}
              forceTable={false}
              tableData={slot.tableData}
              columnMetadata={slot.columnMetadata}
              queryBreakdown={slot.queryBreakdown}
              queryInfo={slot.queryInfo}
              reportPlan={slot.reportPlan}
              summaryStats={slot.summaryStats}
              appliedPeriod={slot.appliedPeriod}
              sql={slot.sql}
              source={slot.source}
            />
          </div>
        ) : <SlotFail key={i} title={slot && slot.title} />
      ))}
    </div>
  );
}

export default CompositeReport;
