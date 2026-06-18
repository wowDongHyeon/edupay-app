import React from "react";
import L from "leaflet";
import { ChartShell, CAT_EMOJI } from "./util";
/* map : 근처 사용 가능 가맹점 (오페리아 result {center:{lat,lng}, merchants:[{name,category,addr,lat,lng}]})
   Leaflet+OSM 실지도, 타일 실패/오프라인 시 약식 지도 폴백. GPS 성공 시 실제 거리. */

const distM = (a, b) => {
  const R = 6371000, toR = (d) => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
};

export function MapChartCard({ result }) {
  const mapRef = React.useRef(null);
  const mapObj = React.useRef(null);
  const [mapFailed, setMapFailed] = React.useState(typeof L === "undefined");
  const [geo, setGeo] = React.useState({ status: "locating", lat: null, lng: null });

  const center = (result && result.center) || { lat: 36.6372, lng: 127.486 };
  const merchants = (result && Array.isArray(result.merchants) ? result.merchants : []).map((m, i) => ({
    name: m.name, cat: m.category, lat: m.lat, lng: m.lng, addr: m.addr,
    emoji: CAT_EMOJI[m.category] || "📍",
    x: Math.min(92, Math.max(8, 50 + (m.lng - center.lng) * 4000)),
    y: Math.min(88, Math.max(12, 50 - (m.lat - center.lat) * 4000)),
  }));

  const myPos = geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : center;
  const list = merchants
    .map((m) => ({ ...m, realDist: m.lat != null ? distM(myPos, { lat: m.lat, lng: m.lng }) : null }))
    .sort((a, b) => (a.realDist ?? 9e9) - (b.realDist ?? 9e9));

  React.useEffect(() => {
    if (!navigator.geolocation) { setGeo({ status: "unsupported" }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: "ok", lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => setGeo({ status: e.code === 1 ? "denied" : "error" }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  React.useEffect(() => {
    if (geo.status === "locating") return;
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
      const meColor = geo.status === "ok" ? "#4A8DD6" : "#5B4DD6";
      L.marker([myPos.lat, myPos.lng], { icon: L.divIcon({ className: "", html: `<div style="width:16px;height:16px;border-radius:50%;background:${meColor};border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.3)"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(map).bindPopup("📍 내 위치");
      const pts = [[myPos.lat, myPos.lng]];
      list.forEach((m) => {
        if (m.lat == null) return;
        pts.push([m.lat, m.lng]);
        const icon = L.divIcon({ className: "", html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#fff;border:2px solid #C4B5FD;box-shadow:0 2px 6px rgba(80,60,160,.25);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:14px">${m.emoji}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 28] });
        L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(`<b>${m.name}</b><br>${m.cat} · ${m.realDist}m`);
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
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
    <ChartShell badge="내 주변" title="사용 가능 가맹점" sub="FOX PAY 학생복지 가맹점 · 가까운 순">
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
        {list.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[15px] shrink-0">{m.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-gray-800 truncate">{m.name}</div>
              <div className="text-[11px] text-gray-400 truncate">{m.cat}{m.addr ? " · " + m.addr : ""}</div>
            </div>
            {m.realDist != null && (
              <span className="text-[12px] font-bold text-violet-600 shrink-0">{m.realDist >= 1000 ? (m.realDist / 1000).toFixed(1) + "km" : m.realDist + "m"}</span>
            )}
          </div>
        ))}
      </div>
    </ChartShell>
  );
}
