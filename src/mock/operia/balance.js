// ⑥ balance — 현재 사용 가능 금액(잔액) (card: balance)
// MOCK_API_설계.md §5 ⑥
export default {
  question: "현재 사용할 수 있는 금액 알려줘",
  sql:
    "SELECT PAY_MEANS, SUM(PAY_AMT) used FROM TB_PAY_DTL " +
    "WHERE USER_ID=:uid AND PAY_STTS='APPROVED' GROUP BY PAY_MEANS;",
  result: {
    voucher: { limit: 100000, used: 78000, balance: 22000 },
    beg: { received: 50000, used: 30000, balance: 20000 },
    appcard: { note: "부모카드는 카드사 한도(외부)" },
    totalAvailable: 42000,
  },
};
