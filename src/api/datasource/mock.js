// mock 어댑터 (3순위) — DATASOURCE_설계.md §5.3, §0.2(프론트가 카드 결정 + tableData shape)
//
// 네트워크 없이 operia 와 동일한 SSE 흐름(data 청크 → result)을 로컬 시뮬. ★bridge 없음.
//   채널은 '표준 tableData + columnMetadata + queryInfo.sql + answer'만 준다(카드를 모름).
//   카드 결정·shape 는 프론트(cardIntent + shapeForIntent). 그래서 mock 은 SQL raw rows 를 tableData 로 그대로 흘린다.
//   reportPlan 은 폴백 전용이라 mock 은 싣지 않는다(프론트 shapeForIntent 가 주 경로; 실패 시 table).

import { runKnown, runClaudeSql } from "../operia";
import { QUERIES } from "../../mock/operia/queries";
import { makeDataEvent, makeResultEvent, STATUS } from "./contract";
import { inferColumnMetadata } from "./stats";

export const mockSource = {
  async query(req, handlers, signal) {
    const userInput = (req && req.userInput) || "";
    const hints = (req && req.hints) || {};
    const intent = hints.intent || null;
    const { onData, onResult, onError } = handlers || {};

    const timers = [];
    const aborted = () => !!(signal && signal.aborted);
    const sleep = (ms) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        timers.push(t);
        if (signal) signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
      });

    try {
      if (aborted()) return;

      // 결정적 엔진: 알려진 intent=템플릿 SQL(rawRows), 그 외=Claude SQL(키 없으면 unsupported)
      let engine;
      try {
        engine = QUERIES[intent] ? runKnown(intent, userInput) : await runClaudeSql(userInput || String(intent || ""));
      } catch (e) {
        if (onError) onError({ code: "ENGINE_ERROR", message: (e && e.message) || String(e) });
        return;
      }

      // 미지원(키 없음 등) → data 없이 친절 안내(프론트가 텍스트로 표시)
      if (engine && engine.unsupported) {
        await sleep(180);
        if (aborted()) return;
        onResult && onResult(makeResultEvent({
          status: STATUS.COMPLETED, success: true, answer: engine.message || "", unsupported: true,
          queryInfo: { sql: engine.sql || null, source: "template" },
        }));
        return;
      }

      // 표준 tableData = SQL raw rows(컬럼 계약). 프론트 shapeForIntent 가 카드 입력으로 변환.
      const tableData = Array.isArray(engine.rawRows) ? engine.rawRows : (Array.isArray(engine.result) ? engine.result : []);
      const columnMetadata = inferColumnMetadata(tableData);

      await sleep(160);
      if (aborted()) return;
      onData && onData(makeDataEvent({ chunkIndex: 0, isLast: true, tableData, columnMetadata, totalCount: tableData.length }));

      await sleep(160);
      if (aborted()) return;
      onResult && onResult(makeResultEvent({
        status: STATUS.COMPLETED,
        success: true,
        answer: "", // 카드 자체가 답 → 말풍선 없음(기존과 동일)
        columnMetadata,
        totalCount: tableData.length,
        queryInfo: { sql: engine.sql, source: engine.source || "template" }, // §9 SQL 칩(+칩 라벨용 source)
        // reportPlan/summaryStats: 미전송 — 프론트 shapeForIntent(주 경로) + computeSummaryStats(클라 계산)
      }));
    } catch (e) {
      if (e && e.name === "AbortError") return;
      if (onError) onError({ code: "MOCK_ERROR", message: (e && e.message) || String(e) });
    } finally {
      timers.forEach((t) => clearTimeout(t));
    }
  },
};

export default mockSource;
