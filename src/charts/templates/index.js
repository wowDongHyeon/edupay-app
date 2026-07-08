// 템플릿 레지스트리 — templateId → 제네릭 컴포넌트. ChartRenderer가 config.template으로 선택.
import { BarTemplate } from "./bar.jsx";
import { DonutTemplate } from "./donut.jsx";
import { BarListTemplate } from "./barlist.jsx";
import { StatListTemplate } from "./statList.jsx";
import { CompareTemplate } from "./compare.jsx";
import { TrendTemplate } from "./trend.jsx";
import { TxListTemplate } from "./txList.jsx";
import { TxnListTemplate } from "./txnList.jsx";
import { MapTemplate } from "./map.jsx";
import { ListTemplate } from "./list.jsx";
import { TableTemplate } from "./table.jsx";
import { LineTemplate } from "./line.jsx";
import { AreaTemplate } from "./area.jsx";
import { PieTemplate } from "./pie.jsx";
import { KpiCardsTemplate } from "./kpiCards.jsx";

export const TEMPLATES = {
  bar: BarTemplate,
  donut: DonutTemplate,
  barlist: BarListTemplate,
  statList: StatListTemplate,
  compare: CompareTemplate,
  trend: TrendTemplate,
  txList: TxListTemplate,
  txnList: TxnListTemplate,
  map: MapTemplate,
  list: ListTemplate,
  table: TableTemplate,
  // generic reportPlan 전용(§6-2)
  line: LineTemplate,
  area: AreaTemplate,
  pie: PieTemplate,
  kpiCards: KpiCardsTemplate,
};
export default TEMPLATES;
