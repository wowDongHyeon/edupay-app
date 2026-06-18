// 알려진 10개 intent — 고정 SQL 템플릿 + shaper (MOCK_API_설계.md §8.4)
// 템플릿 SQL은 alasql 호환(DATE_FORMAT 금지, 월=SUBSTR(PAY_DT,1,7))로 루트 queries.sql 로직을
// TB_PAY_DTL 기준으로 옮긴 것. shape(resultSets)가 alasql rows를 §5 result 형태로 조립한다.
// Claude 호출 없음 — 결정적. (sql 칩에는 템플릿 SQL이 노출됨)
const UID = "stu_demo";
const VOUCHER_LIMIT = 100000;

const round = (n) => Math.round(n || 0);
const round1 = (n) => Math.round((n || 0) * 10) / 10;
const avg = (rows, key) => (rows.length ? rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length : 0);
const withPct = (rows) => {
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0) || 1;
  return rows.map((r) => ({ ...r, pct: round((r.amount / total) * 100) }));
};
const MEANS_LABEL = { VOUCHER: "바우처(지원금)", APPCARD: "부모카드", BEG: "조르기" };
const CHANNEL_LABEL = { ONLINE: "온라인", OFFLINE: "오프라인" };

export const QUERIES = {
  // ① report (bar)
  report: {
    sqls: {
      trend: `SELECT SUBSTR(PAY_DT,1,7) AS month, SUM(PAY_AMT) AS amount FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' GROUP BY SUBSTR(PAY_DT,1,7) ORDER BY month`,
      byMeans: `SELECT PAY_MEANS AS means, SUM(PAY_AMT) AS amount FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' GROUP BY PAY_MEANS ORDER BY amount DESC`,
    },
    shape: (r) => ({
      trend: r.trend.map((x) => ({ month: x.month, amount: x.amount })),
      byMeans: withPct(r.byMeans.map((x) => ({ means: x.means, label: MEANS_LABEL[x.means] || x.means, amount: x.amount }))),
    }),
  },

  // ② catSpend (donut) — 업종별
  catSpend: {
    sqls: {
      main: `SELECT v.BIZ_ITEM_NM AS category, SUM(p.PAY_AMT) AS amount, COUNT(*) AS cnt FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' GROUP BY v.BIZ_ITEM_NM ORDER BY amount DESC`,
    },
    shape: (r) => r.main.map((x) => ({ category: x.category, amount: x.amount, cnt: x.cnt })),
  },

  // ③ friendCompare (compare)
  friendCompare: {
    sqls: {
      me: `SELECT SUM(PAY_AMT) AS v FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED'`,
      school: `SELECT p.USER_ID AS uid, SUM(p.PAY_AMT) AS amt FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND u.SCH_NM='흥덕중' AND u.GRADE='2' AND p.PAY_STTS='APPROVED' GROUP BY p.USER_ID`,
      province: `SELECT p.USER_ID AS uid, SUM(p.PAY_AMT) AS amt FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED' GROUP BY p.USER_ID`,
    },
    shape: (r) => {
      const me = (r.me[0] && r.me[0].v) || 0;
      const sAvg = round(avg(r.school, "amt"));
      const pAvg = round(avg(r.province, "amt"));
      const le = r.province.filter((x) => (x.amt || 0) <= me).length;
      const percentile = r.province.length ? round((le / r.province.length) * 100) : 0;
      return {
        me, schoolGradeAvg: sAvg, provinceAvg: pAvg, percentile,
        bars: [
          { label: "나", amount: me, me: true },
          { label: "우리학교 같은학년", amount: sAvg },
          { label: "충북 평균", amount: pAvg },
        ],
      };
    },
  },

  // ④ nudgeCompare (compare)
  nudgeCompare: {
    sqls: {
      me: `SELECT COUNT(*) AS cnt, SUM(RECV_AMT) AS amt FROM TB_BEG WHERE STUDENT_USER_ID='${UID}'`,
      school: `SELECT b.STUDENT_USER_ID AS uid, COUNT(*) AS cnt, SUM(b.RECV_AMT) AS amt FROM TB_BEG b JOIN TB_COM_USER u ON u.USER_ID=b.STUDENT_USER_ID WHERE u.SCH_NM='흥덕중' AND u.GRADE='2' GROUP BY b.STUDENT_USER_ID`,
      province: `SELECT b.STUDENT_USER_ID AS uid, COUNT(*) AS cnt, SUM(b.RECV_AMT) AS amt FROM TB_BEG b GROUP BY b.STUDENT_USER_ID`,
      monthly: `SELECT SUBSTR(REQ_DT,1,7) AS month, COUNT(*) AS cnt FROM TB_BEG WHERE STUDENT_USER_ID='${UID}' GROUP BY SUBSTR(REQ_DT,1,7) ORDER BY month`,
    },
    shape: (r) => ({
      me: { count: (r.me[0] && r.me[0].cnt) || 0, amount: (r.me[0] && r.me[0].amt) || 0 },
      schoolGradeAvg: { count: round1(avg(r.school, "cnt")), amount: round(avg(r.school, "amt")) },
      provinceAvg: { count: round1(avg(r.province, "cnt")), amount: round(avg(r.province, "amt")) },
      monthly: r.monthly.map((x) => ({ month: x.month, count: x.cnt })),
    }),
  },

  // ⑤ merchantMap (map)
  merchantMap: {
    sqls: {
      main: `SELECT MERCHANT_NM AS name, BIZ_ITEM_NM AS category, ADDR AS addr, LAT AS lat, LNG AS lng FROM TB_COM_VOUCHER WHERE USE_YN='Y' AND VOUCHER_STTS_NM='정상'`,
    },
    shape: (r) => ({ center: { lat: 36.6372, lng: 127.486 }, merchants: r.main }),
  },

  // ⑥ balance (gauge)
  balance: {
    sqls: {
      voucherUsed: `SELECT SUM(PAY_AMT) AS used FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_MEANS='VOUCHER' AND PAY_STTS='APPROVED'`,
      begRecv: `SELECT SUM(RECV_AMT) AS received FROM TB_BEG WHERE STUDENT_USER_ID='${UID}' AND REQ_STTS='ACCEPT'`,
      begUsed: `SELECT SUM(PAY_AMT) AS used FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_MEANS='BEG' AND PAY_STTS='APPROVED'`,
    },
    shape: (r) => {
      const vUsed = (r.voucherUsed[0] && r.voucherUsed[0].used) || 0;
      const recv = (r.begRecv[0] && r.begRecv[0].received) || 0;
      const bUsed = (r.begUsed[0] && r.begUsed[0].used) || 0;
      const vBal = VOUCHER_LIMIT - vUsed, bBal = recv - bUsed;
      return {
        voucher: { limit: VOUCHER_LIMIT, used: vUsed, balance: vBal },
        beg: { received: recv, used: bUsed, balance: bBal },
        appcard: { note: "부모카드는 카드사 한도(외부)" },
        totalAvailable: vBal + bBal,
      };
    },
  },

  // ⑦ channel (donut)
  channel: {
    sqls: {
      main: `SELECT PAY_CHANNEL AS channel, SUM(PAY_AMT) AS amount, COUNT(*) AS cnt FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' GROUP BY PAY_CHANNEL ORDER BY amount DESC`,
    },
    shape: (r) => withPct(r.main.map((x) => ({ channel: x.channel, label: CHANNEL_LABEL[x.channel] || x.channel, amount: x.amount, cnt: x.cnt }))),
  },

  // ⑧ merchantBreakdown (barlist)
  merchantBreakdown: {
    sqls: {
      main: `SELECT v.MERCHANT_NM AS merchant, SUM(p.PAY_AMT) AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' GROUP BY v.MERCHANT_NM ORDER BY amount DESC LIMIT 6`,
    },
    shape: (r) => withPct(r.main.map((x) => ({ merchant: x.merchant, amount: x.amount }))),
  },

  // ⑨ parentCard (list)
  parentCard: {
    sqls: {
      main: `SELECT SUBSTR(p.PAY_DT,1,10) AS date, v.MERCHANT_NM AS merchant, p.PAY_AMT AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_MEANS='APPCARD' AND p.PAY_STTS='APPROVED' ORDER BY p.PAY_DT DESC`,
    },
    shape: (r) => ({
      total: r.main.reduce((s, x) => s + (x.amount || 0), 0),
      count: r.main.length,
      rows: r.main.map((x) => ({ date: x.date, merchant: x.merchant, amount: x.amount })),
    }),
  },

  // ⑩ schoolCompare (compare)
  schoolCompare: {
    sqls: {
      main: `SELECT u.SCH_NM AS school, SUM(p.PAY_AMT) AS tot, COUNT(DISTINCT u.USER_ID) AS students FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED' GROUP BY u.SCH_NM`,
    },
    shape: (r) => r.main
      .map((x) => ({
        school: x.school === "흥덕중" ? "흥덕중(우리학교)" : x.school,
        avgPerStudent: round((x.tot || 0) / (x.students || 1)),
        students: x.students,
        me: x.school === "흥덕중",
      }))
      .sort((a, b) => b.avgPerStudent - a.avgPerStudent),
  },
};

export default QUERIES;
