import React from "react";
import { MapChartCard } from "../MapChartCard";
/* map 템플릿(named) — 카카오 지도(특수 레이아웃). data {center, items} + config(텍스트/배지). */
export function MapTemplate({ data, config }) {
  const cfg = config || {};
  return <MapChartCard result={data} title={cfg.title} subtitle={cfg.subtitle} badge={cfg.badge} />;
}
export default MapTemplate;
