// ──────────────────────────────────────────────────────────────
// 백엔드 API 클라이언트 (스켈레톤)
// 실제 엔드포인트는 백엔드 개발/연동 확정 후 채웁니다.
// .env 의 VITE_API_BASE 로 베이스 URL 주입.
// ──────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(path, { method = "GET", body, params } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
  return res.status === 204 ? null : res.json();
}

// 질의 10개에 대응하는 API 표면(엔드포인트는 백엔드 합의 후 확정)
export const api = {
  // 1. 월별 사용내역(결제수단별)
  monthlyUsage: (userId, params) => request(`/users/${userId}/usage/monthly`, { params }),
  // 2. 사용처별(업종) 내역
  usageByMerchant: (userId, params) => request(`/users/${userId}/usage/by-merchant`, { params }),
  // 3. 친구(같은 학교·학년) 비교
  compareFriends: (userId, params) => request(`/users/${userId}/compare/friends`, { params }),
  // 4. 조르기 내역 비교
  begCompare: (userId, params) => request(`/users/${userId}/beg/compare`, { params }),
  // 5. 근처 가맹점(좌표 기반)
  nearbyMerchants: (params) => request(`/merchants/nearby`, { params }),
  // 6. 잔액(바우처/조르기)
  balance: (userId) => request(`/users/${userId}/balance`),
  // 7. 온/오프라인 결제내역
  usageByChannel: (userId, params) => request(`/users/${userId}/usage/by-channel`, { params }),
  // 8. 가맹점별 비율
  usageBreakdown: (userId, params) => request(`/users/${userId}/usage/breakdown`, { params }),
  // 9. 부모카드(앱카드) 사용내역
  parentCardUsage: (userId, params) => request(`/users/${userId}/usage/parent-card`, { params }),
  // 10. 학교별 비교
  compareSchools: (params) => request(`/stats/schools`, { params }),

  // AI 챗 (자유 대화) — 키는 서버에만 둠
  chat: (messages) => request(`/chat`, { method: "POST", body: { messages } }),
};

export default api;
