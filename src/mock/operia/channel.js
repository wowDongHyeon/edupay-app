// ⑦ channel — 온/오프라인 결제내역 (card: channel)
// MOCK_API_설계.md §5 ⑦
export default {
  question: "온라인 오프라인 결제 내역 알려줘",
  sql:
    "SELECT PAY_CHANNEL, SUM(PAY_AMT) amt, COUNT(*) cnt FROM TB_PAY_DTL " +
    "WHERE USER_ID=:uid AND PAY_STTS='APPROVED' GROUP BY PAY_CHANNEL;",
  result: [
    { channel: "OFFLINE", label: "오프라인", amount: 150000, cnt: 28, pct: 78 },
    { channel: "ONLINE", label: "온라인", amount: 43000, cnt: 7, pct: 22 },
  ],
};
