import React from "react";
import { BarChartCard, DonutChartCard, CompareChartCard, GaugeChartCard, BarListChartCard, ListChartCard } from "./cards";
import { MapChartCard } from "./MapChartCard";
import { TableCard } from "./TableCard";
/* ChartRenderer : 오페리아 데이터 메시지 렌더 진입점.
   chartType(레지스트리가 intent로 결정)으로 분기. 매핑 없으면 기본 TableCard(표). */

export function ChartRenderer({ type, result, intent, question }) {
  switch (type) {
    case "bar": return <BarChartCard result={result} />;
    case "donut": return <DonutChartCard result={result} />;
    case "compare": return <CompareChartCard result={result} intent={intent} />;
    case "map": return <MapChartCard result={result} />;
    case "gauge": return <GaugeChartCard result={result} />;
    case "barlist": return <BarListChartCard result={result} />;
    case "list": return <ListChartCard result={result} />;
    case "table":
    default:
      return <TableCard result={result} intent={intent} />;
  }
}

export default ChartRenderer;
