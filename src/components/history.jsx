import React from "react";
/* FOX PAY AI 금융친구 — 대화 기록 드로어 */
const { useState: useStateHist } = React;

/* 상대 시간 표기 */
function edupayRelTime(ts) {
  const d = Date.now() - ts;
  const min = Math.floor(d / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return min + "분 전";
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + "시간 전";
  const day = Math.floor(hr / 24);
  if (day === 1) return "어제";
  if (day < 7) return day + "일 전";
  const dt = new Date(ts);
  return (dt.getMonth() + 1) + "월 " + dt.getDate() + "일";
}

/* 대화 미리보기 (마지막 메시지) */
function edupayPreview(c) {
  const last = c.messages[c.messages.length - 1];
  if (!last) return "";
  const t = (last.text || "").replace(/\n/g, " ");
  return (last.role === "user" ? "" : "") + t;
}

function HistoryDrawer({ convos, activeId, onSelect, onNew, onDelete, onClose }) {
  const [confirmId, setConfirmId] = useStateHist(null);
  return (
    // 딤/블러 없음: 투명 오버레이(밖 탭=닫기)만. 하단 바텀시트(아래→위 슬라이드).
    <div className="absolute inset-0 z-40" onClick={onClose}>
      <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl edupay-slide-up flex flex-col"
      style={{ maxHeight: "74%", boxShadow: "0 -10px 30px -8px rgba(45,40,112,0.24)", borderTop: "1px solid #EDEBF5" }}
      onClick={(e) => e.stopPropagation()}>
        {/* grab 핸들 */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-2.5 mb-1"></div>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-1 pb-2.5">
          <h3 className="text-[16px] font-extrabold text-gray-900">🕘 지난 대화</h3>
          <button onClick={onClose} aria-label="닫기"
          className="w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 새 대화 (비웹뷰 헤더 진입점 보존) */}
        <div className="px-4 pb-2.5">
          <button onClick={onNew}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white active:scale-[.98] transition"
          style={{ background: "linear-gradient(135deg,#5B4DD6,#4A3FB0)", boxShadow: "0 10px 22px -10px rgba(91,77,214,.18)" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span className="text-[14px] font-extrabold">새 대화 시작</span>
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto edupay-noscroll px-4 pt-0.5"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
          {convos.length === 0 ?
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-[#EEEBFA] flex items-center justify-center mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" stroke="#9A8FE6" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[13.5px] font-semibold text-gray-400">아직 대화 기록이 없어요</p>
            <p className="text-[12px] text-gray-300 mt-1">금융친구와 나눈 대화가 여기 모여요</p>
          </div> :

          <div className="flex flex-col gap-2">
            {convos.map((c) =>
            <div key={c.id}
            className={"group relative rounded-2xl border transition " + (
            c.id === activeId ? "bg-violet-50 border-violet-200" : "bg-white border-gray-100 active:bg-gray-50")}>
              <button onClick={() => onSelect(c)} className="w-full text-left px-3.5 py-3 pr-10">
                <div className="flex items-center gap-2">
                  <span className={"w-2 h-2 rounded-full shrink-0 " + (c.id === activeId ? "bg-violet-500" : "bg-gray-200")}></span>
                  <span className="flex-1 text-[14px] font-bold text-gray-900 truncate">{c.title || "새 대화"}</span>
                </div>
                {/* 상대시간 부제(edupayRelTime) + 미리보기 */}
                <p className="mt-1 ml-4 text-[12px] text-gray-400 line-clamp-1">
                  {edupayRelTime(c.updatedAt)}{edupayPreview(c) ? " · " + edupayPreview(c) : ""}
                </p>
              </button>
              {/* 삭제 */}
              {confirmId === c.id ?
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button onClick={() => {onDelete(c.id);setConfirmId(null);}}
                className="px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-bold active:scale-95">삭제</button>
                <button onClick={() => setConfirmId(null)}
                className="px-2 py-1 rounded-lg bg-gray-200 text-gray-600 text-[11px] font-bold active:scale-95">취소</button>
              </div> :
              <button onClick={() => setConfirmId(c.id)} aria-label="삭제"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 active:bg-gray-100 active:text-red-400 transition">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              }
            </div>
            )}
          </div>
          }
        </div>
      </div>
    </div>);

}

export { HistoryDrawer };
