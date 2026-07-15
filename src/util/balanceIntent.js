/* balance(잔액/포인트) 분류 — 순수 함수(골든 테스트 대상).
 * 고빈도 잔액/포인트 질의를 operia 비결정 폴백 대신 '결정적 balance'로 승격한다.
 * ★ 반드시 자산 토큰이 있을 때만 매칭 — 바레 "얼마"·"얼마 썼/쓴/소비"는 balance 아님(소비 질의 오탈취 방지).
 * 입력 t = 공백 제거된 질의(cardIntent 와 동일 정규화). 반환 { focus } | null.
 *   focus: "voucher"(바우처/지원금) | "charge"(충전금/용돈충전) | "point"(에듀포인트/포인트) | null(일반=3항목).
 */
export function balanceIntent(t) {
  const s = String(t || "");
  const asset = /(바우처|지원금|충전금|용돈충전|에듀포인트|포인트|잔액)/.test(s);
  const spendV = /(썼|쓴|소비|지출|샀|구매|구입|결제)/.test(s);
  const listReq = /(내역|리스트|목록|건별)/.test(s); // 거래 리스트/표 요청 → balance 아님(단일-KPI 오탈취 방지)
  const askV = /(얼마|얼마나|얼만큼|알려|보여|뭐야|궁금|확인|남았|남은)/.test(s); // 잔액을 묻는 표현(얼마 외 알려/보여 등 포함)
  const hit =
    (asset && askV && !spendV && !listReq) ||                                          // "에듀포인트 얼마야", "용돈 충전금 알려줘", "충전금 남았어?"
    /((사용가능|쓸수있|사용할수있|남은|남아있).{0,4}(돈|금액|지원금|바우처|포인트))|잔액|쓸돈/.test(s) || // "쓸 수 있는 돈", "잔액"
    (/얼마/.test(s) && /(남|있|쓸)/.test(s) && !spendV);                                 // 일반 잔액 "얼마 있어/남았어"(소비 썼/쓴 제외)
  if (!hit) return null;
  const focus = /(바우처|지원금)/.test(s) ? "voucher"
    : /(충전금|용돈충전)/.test(s) ? "charge"
    : /(에듀포인트|포인트)/.test(s) ? "point" : null;
  return { focus };
}
export default balanceIntent;
