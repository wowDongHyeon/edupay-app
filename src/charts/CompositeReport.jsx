// 복합 스킬(/자금보고서) 보고서 말풍선 — 요약문 + 슬롯별 강제카드 세로스택.
//   SSOT: _cli-handoff/스킬_슬래시커맨드_설계+CLI핸드오프_0728_v2.md §3·§4 + 스킬_UI폴리시_0728.
//   각 슬롯 = App.runComposite 가 앵커별 ephemeral 호출로 채운 응답 필드(+error).
//   렌더는 기존 ChartRenderer(forceCard) 재사용 — 공용 카드 내부 스타일은 건드리지 않는다(리포트 래퍼 레벨만).
import { ChartRenderer } from "./ChartRenderer";

const ACCENT = "#5B4DD6"; // 브랜드 보라

// 슬롯 제목: accent 마커(▸)+굵게+보라. 회색 평문 탈피(폴리시 A).
function SlotTitle({ title }) {
  if (!title) return null;
  return (
    <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
      <span className="text-[13px] leading-none" style={{ color: ACCENT }}>▸</span>
      <span className="text-[13.5px] font-extrabold" style={{ color: "#4A3FB0" }}>{title}</span>
    </div>
  );
}

// 슬롯 프레이밍: 흰 라운드 카드 + 가벼운 그림자(공용 카드 내부는 그대로, 래퍼만).
function SlotCard({ children }) {
  return <div className="bg-white rounded-2xl px-3 py-3 shadow-sm border border-[#EDEBF7]">{children}</div>;
}

function SlotFail({ title }) {
  return (
    <div>
      <SlotTitle title={title} />
      <SlotCard>
        <div className="text-[13px] text-gray-400 text-center py-2">이 항목은 불러오지 못했어요</div>
      </SlotCard>
    </div>
  );
}

export function CompositeReport({ report }) {
  const summary = report && report.summary;
  const slots = (report && Array.isArray(report.slots)) ? report.slots : [];
  return (
    // 리포트 프레임: accent 테두리 + 연보라 배경 → 일반 답변 말풍선과 시각적으로 구분(차별화 c).
    <div className="rounded-2xl rounded-tl-md p-3" style={{ background: "#F5F3FD", border: "1px solid #E3DEF7" }}>
      {/* 스킬 헤더 배지 */}
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <span className="text-[15px] font-extrabold text-gray-900">📊 자금보고서</span>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide"
          style={{ background: ACCENT, color: "white" }}>스킬</span>
      </div>
      {/* 요약 강조 배너 */}
      {summary &&
        <div className="flex gap-2 items-start px-3.5 py-2.5 rounded-xl mb-3 text-[13.5px] leading-relaxed"
          style={{ background: "#EDEBFB", color: "#3F3A7A" }}>
          <span className="shrink-0 text-[15px] leading-none mt-0.5">💡</span>
          <span className="whitespace-pre-line font-medium">{summary}</span>
        </div>}
      {/* 슬롯 스택 */}
      <div className="flex flex-col gap-3">
        {slots.map((slot, i) => (
          slot && !slot.error ? (
            <div key={i}>
              <SlotTitle title={slot.title} />
              <SlotCard>
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
              </SlotCard>
            </div>
          ) : <SlotFail key={i} title={slot && slot.title} />
        ))}
      </div>
    </div>
  );
}

export default CompositeReport;
