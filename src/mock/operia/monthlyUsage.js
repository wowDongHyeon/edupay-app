// ① monthlyUsage — 월별 사용내역 (card: report)
// 오페리아 API와 동일한 응답 형태(MOCK_API_설계.md §5 ①)
export default {
  question: "월별 사용 내역 알려줘",
  sql:
    "SELECT DATE_FORMAT(PAY_DT,'%Y-%m') ym, PAY_MEANS, SUM(PAY_AMT) amt " +
    "FROM TB_PAY_DTL WHERE USER_ID=:uid AND PAY_STTS='APPROVED' " +
    "GROUP BY ym, PAY_MEANS ORDER BY ym;",
  result: {
    trend: [
      { month: "2026-04", amount: 43000 },
      { month: "2026-05", amount: 58000 },
      { month: "2026-06", amount: 115000 },
    ],
    byMeans: [
      { means: "VOUCHER", label: "바우처(지원금)", amount: 195000, pct: 90 },
      { means: "APPCARD", label: "부모카드", amount: 22000, pct: 10 },
    ],
  },
};
