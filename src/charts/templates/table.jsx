import React from "react";
import { TableCard } from "../TableCard";
/* 폴백 table 템플릿 — data(rows[] 또는 임의) → 기존 TableCard. config 없거나 매핑 없을 때.
   columnMetadata 전달 시 헤더를 한글 label 로(없으면 영문 키). */
export function TableTemplate({ data, config, intent, columnMetadata }) {
  return <TableCard result={data} intent={intent} columnMetadata={columnMetadata} />;
}
export default TableTemplate;
