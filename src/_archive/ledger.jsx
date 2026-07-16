import React from "react";
import { EDUPAY, dragScroll } from "../data/edupay";
/* FOX PAY AI — 용돈기입장 카드 (조회 + 직접 기입 + 수정 + 삭제) */
  const { useState, useRef } = React;
  const LD = EDUPAY;

  const fmtAmt = (n) => Number(n || 0).toLocaleString("ko-KR");
  const fmtDate = (iso) => { const p = (iso || "").split("-"); return p.length === 3 ? `${+p[1]}.${p[2]}` : iso; };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const GREEN = "#2E9E7B";
  const RED = "#2B2D33";

  /* ── 상단 요약 (수입 / 지출 / 잔액) ──────────────────── */
  function Summary({ income, expense, balance }) {
    const Col = ({ label, value, color }) => (
      <div className="flex-1 flex flex-col items-center py-2.5">
        <span className="text-[10.5px] text-gray-400 mb-0.5">{label}</span>
        <span className="text-[14.5px] font-extrabold tabular-nums" style={{ color }}>{value}</span>
      </div>
    );
    return (
      <div className="flex items-stretch bg-[#F6F6FB] rounded-xl mb-3 divide-x divide-violet-100">
        <Col label="수입" value={"+" + fmtAmt(income)} color={GREEN} />
        <Col label="지출" value={"-" + fmtAmt(expense)} color={RED} />
        <Col label="잔액" value={fmtAmt(balance) + "원"} color="#1E3A8A" />
      </div>
    );
  }

  /* ── 내역 한 줄 ─────────────────────────────────────── */
  function Row({ e, isElem, onEdit, onAskDelete, confirming, onConfirm, onCancel }) {
    const isIncome = e.type === "income";
    const auto = e.source === "auto";
    return (
      <div className={"py-2.5 " + (confirming ? "" : "")}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-gray-900 truncate">{e.title}</span>
              <span className={"text-[9.5px] font-bold px-1.5 py-[1px] rounded-full shrink-0 " +
                (auto ? "bg-violet-100 text-violet-600" : "bg-emerald-100 text-emerald-600")}>
                {auto ? "자동" : "직접"}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 truncate">{fmtDate(e.date)} · {e.cat}</div>
          </div>
          <div className="text-[13.5px] font-bold tabular-nums shrink-0" style={{ color: isIncome ? GREEN : RED }}>
            {isIncome ? "+" : "-"}{fmtAmt(e.amount)}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center active:bg-gray-100 text-[13px]">✏️</button>
            <button onClick={onAskDelete} className="w-7 h-7 rounded-lg flex items-center justify-center active:bg-gray-100 text-[13px]">🗑️</button>
          </div>
        </div>
        {confirming && (
          <div className="flex items-center gap-2 mt-2 bg-red-50 rounded-xl px-3 py-2 edupay-fade">
            <span className="text-[12px] text-red-600 font-medium flex-1">정말 삭제할까요?</span>
            <button onClick={onConfirm} className="px-3 py-1 rounded-lg bg-red-500 text-white text-[12px] font-bold active:scale-95">삭제</button>
            <button onClick={onCancel} className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 text-[12px] font-semibold active:scale-95">취소</button>
          </div>
        )}
      </div>
    );
  }

  /* ── 메인 카드 ──────────────────────────────────────── */
  function LedgerCard({ grade, ledger, range, onAdd, onUpdate, onDelete, onSend }) {
    const isElem = grade === "초등";
    const [tab, setTab] = useState("view");
    const blank = { type: "expense", amount: "", cat: "식비", date: todayISO(), memo: "", editingId: null, source: "manual" };
    const [form, setForm] = useState(blank);
    const [confirmId, setConfirmId] = useState(null);
    const [ocr, setOcr] = useState("idle"); // idle | scanning | done
    const [visible, setVisible] = useState(6); // 내역 점진적 표시(더보기)
    const [receiptImg, setReceiptImg] = useState(null); // 선택한 영수증 미리보기(dataURL)
    const camRef = useRef(null);   // 카메라 촬영용 file input
    const galRef = useRef(null);   // 갤러리 선택용 file input

    // 사용자가 실제 이미지를 고른 뒤에만 분석/입력 진행
    function onPickReceipt(ev) {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = ""; // 같은 파일 재선택 허용
      if (!file) return;    // 취소 시 아무것도 등록하지 않음
      const reader = new FileReader();
      reader.onload = () => { setReceiptImg(reader.result); runOcr(); };
      reader.readAsDataURL(file);
    }

    function runOcr() {
      setOcr("scanning");
      setTimeout(() => {
        const r = LD.ocrResult;
        setForm((f) => ({ ...f, type: "expense", amount: String(r.amount), cat: r.cat, memo: r.memo, date: todayISO(), editingId: null, source: "manual" }));
        setOcr("done");
      }, 2000);
    }

    const cats = form.type === "income" ? LD.incomeCats : LD.expenseCats;
    const accent = form.type === "income" ? GREEN : RED;

    const inRange = (e) => !range || (e.date >= range.start && e.date <= range.end);
    const viewLedger = ledger.filter(inRange);
    const sorted = [...viewLedger].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const income = viewLedger.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const expense = viewLedger.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
    const fmtMD = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${m}월 ${d}일`; };

    function pickType(t) {
      const list = t === "income" ? LD.incomeCats : LD.expenseCats;
      setForm((f) => ({ ...f, type: t, cat: list.some((c) => c.key === f.cat) ? f.cat : list[0].key }));
    }
    function startEdit(e) {
      setForm({ type: e.type, amount: String(e.amount), cat: e.cat, date: e.date, memo: e.memo || e.title, editingId: e.id, source: e.source });
      setConfirmId(null);
      setTab("entry");
    }
    function cancelEdit() { setForm(blank); setOcr("idle"); setReceiptImg(null); setTab("view"); }
    function submit() {
      const amt = parseInt(String(form.amount).replace(/[^0-9]/g, ""), 10);
      if (!amt) return;
      const emoji = (cats.find((c) => c.key === form.cat) || {}).emoji || "💡";
      const memo = (form.memo || "").trim();
      const title = memo || form.cat;
      const base = { type: form.type, amount: amt, cat: form.cat, emoji, title, date: form.date, memo };
      if (form.editingId) onUpdate({ id: form.editingId, source: form.source || "manual", ...base });
      else onAdd({ id: "u" + Date.now(), source: "manual", ...base });
      setForm(blank);
      setOcr("idle");
      setReceiptImg(null);
      setTab("view");
    }

    const editing = !!form.editingId;
    const amtValid = parseInt(String(form.amount).replace(/[^0-9]/g, ""), 10) > 0;

    return (
      <div className="mt-2 rounded-2xl bg-white border border-violet-100 shadow-sm overflow-hidden">
        {/* 탭 */}
        <div className="flex border-b border-gray-100">
          {[["view", "내역 보기"], ["entry", editing ? "수정하기" : "직접 입력"]].map(([k, label]) => (
            <button key={k} onClick={() => { if (k === "view") { setForm(blank); } setTab(k); }}
              className={"flex-1 py-3 text-[13px] font-bold transition relative " +
                (tab === k ? "text-violet-600" : "text-gray-400")}>
              {label}
              {tab === k && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full bg-violet-500"></span>}
            </button>
          ))}
        </div>

        {/* ── 내역 보기 ── */}
        {tab === "view" && (
          <div className="px-4 py-3.5">
            {range && (
              <div className="flex items-center gap-1.5 mb-2.5 text-[12.5px] font-bold text-violet-600">
                <span className="px-2 py-0.5 rounded-full bg-violet-50">{range.label || "기간"}</span>
                <span className="text-gray-400 font-medium">
                  {range.start === range.end ? fmtMD(range.start) : `${fmtMD(range.start)} ~ ${fmtMD(range.end)}`}
                  {range.sub ? ` (${range.sub})` : ""}
                </span>
              </div>
            )}
            <Summary income={income} expense={expense} balance={income - expense} />
            <div className="flex flex-col">
              {sorted.length === 0 && (
                <div className="py-7 text-center text-[13px] text-gray-400">{(range && range.label) || "해당 기간"}에는 기록이 없어요 👍</div>
              )}
              {sorted.slice(0, visible).map((e, i) => (
                <div key={e.id} className={i ? "border-t border-gray-100" : ""}>
                  <Row e={e} isElem={isElem}
                    confirming={confirmId === e.id}
                    onEdit={() => startEdit(e)}
                    onAskDelete={() => setConfirmId(e.id)}
                    onConfirm={() => { onDelete(e.id); setConfirmId(null); }}
                    onCancel={() => setConfirmId(null)} />
                </div>
              ))}
            </div>
            {sorted.length > visible && (
              <button onClick={() => setVisible((v) => v + 6)}
                className="w-full mt-2.5 py-2.5 rounded-xl bg-gray-50 text-gray-600 text-[13px] font-bold active:bg-gray-100">
                더보기 ({sorted.length - visible}개 더)
              </button>
            )}
            <button onClick={() => { setForm(blank); setOcr("idle"); setTab("entry"); }}
              className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-violet-200 text-violet-500 text-[13px] font-bold active:bg-violet-50">
              + 직접 입력하기
            </button>
            {onSend && (
              <button onClick={() => onSend("이번 달 소비 리포트 분석해줘")}
                className="w-full mt-2 py-2.5 rounded-xl bg-violet-50 text-violet-600 text-[13px] font-bold active:bg-violet-100">
                📊 이번 달 소비 리포트 보기
              </button>
            )}
          </div>
        )}

        {/* ── 직접 기입 / 수정 ── */}
        {tab === "entry" && (
          <div className="px-4 py-3.5">
            {/* 사진으로 자동 입력 */}
            {!editing && (ocr === "idle" || ocr === "done") && (
              <button onClick={() => setOcr("choose")}
                className="w-full mb-3 rounded-xl py-3 flex items-center justify-center gap-2 text-[13px] font-bold transition active:scale-[0.99] bg-violet-500 text-white">
                📷 영수증 사진으로 자동 입력
              </button>
            )}
            {!editing && ocr === "choose" && (
              <div className="mb-3 edupay-fade">
                <div className="text-[12px] font-semibold text-gray-500 mb-2 text-center">사진을 선택하면 자동으로 읽어드려요</div>
                <div className="flex gap-2">
                  <button onClick={() => camRef.current && camRef.current.click()}
                    className="flex-1 rounded-xl py-3.5 flex flex-col items-center justify-center gap-1 text-[12.5px] font-bold bg-violet-500 text-white active:scale-[0.98] transition">
                    <span className="text-[20px]">📷</span>사진 촬영
                  </button>
                  <button onClick={() => galRef.current && galRef.current.click()}
                    className="flex-1 rounded-xl py-3.5 flex flex-col items-center justify-center gap-1 text-[12.5px] font-bold bg-white border border-violet-200 text-violet-600 active:scale-[0.98] transition">
                    <span className="text-[20px]">🖼️</span>사진 선택
                  </button>
                </div>
                <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onPickReceipt} className="hidden" />
                <input ref={galRef} type="file" accept="image/*" onChange={onPickReceipt} className="hidden" />
                <button onClick={() => setOcr("idle")}
                  className="w-full mt-2 py-1.5 text-[12px] font-semibold text-gray-400 active:text-gray-600">취소</button>
              </div>
            )}
            {!editing && ocr === "scanning" && (
              <button disabled
                className="w-full mb-3 rounded-xl py-3 flex items-center justify-center gap-2 text-[13px] font-bold bg-violet-100 text-violet-400">
                <span className="w-4 h-4 rounded-full border-2 border-violet-300 border-t-transparent animate-spin"></span>
                사진 분석 중...
              </button>
            )}
            {ocr === "done" && (
              <div className="mb-3 bg-emerald-50 rounded-xl px-3 py-2.5 flex items-start gap-2 edupay-fade">
                {receiptImg && (
                  <img src={receiptImg} alt="영수증" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-emerald-200" />
                )}
                <div className="flex-1">
                  <p className="text-[12px] text-emerald-700 leading-relaxed">사진에서 자동으로 읽었어요. 확인하고 저장해 주세요!</p>
                  <button onClick={() => setOcr("choose")}
                    className="mt-1 text-[11.5px] font-bold text-emerald-600 underline active:text-emerald-800">다른 사진 선택</button>
                </div>
              </div>
            )}

            {isElem && (
              <div className="mb-3 bg-amber-50 rounded-xl px-3 py-2 text-[12.5px] text-amber-700 font-medium">
                오늘 쓴 돈을 기록해봐요! 💪
              </div>
            )}

            {/* 수입/지출 토글 */}
            <div className="flex gap-2 mb-3.5">
              {[["income", "수입", GREEN], ["expense", "지출", RED]].map(([t, label, c]) => (
                <button key={t} onClick={() => pickType(t)}
                  className={"flex-1 py-2.5 rounded-xl text-[13.5px] font-bold transition active:scale-[0.98] " +
                    (form.type === t ? "text-white" : "bg-gray-100 text-gray-400")}
                  style={form.type === t ? { background: c } : {}}>
                  {label}
                </button>
              ))}
            </div>

            {/* 금액 */}
            <div className="rounded-xl px-4 py-3 mb-3.5" style={{ background: accent + "10" }}>
              <div className="text-[10.5px] font-semibold mb-0.5" style={{ color: accent }}>금액</div>
              <div className="flex items-baseline gap-1">
                <input inputMode="numeric" autoFocus
                  value={form.amount ? fmtAmt(form.amount) : ""}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, "") }))}
                  placeholder="0"
                  className="flex-1 bg-transparent outline-none text-right text-[26px] font-extrabold tabular-nums text-gray-900 placeholder-gray-300 min-w-0" />
                <span className="text-[18px] font-bold text-gray-500">원</span>
              </div>
            </div>

            {/* 카테고리 */}
            <div className="text-[11.5px] font-semibold text-gray-500 mb-1.5">카테고리</div>
            <div className="flex gap-2 overflow-x-auto edupay-noscroll pb-1 mb-3.5" ref={(el) => dragScroll && dragScroll(el)}>
              {cats.map((c) => {
                const on = form.cat === c.key;
                return (
                  <button key={c.key} onClick={() => setForm((f) => ({ ...f, cat: c.key }))}
                    className={"flex items-center gap-1.5 rounded-full whitespace-nowrap font-semibold transition active:scale-95 shrink-0 " +
                      (isElem ? "px-4 py-2.5 text-[14px] " : "px-3 py-1.5 text-[12.5px] ") +
                      (on ? "text-white" : "bg-gray-100 text-gray-500")}
                    style={on ? { background: accent } : {}}>
                    <span className={isElem ? "text-[19px]" : "text-[15px]"}>{c.emoji}</span>{c.key}
                  </button>
                );
              })}
            </div>

            {/* 날짜 */}
            <div className="text-[11.5px] font-semibold text-gray-500 mb-1.5">날짜</div>
            <input type="date" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-gray-100 rounded-xl px-3.5 py-2.5 text-[13.5px] text-gray-800 outline-none mb-3.5" />

            {/* 메모 */}
            <div className="text-[11.5px] font-semibold text-gray-500 mb-1.5">메모 <span className="text-gray-300 font-normal">(선택)</span></div>
            <input type="text" value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="예) 엄마한테 받은 용돈"
              className="w-full bg-gray-100 rounded-xl px-3.5 py-2.5 text-[13.5px] text-gray-800 placeholder-gray-400 outline-none mb-4" />

            {/* 액션 */}
            <div className="flex gap-2">
              {editing && (
                <button onClick={cancelEdit}
                  className="px-4 rounded-xl bg-gray-100 text-gray-500 text-[14px] font-bold active:scale-95">취소</button>
              )}
              <button onClick={submit} disabled={!amtValid}
                className={"flex-1 rounded-xl text-white font-extrabold transition active:scale-[0.98] disabled:opacity-40 " +
                  (isElem ? "py-4 text-[16px]" : "py-3 text-[14.5px]")}
                style={{ background: amtValid ? accent : "#9CA3AF" }}>
                {editing ? "수정 완료" : "저장하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

export { LedgerCard };
