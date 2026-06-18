// ③ friendCompare — 친구(같은 학교+학년) 비교 (card: friendCompare)
// MOCK_API_설계.md §5 ③
export default {
  question: "친구들이랑 사용 내역 비교해줘",
  sql:
    "SELECT u.SCH_NM, u.GRADE, AVG(t.amt) avg_amt FROM TB_COM_USER u " +
    "LEFT JOIN (SELECT USER_ID, SUM(PAY_AMT) amt FROM TB_PAY_DTL WHERE PAY_STTS='APPROVED' GROUP BY USER_ID) t " +
    "ON t.USER_ID=u.USER_ID WHERE u.USER_TYPE='STUDENT' GROUP BY u.SCH_NM, u.GRADE;",
  result: {
    me: 115000,
    schoolGradeAvg: 98000,
    provinceAvg: 104000,
    percentile: 62,
    bars: [
      { label: "나", amount: 115000, me: true },
      { label: "우리학교 같은학년", amount: 98000 },
      { label: "충북 평균", amount: 104000 },
    ],
  },
};
