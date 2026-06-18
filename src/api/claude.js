// ──────────────────────────────────────────────────────────────
// [시연용] 브라우저에서 Claude API 직접 호출.
// window.claude.complete({ messages }) 형태로 App.jsx의 askAI()가 사용.
//
// ⚠️ 시연 전용: API 키가 번들에 포함되어 노출됩니다.
//   - 저한도 전용 키 사용 / 시연 후 즉시 폐기 / 공개배포·git 커밋 금지
//   - 실서비스 전환 시 이 파일을 백엔드 프록시 호출로 교체(키는 서버에만)
// ──────────────────────────────────────────────────────────────
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = import.meta.env.VITE_CLAUDE_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = Number(import.meta.env.VITE_CLAUDE_MAX_TOKENS || 1024);
const KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function complete({ messages, max_tokens = MAX_TOKENS, system } = {}) {
  if (!KEY) throw new Error("VITE_ANTHROPIC_API_KEY 미설정 (.env 확인)");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      // 브라우저 직접 호출 허용 (시연용)
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${detail}`);
  }

  const data = await res.json();
  // content 블록들의 text를 이어붙여 반환 (App.jsx parseAI가 문자열을 기대)
  return (data.content || []).map((b) => b.text || "").join("");
}

// App.jsx는 window.claude.complete 를 사용 → 전역 등록
if (typeof window !== "undefined") {
  window.claude = { complete };
}

export { complete };
