import React from "react";
import { ChartShell, CAT_EMOJI } from "./util";
import { ExpandableText } from "./ExpandableText";
/* map : 근처 사용 가능 가맹점 (오페리아 result {center:{lat,lng}, merchants:[{name,category,addr,lat,lng}]})
   카카오 지도(JS SDK) 실지도 + 가맹점 마커/라벨. 기본 위치 = 대전 유성구 신성동 중심(거리 현실화).
   VITE_KAKAO_MAP_KEY 없거나 SDK 로드 실패 → 기존 '오프라인 약식 지도'(격자+상대좌표) 폴백. */

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;
const DAEJEON_SINSEONG = { lat: 36.3615, lng: 127.3545 }; // 대전 유성구 신성동 중심(실 가맹점 데이터 지역 · 원거리 GPS 폴백)

// 하버사인 거리(m)
const distM = (a, b) => {
  const R = 6371000, toR = (d) => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
};

// 카카오 지도 SDK 1회 동적 로드(autoload=false → kakao.maps.load로 초기화). 키 없으면 거부 → 폴백.
let kakaoPromise = null;
function loadKakao(key) {
  if (typeof window === "undefined" || !key) return Promise.reject(new Error("no kakao key"));
  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) return Promise.resolve(window.kakao);
  if (kakaoPromise) return kakaoPromise;
  kakaoPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    s.async = true;
    s.onload = () => {
      if (window.kakao && window.kakao.maps) window.kakao.maps.load(() => resolve(window.kakao));
      else reject(new Error("kakao sdk missing"));
    };
    s.onerror = () => { kakaoPromise = null; reject(new Error("kakao sdk script error")); };
    document.head.appendChild(s);
  });
  return kakaoPromise;
}

export function MapChartCard({ result, title, subtitle, badge }) {
  const mapRef = React.useRef(null);
  const [mapFailed, setMapFailed] = React.useState(!KAKAO_KEY); // 키 없으면 처음부터 약식 폴백
  const [geo, setGeo] = React.useState({ status: "locating", lat: null, lng: null });
  const [visibleCount, setVisibleCount] = React.useState(5); // 하단 리스트만 점진 노출(지도 마커는 전부)

  const merchantsRaw = (result && Array.isArray(result.items || result.merchants) ? (result.items || result.merchants) : []).filter((m) => m.lat != null && m.lng != null);
  // 지도 중심: result.center → 가맹점 평균 → 대전 신성동 기본
  const avg = merchantsRaw.length
    ? { lat: merchantsRaw.reduce((s, m) => s + m.lat, 0) / merchantsRaw.length, lng: merchantsRaw.reduce((s, m) => s + m.lng, 0) / merchantsRaw.length }
    : null;
  const center = (result && result.center) || avg || DAEJEON_SINSEONG;

  // 약식 폴백용 상대좌표(x/y%)
  const merchants = (result && Array.isArray(result.items || result.merchants) ? (result.items || result.merchants) : []).map((m) => ({
    name: m.name, cat: m.category, lat: m.lat, lng: m.lng, addr: m.addr,
    emoji: CAT_EMOJI[m.category] || "📍",
    x: Math.min(92, Math.max(8, 50 + (m.lng - center.lng) * 4000)),
    y: Math.min(88, Math.max(12, 50 - (m.lat - center.lat) * 4000)),
  }));

  // 내 위치 정책(데모): GPS가 가맹점 무리에서 멀면(>30km, 예: 서울 접속) 대전 신성동 중심으로 대체.
  //   가까우면 실 GPS 사용 → 어디서 접속해도 대전 신성동 기준·거리 수백 m, 지도도 동네 단위로 확대.
  const gps = geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : null;
  const realLoc = !!(gps && distM(gps, center) <= 30000); // 30km 이내면 실 위치로 인정
  const myPos = realLoc ? gps : DAEJEON_SINSEONG;
  const list = merchants
    .map((m) => ({ ...m, realDist: m.lat != null ? distM(myPos, { lat: m.lat, lng: m.lng }) : null }))
    .sort((a, b) => (a.realDist ?? 9e9) - (b.realDist ?? 9e9));

  // GPS
  React.useEffect(() => {
    if (!navigator.geolocation) { setGeo({ status: "unsupported" }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: "ok", lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => setGeo({ status: e.code === 1 ? "denied" : "error" }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // 카카오 지도 렌더 (geo 확정 후)
  React.useEffect(() => {
    if (geo.status === "locating") return;
    if (!KAKAO_KEY) { setMapFailed(true); return; }
    let cancelled = false;
    loadKakao(KAKAO_KEY).then((kakao) => {
      if (cancelled || !mapRef.current) return;
      const ctr = new kakao.maps.LatLng(myPos.lat, myPos.lng);
      const map = new kakao.maps.Map(mapRef.current, { center: ctr, level: 5, draggable: true });
      // 첫 화면 = 내 위치 중심 + 가까운 N개가 보이는 줌. 내 위치 '대칭' bounds(반경 = 가까운 N개까지 최대 Δ, 최소반경 클램프)
      //   → 매장이 한쪽에 몰려도 내 위치가 항상 화면 중앙. 전체 fit(모든 매장)로 구석에 밀리던 문제 해결.
      const NEAR_N = 4; // 가까운 매장 3~5개(+내 위치)가 함께 보이게
      const near = list.filter((m) => m.lat != null).slice(0, NEAR_N);
      let dLat = 0.003, dLng = 0.004; // 최소 반경(~300m 상당) — 매장이 몰려도 과확대 방지
      near.forEach((m) => { dLat = Math.max(dLat, Math.abs(m.lat - myPos.lat)); dLng = Math.max(dLng, Math.abs(m.lng - myPos.lng)); });
      const viewBounds = new kakao.maps.LatLngBounds();
      viewBounds.extend(new kakao.maps.LatLng(myPos.lat - dLat, myPos.lng - dLng));
      viewBounds.extend(new kakao.maps.LatLng(myPos.lat + dLat, myPos.lng + dLng));
      // 내 위치 점
      const meColor = realLoc ? "#4A8DD6" : "#5B4DD6";
      new kakao.maps.CustomOverlay({
        map, position: ctr, xAnchor: 0.5, yAnchor: 0.5, zIndex: 5,
        content: `<div style="width:16px;height:16px;border-radius:50%;background:${meColor};border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.3)"></div>`,
      });
      // 가맹점 마커 + 간단 라벨(이름)
      list.forEach((m) => {
        if (m.lat == null) return;
        const pos = new kakao.maps.LatLng(m.lat, m.lng);
        new kakao.maps.Marker({ map, position: pos, title: m.name });
        new kakao.maps.CustomOverlay({
          map, position: pos, yAnchor: 2.35, zIndex: 4,
          content: `<div style="padding:1px 6px;background:#fff;border:1px solid #E0D9F7;border-radius:8px;font-size:10.5px;font-weight:700;color:#5B4DD6;white-space:nowrap;box-shadow:0 1px 3px rgba(80,60,160,.18)">${m.name}</div>`,
        });
      });
      // 가맹점(+가까운 내 위치) 기준으로 맞춤. 원거리 GPS는 위에서 대전 신성동으로 대체돼 줌아웃되지 않음.
      // 레벨 클램프: 너무 넓으면(>6) 동네 단위로, 한 점에 몰리면(<4) 과확대 방지.
      const applyBounds = () => {
        if (!near.length) return;
        try {
          map.setBounds(viewBounds, 28, 28, 28, 28); // 내 위치 대칭 bounds → 내 위치가 화면 중앙
          const lv = map.getLevel();
          if (lv > 6) map.setLevel(6);
          else if (lv < 4) map.setLevel(4);
          map.setCenter(ctr); // 레벨 클램프 후에도 내 위치를 중앙에 고정
        } catch (e) {}
      };
      applyBounds();
      setMapFailed(false);
      setTimeout(() => { try { map.relayout(); applyBounds(); } catch (e) {} }, 200);
    }).catch(() => { if (!cancelled) setMapFailed(true); });
    return () => { cancelled = true; };
  }, [geo.status, geo.lat, geo.lng]);

  // 배지: 실 위치(가까운 GPS)면 "현재 위치 기준 · 실제 거리", 그 외(원거리 GPS·미허용·실패)는 "대전 신성동 기준 · 예시 거리"
  const statusBar = geo.status === "locating"
    ? { txt: "내 위치 찾는 중…", cls: "bg-gray-100 text-gray-500" }
    : realLoc
    ? { txt: "📍 현재 위치 기준 · 실제 거리", cls: "bg-emerald-50 text-emerald-700" }
    : { txt: "대전 신성동 기준 · 예시 거리", cls: "bg-amber-50 text-amber-700" };

  const retry = () => {
    setGeo({ status: "locating" });
    navigator.geolocation && navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: "ok", lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => setGeo({ status: e.code === 1 ? "denied" : "error" }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <ChartShell badge={badge} title={title} sub={subtitle}>
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
            {list.map((m, i) => (
              <div key={i} className="absolute" style={{ left: m.x + "%", top: m.y + "%", transform: "translate(-50%,-100%)" }} title={m.name}>
                <div className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[14px] border border-violet-100">{m.emoji}</div>
              </div>
            ))}
            <div className="absolute bottom-1.5 left-2 text-[9.5px] text-gray-400">오프라인 약식 지도</div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {list.slice(0, visibleCount).map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{m.emoji}</span>
            <div className="flex-1 min-w-0">
              <ExpandableText as="div" text={m.name} className="text-[13.5px] font-semibold text-gray-800" />
              <ExpandableText as="div" text={`${m.cat}${m.addr ? " · " + m.addr : ""}`} className="text-[11px] text-gray-400" />
            </div>
            {m.realDist != null && (
              <span className="text-[12px] font-bold text-violet-600 shrink-0">{m.realDist >= 1000 ? (m.realDist / 1000).toFixed(1) + "km" : m.realDist + "m"}</span>
            )}
          </div>
        ))}
        {visibleCount < list.length && (
          <button
            onClick={() => setVisibleCount((c) => c + 5)}
            className="mt-1 w-full py-2 rounded-xl bg-gray-50 text-[12.5px] font-bold text-violet-600"
          >
            더보기
          </button>
        )}
      </div>
    </ChartShell>
  );
}
