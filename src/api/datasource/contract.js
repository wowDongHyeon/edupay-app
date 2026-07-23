// 데이터창구(Data Source) 통합 계약 — DATASOURCE_설계.md §4 (operia 계약 채택)
//
// 3채널(operia | backend | mock)이 모두 동일한 SSE 이벤트 2종(data 청크 0..N → result 1회)을 낸다.
// 어댑터 시그니처(§4.1):
//   query({ userInput, context:{companyId} }, { onData, onResult, onError }, signal) => Promise<void>
//   ※ context 외 hints(intent/scope)는 in-process mock 전용 힌트. 실 채널(operia/backend)은 와이어로 보내지 않는다(질문+companyId만).
//
// 이 파일은 "타입(JSDoc) + 빈값/생성 헬퍼"만 담는다. 실제 transport는 sse.js / 어댑터가 담당.

/**
 * data 이벤트 (§4.3) — 쿼리 실행 후 청크 단위 0..N회.
 * @typedef {Object} DataEvent
 * @property {number}   chunkIndex      청크 순번(0부터)
 * @property {boolean}  isLast          마지막 청크면 true
 * @property {Object[]} tableData       결과 행. 키 = columnMetadata.column
 * @property {ColumnMeta[]} columnMetadata  컬럼 메타(아래)
 * @property {number}   [totalCount]    전체 행 수
 * @property {Object}   [summaryStats]  수치형 통계(§4.4) — 채널은 비워도 됨(클라가 계산)
 */

/**
 * @typedef {Object} ColumnMeta
 * @property {('varchar'|'decimal'|'integer'|'date'|'datetime')} type
 * @property {string} column   행 객체의 키
 * @property {string} label    표시용 라벨
 * @property {number} [displayOrder]  result 이벤트에서만(§4.3)
 */

/**
 * result 이벤트 (§4.3) — 워크플로우 완료 1회.
 * @typedef {Object} ResultEvent
 * @property {string}   [workflowId]
 * @property {string}   [threadId]
 * @property {string}   [sessionId]
 * @property {('COMPLETED'|'FAILED'|'PARTIAL')} status
 * @property {boolean}  [hilRequired]
 * @property {boolean}  [hilApproved]
 * @property {string}   [timestamp]    ISO8601(UTC)
 * @property {string}   answer         사용자에게 보일 자연어 답변
 * @property {boolean}  success
 * @property {string|null} [errorMessage]
 * @property {ColumnMeta[]} [columnMetadata]
 * @property {boolean}  [hasNext]
 * @property {number}   [totalCount]
 * @property {Object}   [queryInfo]    AI 판단 메타. queryInfo.sql 이 있으면 SQL 칩 노출(§9)
 * @property {Object}   [queryBreakdown]  실행 필터 구조화(filters[]). 날짜필터 → 기간 배지 도출(기간정책 02 D1)
 * @property {Object}   [reportPlan]   UI 섹션 구성(§6, §7)
 * @property {Object}   [summaryStats] §4.4 — 클라 계산값을 단일 기준으로 사용(채널 값 무시 가능)
 * @property {string}   [summary]      에이전트 실행 로그(디버그/감사)
 * @property {boolean}  [unsupported]  (mock 한정) 미지원 데이터질문 — answer 를 친절 안내 텍스트로 표시
 * ※ 렌더 일원화(§0.2): bridge 필드 제거. 프론트는 표준 계약(tableData+reportPlan)만 소비한다.
 */

// SSE 이벤트 이름 (text/event-stream 의 `event:` 라인)
export const EVT = { DATA: "data", RESULT: "result" };

// 결과 상태값(§4.3)
export const STATUS = { COMPLETED: "COMPLETED", FAILED: "FAILED", PARTIAL: "PARTIAL" };

/**
 * data 이벤트 생성 헬퍼 — 누락 필드에 안전한 기본값.
 * @param {Partial<DataEvent>} e
 * @returns {DataEvent}
 */
export function makeDataEvent(e = {}) {
  return {
    chunkIndex: e.chunkIndex ?? 0,
    isLast: e.isLast ?? true,
    tableData: Array.isArray(e.tableData) ? e.tableData : [],
    columnMetadata: Array.isArray(e.columnMetadata) ? e.columnMetadata : [],
    totalCount: e.totalCount ?? (Array.isArray(e.tableData) ? e.tableData.length : 0),
    summaryStats: e.summaryStats,
  };
}

/**
 * result 이벤트 생성 헬퍼 — status/success 기본 COMPLETED/true.
 * @param {Partial<ResultEvent>} e
 * @returns {ResultEvent}
 */
export function makeResultEvent(e = {}) {
  return {
    status: e.status || STATUS.COMPLETED,
    success: e.success ?? true,
    answer: e.answer ?? "",
    errorMessage: e.errorMessage ?? null,
    columnMetadata: e.columnMetadata,
    totalCount: e.totalCount,
    queryInfo: e.queryInfo,
    queryBreakdown: e.queryBreakdown,  // 기간정책 02: 날짜필터 → 기간 배지 도출(백업 queryInfo.조건)
    reportPlan: e.reportPlan,
    summaryStats: e.summaryStats,
    summary: e.summary,
    ...e,
  };
}

// 워크플로우/오류 판별 헬퍼
export const isLastChunk = (e) => !!(e && e.isLast);
export const isFailure = (e) => !!(e && (e.success === false || e.status === STATUS.FAILED));

// queryInfo.sql 추출(§9) — 없으면 null(칩 숨김)
export const sqlOf = (result) => (result && result.queryInfo && result.queryInfo.sql) || null;
