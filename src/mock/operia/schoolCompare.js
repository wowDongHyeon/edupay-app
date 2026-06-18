// ⑩ schoolCompare — 학교별 사용내역 비교 (card: schoolCompare)
// MOCK_API_설계.md §5 ⑩
export default {
  question: "학교별 사용 내역 비교해줘",
  sql:
    "SELECT u.SCH_NM, SUM(p.PAY_AMT)/COUNT(DISTINCT u.USER_ID) avg_per_student " +
    "FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID " +
    "WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED' " +
    "GROUP BY u.SCH_NM ORDER BY avg_per_student DESC;",
  result: [
    { school: "청주중", avgPerStudent: 121000, students: 140 },
    { school: "흥덕중(우리학교)", avgPerStudent: 115000, students: 120, me: true },
    { school: "가경중", avgPerStudent: 104000, students: 133 },
    { school: "복대중", avgPerStudent: 92000, students: 98 },
  ],
};
