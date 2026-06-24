// 세션/유저 모듈 — context.userId 의 단일 출처(seam). DATASOURCE 요청에 실어 보낼 사용자 식별자만 담당.
//
// 폭스에듀 네이티브 앱은 React 웹앱을 flutter_inappwebview WebView 로 띄운다(CLAUDE.md '앱↔웹앱 관계').
// 네이티브가 로그인 세션을 쥐고 있으므로, 웹앱은 네이티브 핸들러 getEduPayUser 로 userId 를 받아온다.
//   네이티브 계약: window.flutter_inappwebview.callHandler("getEduPayUser") → { ok:boolean, userId:string }
//
// 우선순위(폴백 체인):
//   ① 네이티브 브릿지 getEduPayUser → ok 면 userId
//   ② URL ?user_id=        (브라우저 dev — 네이티브 없음)
//   ③ VITE_DEV_USER_ID     (env dev 기본값)
//   ④ null                 (식별자 없음 — 백엔드가 처리)
//
// ※ 지금은 토큰 도입이 아니다(시연: userId 만). 인증/토큰은 추후 §13 에서.
// ※ 1회만 조회하고 캐시 — send 마다 네이티브 브릿지를 두드리지 않는다.

let cached; // Promise<string|null> — 최초 1회 resolve 후 재사용

async function resolveUserId() {
  // ① 네이티브 WebView 브릿지 (Flutter inappwebview)
  try {
    const bridge = typeof window !== "undefined" && window.flutter_inappwebview;
    if (bridge && typeof bridge.callHandler === "function") {
      const res = await bridge.callHandler("getEduPayUser");
      if (res && res.ok && res.userId) return String(res.userId);
      if (import.meta.env.DEV) console.warn("[session] getEduPayUser 응답에 userId 없음 — 폴백", res);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[session] getEduPayUser 브릿지 실패 — 폴백", e);
  }

  // ② URL ?user_id=  (브라우저 dev)
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("user_id");
    if (q) return q;
  }

  // ③ env 폴백
  const envUser = import.meta.env.VITE_DEV_USER_ID;
  if (envUser) return String(envUser);

  // ④ 없음
  return null;
}

/**
 * 현재 사용자 식별자(userId)를 반환. 최초 1회만 실제 조회하고 이후엔 캐시된 Promise 재사용.
 * @returns {Promise<string|null>}
 */
export function getUserId() {
  if (!cached) cached = resolveUserId();
  return cached;
}

export default getUserId;
