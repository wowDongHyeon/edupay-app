// ④ nudgeCompare — 조르기 내역 비교 (card: nudgeCompare)
// MOCK_API_설계.md §5 ④
export default {
  question: "조르기 내역 친구들이랑 비교해줘",
  sql:
    "SELECT DATE_FORMAT(REQ_DT,'%Y-%m') ym, COUNT(*) cnt, SUM(RECV_AMT) amt " +
    "FROM TB_BEG WHERE STUDENT_USER_ID=:uid GROUP BY ym;",
  result: {
    me: { count: 5, amount: 50000 },
    schoolGradeAvg: { count: 3.2, amount: 32000 },
    provinceAvg: { count: 3.8, amount: 38000 },
    monthly: [
      { month: "2026-04", count: 1 },
      { month: "2026-05", count: 2 },
      { month: "2026-06", count: 2 },
    ],
  },
};
