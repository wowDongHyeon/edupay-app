import React from "react";
import { TableCard } from "../TableCard";
/* 폴백 table 템플릿 — data(rows[] 또는 임의) → 기존 TableCard. config 없거나 매핑 없을 때. */
export function TableTemplate({ data, config, intent }) {
  return <TableCard result={data} intent={intent} />;
}
export default TableTemplate;
