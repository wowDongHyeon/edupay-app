// ⑧ merchantBreakdown — 어디에 주로(가맹점별 비율) (card: merchantBreakdown)
// MOCK_API_설계.md §5 ⑧
export default {
  question: "어디에 주로 썼는지 알려줘",
  sql:
    "SELECT v.MERCHANT_NM m, SUM(p.PAY_AMT) amt FROM TB_PAY_DTL p " +
    "JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO " +
    "WHERE p.USER_ID=:uid AND p.PAY_STTS='APPROVED' " +
    "GROUP BY v.MERCHANT_NM ORDER BY amt DESC LIMIT 6;",
  result: [
    { merchant: "GS25 청주흥덕점", amount: 48000, pct: 25 },
    { merchant: "분식왕 떡볶이", amount: 36000, pct: 19 },
    { merchant: "교보문고 청주", amount: 28000, pct: 15 },
    { merchant: "CU 가경점", amount: 24000, pct: 12 },
    { merchant: "메가커피 흥덕", amount: 18000, pct: 9 },
    { merchant: "기타", amount: 38000, pct: 20 },
  ],
};
