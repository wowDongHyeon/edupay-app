// SSE(text/event-stream) 파서 — DATASOURCE_설계.md §5.1
// operia/backend 어댑터(Phase C/D)가 fetch 응답 본문을 이걸로 파싱해 { event, data } 로 흘려보낸다.
// mock(Phase A)은 네트워크가 없으므로 이 파서를 쓰지 않지만, 계약상 지금 갖춰 둔다.
//
// SSE 포맷:
//   event: <name>\n           (없으면 "message")
//   data: <payload>\n          (여러 data: 라인은 \n 으로 이어붙임)
//   \n                         (빈 줄 = 한 이벤트 경계)
//   : <comment>                (무시), id:/retry: (여기선 무시)

/**
 * SSE 한 블록(라인 묶음)을 { event, data } 로 파싱. data 가 JSON 이면 파싱, 아니면 원문 문자열.
 * @param {string} block  빈 줄로 구분된 한 이벤트의 라인들
 * @returns {{event:string, data:any, raw:string}|null}
 */
export function parseEventBlock(block) {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue; // 빈 줄/주석
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    // 명세: ':' 뒤 공백 1칸은 제거
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
    // id/retry 등은 무시
  }
  if (!dataLines.length && event === "message") return null;
  const raw = dataLines.join("\n");
  let data = raw;
  if (raw) {
    try { data = JSON.parse(raw); } catch (e) { data = raw; }
  }
  return { event, data, raw };
}

/**
 * 순수 텍스트(완성된 스트림 전체) → 이벤트 배열. 테스트/단발 응답용.
 * @param {string} text
 * @returns {{event:string, data:any, raw:string}[]}
 */
export function parseSseText(text) {
  return String(text || "")
    .split(/\r?\n\r?\n/) // 빈 줄로 이벤트 분리
    .map(parseEventBlock)
    .filter(Boolean);
}

/**
 * fetch 응답 본문(ReadableStream)을 SSE로 스트리밍 파싱. 청크 경계를 버퍼링해
 * 완성된 이벤트마다 onEvent({event,data,raw}) 호출. abort 시 즉시 중단.
 * @param {Response} response  Accept: text/event-stream 으로 받은 응답
 * @param {(e:{event:string,data:any,raw:string})=>void} onEvent
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export async function consumeEventStream(response, onEvent, signal) {
  if (!response || !response.body || typeof response.body.getReader !== "function") {
    // 본문 스트림이 없으면(테스트 환경 등) 전체 텍스트로 폴백 파싱
    const text = response && typeof response.text === "function" ? await response.text() : "";
    for (const e of parseSseText(text)) onEvent(e);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const onAbort = () => { try { reader.cancel(); } catch (e) {} };
  if (signal) {
    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // 완성된 이벤트(빈 줄 경계)들을 모두 방출, 마지막 미완성 조각은 버퍼에 보존
      let sep;
      while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + (buffer[sep] === "\r" ? 4 : 2));
        const e = parseEventBlock(block);
        if (e) onEvent(e);
      }
    }
    // 스트림 종료 후 버퍼에 남은 마지막 이벤트 처리
    const tail = parseEventBlock(buffer);
    if (tail) onEvent(tail);
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
