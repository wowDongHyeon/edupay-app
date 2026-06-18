import React from "react";
import L from "leaflet";
import { EDUPAY } from "../data/edupay";
/* FOX PAY AI — 비교·지원금·가맹점·채널·결제자 카드 (모두 EDUPAY 모델에서 파생) */
const EX = EDUPAY;
const exNum = EX.num, exWon = EX.won;
const fmtMD2 = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${m}월 ${d}일`; };

/* 공통 셸 */
function ExCard({ title, sub, badge, children }) {
  return (
    <div className="rounded-[22px] bg-white border border-violet-50 shadow-sm px-5 py-5 edupay-fade">
      <div className="flex items-start justify-between gap-3">
        <div>
          {badge && <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full bg-violet-50 text-[11.5px] font-bold text-violet-600">{badge}</span>}
          <div className="text-[17px] font-extrabold text-gray-900 tracking-[-0.01em]">{title}</div>
          {sub && <div className="text-[12.5px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* 3개 막대 비교 행 (나/학교/충북) */
function TriBar({ label, value, max, color, bold }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={"w-[64px] shrink-0 text-[12.5px] " + (bold ? "font-bold text-gray-900" : "text-gray-500")}>{label}</span>
      <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: Math.max((value / max) * 100, 5) + "%", background: color }}></div>
      </div>
      <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-[62px] text-right">{exNum(value)}원</span>
    </div>
  );
}

/* ── 3. 친구(또래) 사용 비교 ───────────────────────── */
function FriendCompareCard({ result }) {
  // 오페리아 result 우선 — 없으면 기존 EDUPAY 모델로 폴백
  const c = result
    ? { me: result.me, school: result.schoolGradeAvg, province: result.provinceAvg, schoolName: "흥덕중" }
    : EX.compareTotals;
  const max = Math.max(c.me, c.school, c.province);
  const diff = c.me - c.school;
  return (
    <ExCard badge="이번 달" title="친구들과 사용 비교" sub={`같은 학년끼리 비교 · ${c.schoolName}`}>
      <div className="mt-4 flex flex-col gap-3">
        {[
          { label: "나", sub: null, value: c.me, color: "#5B4DD6", bold: true },
          { label: "우리 학교", sub: "같은 학년 평균", value: c.school, color: "#9A8FE6" },
          { label: "충북 전체", sub: "같은 학년 평균", value: c.province, color: "#D7D2F2" },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-[78px] shrink-0">
              <div className={"text-[12.5px] leading-tight " + (r.bold ? "font-extrabold text-gray-900" : "text-gray-600")}>{r.label}</div>
              {r.sub && <div className="text-[10.5px] text-gray-400 leading-tight">{r.sub}</div>}
            </div>
            <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: Math.max(r.value / max * 100, 5) + "%", background: r.color }}></div>
            </div>
            <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-[64px] text-right whitespace-nowrap">{exNum(r.value)}원</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
        💡 {diff > 0
          ? `같은 학년 우리 학교 평균보다 ${exNum(diff)}원 더 썼어. 충북 같은 학년 평균보단 ${exNum(c.province - c.me)}원 적게 썼네!`
          : `같은 학년 우리 학교 평균보다 ${exNum(-diff)}원 적게 썼어. 잘 관리하고 있어 👏`}
      </div>
    </ExCard>
  );
}

/* ── 4a. 조르기 내역 (타임라인 리스트) ─────────────────── */
function NudgeListCard() {
  const all = (EX.ledgerSeed || []).filter((e) => e.type === "income").sort((a, b) => (a.date < b.date ? 1 : -1));
  const guardians = ((EX.schema && EX.schema.adbk) || []).filter((a) => a.USER_NICK_NM === "엄마" || a.USER_NICK_NM === "아빠");
  const [visible, setVisible] = React.useState(4);
  const totalCount = all.length;
  const totalAmt = all.reduce((s, e) => s + e.amount, 0);
  const fmt = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${m}월 ${d}일`; };
  const list = all.slice(0, visible);
  return (
    <ExCard badge="조르기" title="내 용돈 조르기 내역" sub="보호자에게 충전을 요청한 기록">
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
        <span className="text-[12.5px] text-gray-500">전체 <b className="text-gray-800">{totalCount}회</b></span>
        <span className="text-[13px] font-extrabold text-violet-600">{exNum(totalAmt)}원</span>
      </div>
      <div className="mt-3 flex flex-col">
        {list.map((e, i) => {
          const who = guardians.length ? guardians[i % guardians.length].USER_NICK_NM : "보호자";
          return (
            <div key={e.id || i} className="flex items-center gap-3 py-2.5 border-t border-gray-100 first:border-t-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#5B4DD6" }}></span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-800 truncate">{who}에게 충전 요청</div>
                <div className="text-[11px] text-gray-400">{fmt(e.date)} · {e.title}</div>
              </div>
              <span className="text-[13px] font-bold tabular-nums shrink-0" style={{ color: "#2E9E7B" }}>+{exNum(e.amount)}원</span>
            </div>
          );
        })}
      </div>
      {visible < totalCount && (
        <button onClick={() => setVisible((v) => v + 4)}
          className="w-full mt-2.5 py-2.5 rounded-xl bg-gray-50 text-gray-600 text-[13px] font-bold active:bg-gray-100">더보기 ({totalCount - visible}개 더)</button>
      )}
    </ExCard>
  );
}

/* ── 4b. 조르기 비교 (같은 학년 · 건수/금액) ───────────── */
function NudgeCompareCard({ result }) {
  // 오페리아 result(내 조르기 vs 같은학년/충북 평균 + 월별 횟수) 우선
  if (result) {
    const me = result.me || { count: 0, amount: 0 };
    const sg = result.schoolGradeAvg || { count: 0, amount: 0 };
    const pv = result.provinceAvg || { count: 0, amount: 0 };
    const monthly = result.monthly || [];
    const maxCnt = Math.max(1, me.count, sg.count, pv.count);
    const bars = [
      { label: "나", count: me.count, color: "#5B4DD6", bold: true },
      { label: "우리학교 같은학년", count: sg.count, color: "#9A8FE6" },
      { label: "충북 평균", count: pv.count, color: "#D7D2F2" },
    ];
    const maxMo = Math.max(1, ...monthly.map((m) => m.count));
    const diff = me.count - sg.count;
    return (
      <ExCard badge="조르기" title="조르기 내역 비교" sub="이번 분기 · 같은 학년/충북 평균과 비교">
        <div className="mt-3 flex gap-2">
          <div className="flex-1 rounded-2xl bg-gray-50 py-3 text-center">
            <div className="text-[11.5px] text-gray-400">내 조르기 횟수</div>
            <div className="text-[20px] font-extrabold tracking-[-0.02em] text-violet-600">{me.count}회</div>
            <div className="text-[11px] text-gray-400">같은학년 평균 {sg.count}회</div>
          </div>
          <div className="flex-1 rounded-2xl bg-gray-50 py-3 text-center">
            <div className="text-[11.5px] text-gray-400">받은 금액</div>
            <div className="text-[20px] font-extrabold tracking-[-0.02em] text-gray-900">{exNum(me.amount)}원</div>
            <div className="text-[11px] text-gray-400">평균 {exNum(sg.amount)}원</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-[12px] text-gray-400 mb-2">조르기 횟수 비교</div>
          <div className="flex flex-col gap-2.5">
            {bars.map((b, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={"w-[88px] shrink-0 text-[12px] " + (b.bold ? "font-extrabold text-gray-900" : "text-gray-500")}>{b.label}</span>
                <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.max(b.count / maxCnt * 100, 5) + "%", background: b.color }}></div>
                </div>
                <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-9 text-right">{b.count}회</span>
              </div>
            ))}
          </div>
        </div>
        {monthly.length > 0 && (
          <div className="mt-4">
            <div className="text-[12px] text-gray-400 mb-2">월별 조르기 횟수</div>
            <div className="flex items-end justify-between gap-2" style={{ height: 70 }}>
              {monthly.map((m, i) => {
                const mo = +(m.month || "").slice(5, 7);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold text-violet-600">{m.count}</span>
                    <div className="w-full rounded-t-md" style={{ height: Math.max(m.count / maxMo * 44, 6) + "px", background: i === monthly.length - 1 ? "#5B4DD6" : "#C2BAEC" }}></div>
                    <span className="text-[11px] text-gray-400">{mo}월</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
          💡 {diff > 0
            ? `같은 학년 평균보다 ${Math.round(diff * 10) / 10}회 더 졸랐어. 꼭 필요한지 한 번 더 생각해볼까? 💪`
            : "같은 학년 평균보다 조르기가 적어. 계획적으로 잘 쓰고 있어 👏"}
        </div>
      </ExCard>
    );
  }
  const months = (EX.nudgeByMonth || []).slice(-6);
  const cur = months[months.length - 1] || { count: 0, amount: 0, label: "" };
  const prev = months[months.length - 2] || { count: 0, amount: 0 };
  const dCount = cur.count - prev.count;
  const maxAmt = Math.max(1, ...months.map((m) => m.amount));
  return (
    <ExCard badge="조르기" title="내 조르기 추이" sub="이번 달 vs 지난달 · 월별 충전 요청">
      <div className="mt-3 flex gap-2">
        <div className="flex-1 rounded-2xl bg-gray-50 py-3 text-center">
          <div className="text-[11.5px] text-gray-400">이번 달 횟수</div>
          <div className="text-[20px] font-extrabold tracking-[-0.02em] text-violet-600">{cur.count}회</div>
          <div className="text-[11px]" style={{ color: dCount > 0 ? "#D99A36" : "#2E9E7B" }}>{dCount === 0 ? "지난달과 같아요" : dCount > 0 ? `지난달보다 +${dCount}회` : `지난달보다 ${dCount}회`}</div>
        </div>
        <div className="flex-1 rounded-2xl bg-gray-50 py-3 text-center">
          <div className="text-[11.5px] text-gray-400">이번 달 금액</div>
          <div className="text-[20px] font-extrabold tracking-[-0.02em] text-gray-900">{exNum(cur.amount)}원</div>
          <div className="text-[11px] text-gray-400">지난달 {exNum(prev.amount)}원</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="text-[12px] text-gray-400 mb-2">월별 충전 요청 금액</div>
        <div className="flex flex-col gap-2">
          {months.map((m, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-9 shrink-0 text-[12px] text-gray-500">{m.label}</span>
              <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: Math.max(m.amount / maxAmt * 100, m.amount > 0 ? 6 : 0) + "%", background: i === months.length - 1 ? "#5B4DD6" : "#C2BAEC" }}></div>
              </div>
              <span className="text-[11.5px] text-gray-400 w-8 text-right tabular-nums">{m.count}회</span>
              <span className="text-[12.5px] font-bold text-gray-800 tabular-nums w-[64px] text-right whitespace-nowrap">{exNum(m.amount)}원</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
        💡 {dCount > 0 ? `이번 달엔 지난달보다 ${dCount}번 더 충전을 요청했어. 꼭 필요한지 한 번 더 생각해볼까? 💪` : "이번 달은 조르기가 늘지 않았어. 계획적으로 잘 쓰고 있어 👏"}
      </div>
    </ExCard>
  );
}

/* ── 5. 근처 사용 가능 가맹점 (실제 지도 Leaflet + OSM, 오프라인 시 약식 지도 폴백) ── */
function MerchantMapCard({ result }) {
  const mapRef = React.useRef(null);
  const mapObj = React.useRef(null);
  const [mapFailed, setMapFailed] = React.useState(typeof L === "undefined");
  const [geo, setGeo] = React.useState({ status: "locating", lat: null, lng: null }); // locating | ok | denied | unsupported

  // 두 좌표 간 거리(m) — 하버사인
  const distM = (a, b) => {
    const R = 6371000, toR = (d) => d * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(s)));
  };

  // 오페리아 result(center, merchants) 우선 — 없으면 기존 EDUPAY 모델로 폴백
  const MAP_EMOJI = { 편의점: "🏪", 식비: "🍱", 학용품: "📚", 교통: "🚌", 문화: "🎮" };
  const center = (result && result.center) || EX.mapCenter;
  const srcMerchants = (result && Array.isArray(result.merchants))
    ? result.merchants.map((m) => ({
        name: m.name, cat: m.category, lat: m.lat, lng: m.lng, addr: m.addr, channel: "offline",
        emoji: MAP_EMOJI[m.category] || "📍",
        // 오프라인 약식 지도용 좌표(중심 기준 상대 위치 → 0~100%)
        x: Math.min(92, Math.max(8, 50 + (m.lng - center.lng) * 4000)),
        y: Math.min(88, Math.max(12, 50 - (m.lat - center.lat) * 4000)),
      }))
    : EX.merchants.filter((m) => m.channel === "offline");

  // 내 위치 기준(GPS 성공 시 실제, 아니면 기본 청주)
  const myPos = geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : center;
  // 가맹점 거리 = 내 위치 기준 실제 계산(좌표 있는 곳), 없으면 모델 거리
  const offline = srcMerchants
    .map((m) => ({ ...m, realDist: (m.lat != null) ? distM(myPos, { lat: m.lat, lng: m.lng }) : m.dist }))
    .sort((a, b) => a.realDist - b.realDist);

  // 1) GPS 요청
  React.useEffect(() => {
    if (!navigator.geolocation) { setGeo({ status: "unsupported" }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: "ok", lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => setGeo({ status: e.code === 1 ? "denied" : "error" }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // 2) 지도 렌더 (위치 확정/변경 시)
  React.useEffect(() => {
    if (geo.status === "locating") return; // 위치 결정 후 렌더
    if (typeof L === "undefined" || !mapRef.current) { setMapFailed(true); return; }
    let map;
    try {
      map = L.map(mapRef.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView([myPos.lat, myPos.lng], 15);
      mapObj.current = map;
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 });
      let any = false;
      tiles.on("tileload", () => { any = true; });
      tiles.on("tileerror", () => { if (!any) setMapFailed(true); });
      tiles.addTo(map);
      // 내 위치(실제 GPS면 강조)
      const meColor = geo.status === "ok" ? "#4A8DD6" : "#5B4DD6";
      L.marker([myPos.lat, myPos.lng], { icon: L.divIcon({ className: "", html: `<div style="width:16px;height:16px;border-radius:50%;background:${meColor};border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.3)"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(map).bindPopup("📍 내 위치");
      // 가맹점 핀
      const pts = [[myPos.lat, myPos.lng]];
      offline.forEach((m) => {
        if (m.lat == null) return;
        pts.push([m.lat, m.lng]);
        const icon = L.divIcon({ className: "", html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#fff;border:2px solid #C4B5FD;box-shadow:0 2px 6px rgba(80,60,160,.25);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:14px">${m.emoji}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 28] });
        L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(`<b>${m.name}</b><br>${m.cat} · ${m.realDist}m`);
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      // GPS 성공 시 가맹점이 다 보이게 맞춤
      if (geo.status === "ok" && pts.length > 1) { try { map.fitBounds(pts, { padding: [30, 30], maxZoom: 16 }); } catch (e) {} }
      setTimeout(() => map.invalidateSize(), 200);
    } catch (e) { setMapFailed(true); }
    return () => { if (map) { map.remove(); mapObj.current = null; } };
  }, [geo.status, geo.lat, geo.lng]);

  const statusBar = {
    locating: { txt: "내 위치 찾는 중…", cls: "bg-gray-100 text-gray-500" },
    ok: { txt: "📍 현재 위치 기준 · 실제 거리", cls: "bg-emerald-50 text-emerald-700" },
    denied: { txt: "위치 권한이 꺼져 있어 기본 위치(청주)로 보여줘요", cls: "bg-amber-50 text-amber-700" },
    error: { txt: "위치를 못 찾아 기본 위치(청주)로 보여줘요", cls: "bg-amber-50 text-amber-700" },
    unsupported: { txt: "이 기기는 위치를 지원하지 않아 기본 위치로 보여줘요", cls: "bg-amber-50 text-amber-700" },
  }[geo.status] || { txt: "", cls: "" };

  const retry = () => {
    setGeo({ status: "locating" });
    navigator.geolocation && navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: "ok", lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => setGeo({ status: e.code === 1 ? "denied" : "error" }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <ExCard badge="내 주변" title="사용 가능 가맹점" sub="FOX PAY 학생복지 가맹점 · 가까운 순">
      <div className={"mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12px] font-medium " + statusBar.cls}>
        <span>{statusBar.txt}</span>
        {(geo.status === "denied" || geo.status === "error") && (
          <button onClick={retry} className="shrink-0 px-2 py-0.5 rounded-lg bg-white/70 text-[11px] font-bold">다시 시도</button>
        )}
      </div>
      <div className="mt-3 relative rounded-2xl overflow-hidden" style={{ height: 168 }}>
        <div ref={mapRef} style={{ position: "absolute", inset: 0, display: mapFailed || geo.status === "locating" ? "none" : "block", zIndex: 0 }}></div>
        {geo.status === "locating" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-[13px] text-gray-400">지도 불러오는 중…</div>
        )}
        {mapFailed && geo.status !== "locating" && (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#EEF0FB,#F6F3FE)" }}>
            <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 35 H100 M50 0 V100 M0 70 H100" stroke="#fff" strokeWidth="3" opacity="0.8" />
              <path d="M20 0 L80 100" stroke="#fff" strokeWidth="2" opacity="0.5" />
            </svg>
            <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
              <div className="w-3.5 h-3.5 rounded-full bg-violet-600 ring-4 ring-violet-300/50"></div>
            </div>
            {offline.map((m, i) => (
              <div key={i} className="absolute" style={{ left: m.x + "%", top: m.y + "%", transform: "translate(-50%,-100%)" }} title={m.name}>
                <div className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[14px] border border-violet-100">{m.emoji}</div>
              </div>
            ))}
            <div className="absolute bottom-1.5 left-2 text-[9.5px] text-gray-400">오프라인 약식 지도</div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {offline.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{m.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-gray-800 truncate">{m.name}</div>
              <div className="text-[11px] text-gray-400">{m.cat}</div>
            </div>
            <span className="text-[12px] font-bold text-violet-600 shrink-0">{m.realDist >= 1000 ? (m.realDist / 1000).toFixed(1) + "km" : m.realDist + "m"}</span>
          </div>
        ))}
      </div>
    </ExCard>
  );
}

/* ── 6. 사용 가능 금액 (남은 지원금) ───────────────── */
function BalanceCard({ result }) {
  const Row = ({ icon, label, sub, value, unit, tint, ink }) => (
    <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: tint }}>
      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[17px] shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold" style={{ color: ink }}>{label}</div>
        <div className="text-[11px]" style={{ color: ink, opacity: 0.7 }}>{sub}</div>
      </div>
      <div className="text-[17px] font-extrabold tracking-[-0.02em] tabular-nums shrink-0" style={{ color: ink }}>{exNum(value)}<span className="text-[12px] font-bold">{unit}</span></div>
    </div>
  );

  // 오페리아 result(바우처/조르기 잔액 + 사용 가능 합계) 우선
  if (result) {
    const v = result.voucher || { limit: 0, used: 0, balance: 0 };
    const beg = result.beg || { received: 0, used: 0, balance: 0 };
    const vPct = v.limit ? Math.round(v.balance / v.limit * 100) : 0;
    return (
      <ExCard badge="실시간" title="지금 쓸 수 있는 금액" sub="바우처·조르기 잔액 합산">
        <div className="mt-3 rounded-2xl px-4 py-4" style={{ background: "linear-gradient(135deg,#5B4DD6,#4A3FB0)" }}>
          <div className="text-[12px] font-bold text-white/75">사용 가능 합계</div>
          <div className="mt-1 text-[30px] font-extrabold text-white tracking-[-0.02em]">{exNum(result.totalAvailable)}<span className="text-[16px] font-bold">원</span></div>
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          <Row icon="🎫" label="바우처(지원금)" sub={`한도 ${exNum(v.limit)}원 중 ${exNum(v.used)}원 사용`} value={v.balance} unit="원" tint="#E2F3F2" ink="#0F5A57" />
          <Row icon="💸" label="조르기 받은 금액" sub={`받음 ${exNum(beg.received)}원 중 ${exNum(beg.used)}원 사용`} value={beg.balance} unit="원" tint="#FAEAF1" ink="#8E2F52" />
        </div>
        <div className="mt-3 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed" style={{ background: "#F6F6FB", color: "#6B6E78" }}>
          💡 바우처 잔액은 한도의 {vPct}%가 남았어. {(result.appcard && result.appcard.note) || "부모카드는 카드사 한도(외부)"} 라 여기엔 합산되지 않아!
        </div>
      </ExCard>
    );
  }

  const remain = EX.supportRemaining;        // 바우처(지원금) 잔액
  const allowance = EX.voucherBalance;       // 용돈 충전금 잔액
  const points = EX.points;                  // 에듀포인트
  return (
    <ExCard badge="이번 달" title="지금 쓸 수 있는 금액" sub="항목별 남은 금액 · 합산되지 않아요">
      <div className="mt-3 flex flex-col gap-2.5">
        <Row icon="🎫" label="바우처(지원금)" sub="학생 복지 지원금" value={remain} unit="원" tint="#E2F3F2" ink="#0F5A57" color="#188F8A" />
        <Row icon="💸" label="용돈 충전금" sub="보호자가 충전한 용돈" value={allowance} unit="원" tint="#FAEAF1" ink="#8E2F52" color="#D45F86" />
        <Row icon="⭐" label="에듀포인트" sub="질문·퀴즈로 모은 포인트" value={points} unit="P" tint="#F0EBFB" ink="#4A2F8E" color="#7C5CD6" />
      </div>
      <div className="mt-3 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed" style={{ background: "#F6F6FB", color: "#6B6E78" }}>
        💡 바우처와 용돈 충전금은 따로 관리돼요. 포인트는 결제와 별개로 쌓이는 거예요!
      </div>
    </ExCard>
  );
}

/* ── 7. 온라인/오프라인 결제 내역 (only: 한쪽만) ────── */
function ChannelCard({ ledger, range, only, result }) {
  // 오페리아 result(rows: [{channel,label,amount,cnt,pct}]) 우선
  if (Array.isArray(result)) {
    const find = (k) => result.find((x) => x.channel === k) || { amount: 0, cnt: 0, pct: 0 };
    const offR = find("OFFLINE"), onR = find("ONLINE");
    const total = (offR.amount + onR.amount) || 1;
    const seg = [
      { k: "오프라인", v: offR.amount, cnt: offR.cnt, pct: offR.pct, c: "#5B4DD6", emoji: "🏪" },
      { k: "온라인", v: onR.amount, cnt: onR.cnt, pct: onR.pct, c: "#4A8DD6", emoji: "📱" },
    ];
    return (
      <ExCard badge="최근 3개월" title="온·오프라인 결제 내역" sub="결제 채널별 사용 비중">
        <div className="mt-4 flex h-4 rounded-full overflow-hidden">
          <div style={{ width: (offR.amount / total * 100) + "%", background: "#5B4DD6" }}></div>
          <div style={{ width: (onR.amount / total * 100) + "%", background: "#4A8DD6" }}></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {seg.map((s, i) => (
            <div key={i} className="rounded-2xl bg-gray-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[12px] text-gray-500"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.c }}></span>{s.emoji} {s.k}</div>
              <div className="text-[17px] font-extrabold text-gray-900 mt-0.5">{exNum(s.v)}원</div>
              <div className="text-[11px] text-gray-400">{s.cnt}건 · {s.pct != null ? s.pct : Math.round(s.v / total * 100)}%</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#5B4DD6" }}></span>
          오프라인 결제가 {seg[0].pct != null ? seg[0].pct : Math.round(offR.amount / total * 100)}%로 더 많아. 온라인보다 매장에서 더 자주 쓰네!
        </div>
      </ExCard>
    );
  }

  const r = range || EX.thisMonthRange;
  const all = (ledger || EX.ledgerSeed).filter((e) => e.type === "expense" && e.date >= r.start && e.date <= r.end);
  const on = all.filter((e) => e.channel === "online");
  const off = all.filter((e) => e.channel === "offline");
  const onSum = on.reduce((s, e) => s + e.amount, 0), offSum = off.reduce((s, e) => s + e.amount, 0);
  const total = onSum + offSum || 1;
  const badge = range && range.label ? range.label : "이번 달";

  // 한쪽 채널만 요청한 경우
  if (only) {
    const isOn = only === "online";
    const list = (isOn ? on : off).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const sum = isOn ? onSum : offSum;
    const label = isOn ? "온라인" : "오프라인";
    const emoji = isOn ? "📱" : "🏪";
    const col = isOn ? "#4A8DD6" : "#5B4DD6";
    return (
      <ExCard badge={badge} title={`${label} 결제 내역`} sub={`${fmtMD2(r.start)} ~ ${fmtMD2(r.end)}`}>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[26px] font-extrabold text-gray-900">{exNum(sum)}원</span>
          <span className="text-[12.5px] text-gray-400">{list.length}건 · 전체의 {Math.round(sum / total * 100)}%</span>
        </div>
        {list.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-7 text-center text-[14px] text-gray-500">{badge}엔 {label} 결제가 없어요 👍</div>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            {list.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{e.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-gray-800 truncate">{e.title}</div>
                  <div className="text-[11px] text-gray-400">{fmtMD2(e.date)} · {e.cat}</div>
                </div>
                <span className="text-[13.5px] font-bold text-gray-900 tabular-nums shrink-0">-{exNum(e.amount)}원</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: col }}></span>
          {label} {Math.round(sum / total * 100)}% · 나머지 {isOn ? "오프라인" : "온라인"} {exNum(isOn ? offSum : onSum)}원
        </div>
      </ExCard>
    );
  }

  const seg = [{ k: "오프라인", v: offSum, c: "#5B4DD6", emoji: "🏪", list: off }, { k: "온라인", v: onSum, c: "#4A8DD6", emoji: "📱", list: on }];
  return (
    <ExCard badge={badge} title="온·오프라인 결제 내역" sub={`${fmtMD2(r.start)} ~ ${fmtMD2(r.end)}`}>
      <div className="mt-4 flex h-4 rounded-full overflow-hidden">
        <div style={{ width: (offSum / total * 100) + "%", background: "#5B4DD6" }}></div>
        <div style={{ width: (onSum / total * 100) + "%", background: "#4A8DD6" }}></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {seg.map((s, i) => (
          <div key={i} className="rounded-2xl bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] text-gray-500"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.c }}></span>{s.emoji} {s.k}</div>
            <div className="text-[17px] font-extrabold text-gray-900 mt-0.5">{exNum(s.v)}원</div>
            <div className="text-[11px] text-gray-400">{s.list.length}건 · {Math.round(s.v / total * 100)}%</div>
          </div>
        ))}
      </div>
      <div className="mt-3.5 pt-3 border-t border-gray-100 flex flex-col gap-2">
        {all.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5).map((e, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 " + (e.channel === "online" ? "bg-cyan-50 text-cyan-600" : "bg-violet-50 text-violet-600")}>{e.channel === "online" ? "온라인" : "오프라인"}</span>
            <span className="flex-1 text-[13px] text-gray-700 truncate">{e.title}</span>
            <span className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0">-{exNum(e.amount)}원</span>
          </div>
        ))}
      </div>
    </ExCard>
  );
}

/* ── 8. 가맹점별 사용 금액 순위 ───────────────── */
function MerchantBreakdownCard({ ledger, range, result }) {
  const r = range || EX.thisMonthRange;
  let list, max, top, totalAmt;
  if (Array.isArray(result)) {
    // 오페리아 result(rows: [{merchant, amount, pct}]) 우선
    totalAmt = result.reduce((s, e) => s + e.amount, 0) || 1;
    list = result.map((e) => ({ name: e.merchant, value: e.amount, pct: e.pct, count: null }));
    max = list.length ? Math.max(...list.map((m) => m.value)) : 1;
    top = list[0] || null;
  } else {
    const ex = (ledger || EX.ledgerSeed).filter((e) => e.type === "expense" && e.date >= r.start && e.date <= r.end);
    totalAmt = ex.reduce((s, e) => s + e.amount, 0) || 1;
    const vouchers = (EX.schema && EX.schema.vouchers) || [];
    // 결제 항목 → 실제 가맹점명 (가맹점 테이블 매칭되면 정식 상호, 아니면 결제처명)
    const nameOf = (e) => {
      const nm = e.merchant || e.title;
      const v = vouchers.find((x) => x.MERCHANT_NM === nm || x.MERCHANT_NM.startsWith(nm) || (nm && nm.startsWith(x.MERCHANT_NM)));
      return (v && v.MERCHANT_NM) || nm;
    };
    const agg = {};
    ex.forEach((e) => { const k = nameOf(e); if (!agg[k]) agg[k] = { name: k, value: 0, count: 0, emoji: e.emoji }; agg[k].value += e.amount; agg[k].count++; });
    list = Object.values(agg).sort((a, b) => b.value - a.value).slice(0, 6);
    max = list.length ? list[0].value : 1;
    top = list[0] || null;
  }
  return (
    <ExCard badge={Array.isArray(result) ? "최근 3개월" : (range && range.label ? range.label : "이번 달")} title="주로 어디에 썼을까?" sub="가맹점별 사용 금액 순">
      <div className="mt-4 flex flex-col gap-2.5">
        {list.map((m, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-5 text-[12px] font-extrabold text-gray-400 text-center shrink-0">{i + 1}</span>
            <span className="w-[96px] text-[12.5px] text-gray-700 shrink-0 truncate">{m.name}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: Math.max(m.value / max * 100, 6) + "%", background: "#5B4DD6" }}></div></div>
            <span className="text-[11px] text-gray-400 w-8 text-right tabular-nums">{m.count != null ? m.count + "회" : (m.pct != null ? m.pct + "%" : "")}</span>
            <span className="text-[12.5px] font-bold text-gray-800 w-[52px] text-right tabular-nums">{exNum(m.value)}</span>
          </div>
        ))}
      </div>
      {top && (
        <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
          💡 {top.name}에서 제일 많이 썼어 ({exNum(top.value)}원{top.count != null ? `, ${top.count}번` : `, 전체의 ${top.pct != null ? top.pct : Math.round(top.value / totalAmt * 100)}%`}). 자주 가는 곳이네!
        </div>
      )}
    </ExCard>
  );
}

/* ── 9. 부모(보호자) 카드 사용 내역 ────────────────── */
function ParentCardCard({ ledger, result }) {
  // 오페리아 result({total, count, rows:[{date, merchant, amount}]}) 우선
  const ex = (result && Array.isArray(result.rows))
    ? result.rows.map((rw) => ({ id: rw.date + rw.merchant, type: "expense", date: rw.date, cat: "부모카드", emoji: "💳", title: rw.merchant, amount: rw.amount }))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    : (ledger || EX.ledgerSeed).filter((e) => e.type === "expense" && e.payer === "부모카드").sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = (result && result.total != null) ? result.total : ex.reduce((s, e) => s + e.amount, 0);
  return (
    <ExCard badge="보호자 카드" title="부모 카드 사용 내역" sub="연계된 보호자 카드 결제">
      <div className="mt-3 text-[26px] font-extrabold text-gray-900">{exNum(total)}원</div>
      <div className="text-[12px] text-gray-400 mb-3">총 {ex.length}건 · 본인 지원금과 분리 표기</div>
      {ex.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-[13px] text-gray-400">보호자 카드 결제 내역이 없어요 👍</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {ex.map((e, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{e.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-gray-800 truncate">{e.title}</div>
                <div className="text-[11px] text-gray-400">{fmtMD2(e.date)} · {e.cat}</div>
              </div>
              <span className="text-[13.5px] font-bold text-gray-900 tabular-nums shrink-0">-{exNum(e.amount)}원</span>
            </div>
          ))}
        </div>
      )}
    </ExCard>
  );
}

/* ── 10. 학교별 사용 비교 (학교급별 충북 TOP5) ────────── */
function SchoolCompareCard({ grade = "중학", result }) {
  const gLabel = { 초등: "초등학교", 중학: "중학교", 고등: "고등학교" }[grade] || "중학교";
  // 오페리아 result(rows: [{school, avgPerStudent, students, me}]) 우선 — 평균은 행에서 산출
  let schools, avg;
  if (Array.isArray(result)) {
    schools = result.map((s) => ({ name: s.school, value: s.avgPerStudent, me: !!s.me, students: s.students })).sort((a, b) => b.value - a.value);
    const mean = Math.round(schools.reduce((sum, s) => sum + s.value, 0) / (schools.length || 1));
    avg = { name: "충북 평균", value: mean, avg: true };
  } else {
    const all = (EX.schoolCompareByGrade && EX.schoolCompareByGrade[grade]) || EX.schoolCompare;
    schools = all.filter((s) => !s.avg).slice().sort((a, b) => b.value - a.value);
    avg = all.find((s) => s.avg);
  }
  const me = schools.find((s) => s.me);
  const myRank = schools.findIndex((s) => s.me) + 1;
  const rows = schools.slice(0, 5).map((s, i) => ({ ...s, rank: i + 1 }));
  if (myRank > 5 && me) rows.push({ ...me, rank: myRank }); // 우리 학교가 TOP5 밖이면 별도 표시
  const max = Math.max(...schools.map((s) => s.value), avg ? avg.value : 0);
  const diff = me && avg ? me.value - avg.value : 0;
  return (
    <ExCard badge="이번 달" title="학교별 사용 비교" sub={`충청북도 ${gLabel} 결제 TOP5`}>
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={"w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10.5px] font-extrabold " + (s.me ? "bg-violet-600 text-white" : s.rank === 1 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500")}>{s.rank}</span>
            <span className={"w-[60px] shrink-0 text-[12px] truncate " + (s.me ? "font-extrabold text-violet-600" : "text-gray-700")}>{s.name}{s.me ? " 🦊" : ""}</span>
            <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: Math.max(s.value / max * 100, 5) + "%", background: s.me ? "#5B4DD6" : "#D7D2F2" }}></div>
            </div>
            <span className="text-[11.5px] font-bold text-gray-800 tabular-nums w-[64px] text-right whitespace-nowrap">{exNum(s.value)}원</span>
          </div>
        ))}
        {avg && (
          <div className="flex items-center gap-2 pt-2 mt-0.5 border-t border-dashed border-gray-200">
            <span className="w-5 shrink-0 text-center text-[11px]">📊</span>
            <span className="w-[60px] shrink-0 text-[12px] font-bold text-gray-500 truncate">충북 평균</span>
            <div className="flex-1 h-3.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: Math.max(avg.value / max * 100, 5) + "%", background: "#A99DF6" }}></div>
            </div>
            <span className="text-[11.5px] font-bold text-gray-500 tabular-nums w-[64px] text-right whitespace-nowrap">{exNum(avg.value)}원</span>
          </div>
        )}
      </div>
      <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
        💡 우리 학교는 충북 {gLabel} 중 <b>{myRank}위</b>예요. {diff <= 0
          ? `평균보다 ${exNum(-diff)}원 적게 쓰는 알뜰한 학교네! 🦊`
          : `평균보다 ${exNum(diff)}원 더 쓰고 있어. 조금 아껴볼까? 💪`}
      </div>
    </ExCard>
  );
}

/* ── 11. 요일·시간대별 소비 패턴 (승인시간 기반) ─────── */
function TimePatternCard({ ledger, range }) {
  const r = range || { start: EX.dMinus(EX.TODAY, 89), end: EX.TODAY, label: "최근 3개월" };
  const ex = (ledger || EX.ledgerSeed).filter((e) => e.type === "expense" && e.date >= r.start && e.date <= r.end && e.time);
  const total = ex.reduce((s, e) => s + e.amount, 0) || 1;

  // 요일별 (월~일)
  const dow = ["일", "월", "화", "수", "목", "금", "토"];
  const byDow = [0, 0, 0, 0, 0, 0, 0];
  // 시간대별 버킷
  const buckets = [
    { k: "아침", range: "7-10시", lo: 7, hi: 10, v: 0, emoji: "🌅" },
    { k: "점심", range: "11-13시", lo: 11, hi: 13, v: 0, emoji: "🍱" },
    { k: "오후", range: "14-17시", lo: 14, hi: 17, v: 0, emoji: "☀️" },
    { k: "저녁", range: "18-20시", lo: 18, hi: 20, v: 0, emoji: "🌆" },
    { k: "밤", range: "21시~", lo: 21, hi: 30, v: 0, emoji: "🌙" },
  ];
  ex.forEach((e) => {
    byDow[new Date(e.date + "T00:00:00").getDay()] += e.amount;
    const h = +e.time.slice(0, 2);
    const b = buckets.find((b) => h >= b.lo && h <= b.hi) || buckets[2];
    b.v += e.amount;
  });
  // 월~일 순서로 재배열
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const dowData = dowOrder.map((i) => ({ label: dow[i], v: byDow[i], weekend: i === 0 || i === 6 }));
  const maxDow = Math.max(...dowData.map((d) => d.v), 1);
  const maxBucket = Math.max(...buckets.map((b) => b.v), 1);
  const peakDow = dowData.reduce((a, b) => (b.v > a.v ? b : a), dowData[0]);
  const peakBucket = buckets.reduce((a, b) => (b.v > a.v ? b : a), buckets[0]);

  return (
    <ExCard badge={r.label || "최근 3개월"} title="주로 언제 쓸까?" sub="결제 승인시간 기준 · 요일·시간대 패턴">
      {/* 요일별 */}
      <div className="mt-4">
        <div className="text-[12px] text-gray-400 mb-2">요일별</div>
        <div className="flex items-end justify-between gap-1.5" style={{ height: 86 }}>
          {dowData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-t-md" title={exNum(d.v) + "원"}
                   style={{ height: Math.max(d.v / maxDow * 64, d.v > 0 ? 6 : 2) + "px", background: d.label === peakDow.label ? "#5B4DD6" : (d.weekend ? "#E5E0F7" : "#D7D2F2") }}></div>
              <span className={"text-[11px] " + (d.label === peakDow.label ? "font-bold text-violet-600" : "text-gray-400")}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* 시간대별 */}
      <div className="mt-4">
        <div className="text-[12px] text-gray-400 mb-2">시간대별</div>
        <div className="flex flex-col gap-2">
          {buckets.map((b, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-5 text-[13px] text-center shrink-0">{b.emoji}</span>
              <span className="w-[78px] text-[12px] text-gray-500 shrink-0">{b.k} <span className="text-gray-300">{b.range}</span></span>
              <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: Math.max(b.v / maxBucket * 100, b.v > 0 ? 6 : 0) + "%", background: b.k === peakBucket.k ? "#5B4DD6" : "#D7D2F2" }}></div>
              </div>
              <span className="text-[12px] font-bold text-gray-800 tabular-nums w-[58px] text-right">{exNum(b.v)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-violet-50/70 px-3.5 py-3 text-[12.5px] text-violet-900 leading-relaxed">
        💡 주로 <b>{peakDow.label}요일</b> {peakBucket.k}({peakBucket.range})에 가장 많이 써. 그 시간대에 한 번 더 생각하면 절약에 도움이 돼!
      </div>
    </ExCard>
  );
}

Object.assign(window, { FriendCompareCard, NudgeListCard, NudgeCompareCard, MerchantMapCard, BalanceCard, ChannelCard, MerchantBreakdownCard, ParentCardCard, SchoolCompareCard, TimePatternCard });

export { ExCard, TriBar, FriendCompareCard, NudgeListCard, NudgeCompareCard, MerchantMapCard, BalanceCard, ChannelCard, MerchantBreakdownCard, ParentCardCard, SchoolCompareCard, TimePatternCard };
