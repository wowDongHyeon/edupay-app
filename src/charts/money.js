// 금액 포매터 — 큰 금액 조건부 축약(모바일 랭킹 카드에서 8자리 금액이 폭을 넘겨 잘리는 문제 방지).
//   순수 함수(테스트: node --test src/charts/money.test.js). JSX를 가진 util.jsx가 이걸 re-export한다.
// 스펙 SSOT: _cli-handoff/금액축약_wonCompact_0728_CLI핸드오프.md
//   < 1천만       → num 그대로 (회귀 0: won/num과 바이트 동일)
//   1천만 ~ <1억  → 만 단위 반올림 "N,NNN만"
//   ≥ 1억         → 억 단위 소수1자리 "N.N억"
//   numCompact = 원 없음(barlist 행이 unit "원"/""을 뒤에 결합) / wonCompact = numCompact + "원"(인사이트 문구).

// num()과 동일한 천단위 콤마(+null·NaN 방어). util.jsx의 num을 import하면 JSX가 딸려와 node 테스트가 깨지므로 동일 로직을 여기 둔다.
const comma = (n) => (n == null || isNaN(Number(n)) ? "" : Number(n).toLocaleString("ko-KR"));

const 만 = 10000, 억 = 100000000, 천만 = 10000000;

// 원 단위 없는 축약 숫자. barlist 행이 뒤에 unit("원"/"")을 붙인다.
export const numCompact = (n) => {
  const v = Number(n);
  if (n == null || isNaN(v)) return comma(n);                        // null/NaN → num과 동일("")
  const a = Math.abs(v);
  if (a < 천만) return comma(n);                                     // 1천만 미만 → num 그대로(바이트 동일)
  const sign = v < 0 ? "-" : "";
  if (a < 억) return sign + comma(Math.round(a / 만)) + "만";        // 만 단위 반올림
  return sign + (Math.round(a / (억 / 10)) / 10).toFixed(1) + "억";  // 억 단위 소수1자리
};

// "원" 포함 축약(인사이트 문구용). 임계값 미만은 won(n)과 바이트 동일.
export const wonCompact = (n) => numCompact(n) + "원";
