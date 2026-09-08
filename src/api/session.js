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

let bridgeCached; // Promise<object|null> — getEduPayUser 응답 1회 캐시(null=브릿지 없음/실패)
let userCached;   // Promise<string|null>

// 네이티브 브릿지(getEduPayUser)를 1회만 호출해 전체 응답을 캐시. userId·location 둘 다 여기서 읽는다.
async function callBridge() {
  try {
    const bridge = typeof window !== "undefined" && window.flutter_inappwebview;
    if (bridge && typeof bridge.callHandler === "function") {
      return (await bridge.callHandler("getEduPayUser")) || null;
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[session] getEduPayUser 브릿지 실패 — 폴백", e);
  }
  return null; // 브릿지 없음(브라우저 dev)
}
function getBridge() {
  if (!bridgeCached) bridgeCached = callBridge();
  return bridgeCached;
}

async function resolveUserId() {
  const res = await getBridge(); // ① 네이티브 브릿지
  if (res && res.ok && res.userId) return String(res.userId);
  if (res && import.meta.env.DEV) console.warn("[session] getEduPayUser 응답에 userId 없음 — 폴백", res);
  // ② URL ?user_id= (브라우저 dev)
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("user_id");
    if (q) return q;
  }
  // ③ env 폴백
  const envUser = import.meta.env.VITE_DEV_USER_ID;
  if (envUser) return String(envUser);
  return null; // ④ 없음
}

/**
 * 현재 사용자 식별자(userId)를 반환. 최초 1회만 실제 조회하고 이후엔 캐시된 Promise 재사용.
 * @returns {Promise<string|null>}
 */
export function getUserId() {
  if (!userCached) userCached = resolveUserId();
  return userCached;
}

let nameCached; // Promise<string|null> — 표시이름 1회 캐시

// [피그마 리스킨 · 요청사항] 인사말에 쓸 '표시이름'.
//   피그마 주석: "현재 Id 값을 띄우는데 유저의 이름을 띄워야 합니다 (ex. 홍길동님, 반가워요).
//                param 에 userName 을 추가하는 것이 가능할까요?"
//   → 네이티브(Flutter)가 getEduPayUser 응답에 userName(또는 name)을 실어주면 그 값을 쓴다.
//     아직 안 실어주므로 현재는 ④ userId 로 폴백 → 기존 동작과 100% 동일(회귀 없음).
//     앱팀이 필드를 추가하는 순간 웹 수정 없이 이름이 뜬다.
//   폴백: ① 브릿지 userName|name → ② URL ?user_name= (dev) → ③ VITE_DEV_USER_NAME → ④ userId → ⑤ null
async function resolveUserName() {
  const res = await getBridge();
  if (res && res.ok) {
    const n = res.userName || res.name;
    if (n) return String(n);
  }
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("user_name");
    if (q) return q;
  }
  const envName = import.meta.env.VITE_DEV_USER_NAME;
  if (envName) return String(envName);
  return await getUserId(); // 이름 없으면 기존처럼 ID 표시
}

/**
 * 인사말용 표시이름. 네이티브가 userName 을 주면 이름, 없으면 userId 로 폴백.
 * @returns {Promise<string|null>}
 */
export function getUserName() {
  if (!nameCached) nameCached = resolveUserName();
  return nameCached;
}

/**
 * 사용자 실제 위치. 브릿지(getEduPayUser)의 lat/lng 우선(웹뷰 GPS 권한 우회).
 *  - 유효: { status:"ok", lat, lng }
 *  - 권한 없음/거부(브릿지 응답은 왔으나 위치 무효): { status:"denied", locStatus }
 *  - 브릿지 없음(브라우저 dev): URL ?lat&lng 있으면 ok, 없으면 { status:"none" } → 호출부가 브라우저 GPS/대전 폴백
 * @returns {Promise<{status:"ok"|"denied"|"none", lat?:number, lng?:number, locStatus?:string}>}
 */
export async function getUserLocation() {
  const res = await getBridge();
  if (res) { // 브릿지 응답 있음(실기기)
    const { ok, locationOk, locStatus, lat, lng } = res;
    if (ok === true && locationOk === true && locStatus === "ok" && Number.isFinite(lat) && Number.isFinite(lng)) {
      return { status: "ok", lat, lng };
    }
    return { status: "denied", locStatus }; // 권한 거부/미허용 → 안내 표시 대상
  }
  // 브릿지 없음(dev): URL ?lat&lng 로 실위치 주입 지원
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search);
    const latS = q.get("lat"), lngS = q.get("lng");
    const lat = Number(latS), lng = Number(lngS);
    if (latS && lngS && Number.isFinite(lat) && Number.isFinite(lng)) return { status: "ok", lat, lng };
  }
  return { status: "none" };
}

export default getUserId;
