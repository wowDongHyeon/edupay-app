// ② catSpend — 사용처별(편의점 등 업종) (card: catSpend)
// MOCK_API_설계.md §5 ②
export default {
  question: "편의점에서 쓴 내역 알려줘",
  sql:
    "SELECT v.BIZ_ITEM_NM cat, SUM(p.PAY_AMT) amt, COUNT(*) cnt " +
    "FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO " +
    "WHERE p.USER_ID=:uid AND p.PAY_STTS='APPROVED' " +
    "GROUP BY v.BIZ_ITEM_NM ORDER BY amt DESC;",
  result: [
    { category: "편의점", amount: 62000, cnt: 14 },
    { category: "식비", amount: 38000, cnt: 9 },
    { category: "학용품", amount: 12000, cnt: 3 },
    { category: "교통", amount: 9000, cnt: 6 },
    { category: "문화", amount: 8000, cnt: 2 },
  ],
};
