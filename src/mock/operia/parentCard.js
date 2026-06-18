// ⑨ parentCard — 부모 카드(앱카드) 사용내역 (card: parentCard)
// MOCK_API_설계.md §5 ⑨
export default {
  question: "부모 카드 사용 내역 알려줘",
  sql:
    "SELECT PAY_DT, v.MERCHANT_NM, p.PAY_AMT FROM TB_PAY_DTL p " +
    "JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO " +
    "WHERE p.USER_ID=:uid AND p.PAY_MEANS='APPCARD' AND p.PAY_STTS='APPROVED' " +
    "ORDER BY PAY_DT DESC;",
  result: {
    total: 22000,
    count: 3,
    rows: [
      { date: "2026-06-10", merchant: "이마트 청주", amount: 12000 },
      { date: "2026-06-03", merchant: "올리브영 흥덕", amount: 7000 },
      { date: "2026-05-28", merchant: "GS25 청주흥덕점", amount: 3000 },
    ],
  },
};
