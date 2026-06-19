// 알려진 10개 intent — 고정 SQL 템플릿 + shaper (MOCK_API_설계.md §8.4)
// ★ 실 오페리아 계약 = 한 요청 = SQL 1문장 = 결과셋 1개(rows). → intent당 sql은 '정확히 1문장'.
//   여러 SELECT를 ';'로 나열하지 않는다. 한 문장 안의 UNION ALL은 허용(여전히 결과셋 1개).
//   shape(rows)가 그 단일 rows에서 §5 카드 형태를 파생한다. alasql 호환(DATE_FORMAT 금지, 월=SUBSTR(PAY_DT,1,7)).
const UID = "stu_demo";
const VOUCHER_LIMIT = 100000;

const round = (n) => Math.round(n || 0);
const round1 = (n) => Math.round((n || 0) * 10) / 10;
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + (x || 0), 0) / arr.length : 0);
const withPct = (rows) => {
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0) || 1;
  return rows.map((r) => ({ ...r, pct: round((r.amount / total) * 100) }));
};
// 단일 rows를 keyField로 그룹 합산 → [{[keyField], amount}] (report의 월별·수단별 파생용)
const sumBy = (rows, keyField, valField = "amount") => {
  const m = new Map();
  for (const r of rows) m.set(r[keyField], (m.get(r[keyField]) || 0) + (r[valField] || 0));
  return [...m.entries()].map(([k, amount]) => ({ [keyField]: k, amount }));
};
const MEANS_LABEL = { VOUCHER: "바우처(지원금)", APPCARD: "부모카드", BEG: "조르기" };
const CHANNEL_LABEL = { ONLINE: "온라인", OFFLINE: "오프라인" };

export const QUERIES = {
  // ① report (bar) — 월×수단 한 쿼리. shape가 trend(월별합)·byMeans(수단별합+비율) 파생
  report: {
    sql: `SELECT SUBSTR(PAY_DT,1,7) AS month, PAY_MEANS AS means, SUM(PAY_AMT) AS amount FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' GROUP BY SUBSTR(PAY_DT,1,7), PAY_MEANS ORDER BY month`,
    shape: (rows) => ({
      trend: sumBy(rows, "month").sort((a, b) => (a.month < b.month ? -1 : 1)),
      byMeans: withPct(
        sumBy(rows, "means")
          .sort((a, b) => b.amount - a.amount)
          .map((x) => ({ means: x.means, label: MEANS_LABEL[x.means] || x.means, amount: x.amount }))
      ),
    }),
  },

  // ①-b reportDaily (bar) — 일별 사용 내역(최근 활동 7일). report 카드의 '일별' 탭이 lazy로 쓰는 내부 intent.
  //   ※ 시뮬 라우팅/템플릿·폴백용. 본 신호는 NL 텍스트("최근 7일 사용 내역을 일별로")이며 실 백엔드는 텍스트만 받는다.
  //   달력 기준이 아니라 '활동이 있는 최근 7일'(ORDER BY day DESC LIMIT 7). 0원 날은 채우지 않는다(픽스처 날짜 미고정).
  reportDaily: {
    sql: `SELECT day, amount FROM (SELECT SUBSTR(PAY_DT,1,10) AS day, SUM(PAY_AMT) AS amount FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' GROUP BY SUBSTR(PAY_DT,1,10) ORDER BY day DESC LIMIT 7) t ORDER BY day`,
    shape: (rows) => ({ trend: rows.map((x) => ({ day: x.day, amount: x.amount })) }),
  },

  // ② catSpend (donut) — 업종별 (이미 단일 GROUP BY)
  catSpend: {
    sql: `SELECT v.BIZ_ITEM_NM AS category, SUM(p.PAY_AMT) AS amount, COUNT(*) AS cnt FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' GROUP BY v.BIZ_ITEM_NM ORDER BY amount DESC`,
    shape: (rows) => rows.map((x) => ({ category: x.category, amount: x.amount, cnt: x.cnt })),
  },

  // ③ friendCompare (compare) — me + 학교/충북 '학생별 합' 행을 UNION ALL 한 문장.
  //    shape가 학생별 합 분포에서 평균·백분위를 계산(스칼라 상관 서브쿼리는 alasql 미지원이라 분포를 그대로 받음).
  friendCompare: {
    sql: `SELECT 'me' AS k, SUM(PAY_AMT) AS v FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' ` +
      `UNION ALL SELECT 'school' AS k, s AS v FROM (SELECT SUM(p.PAY_AMT) AS s FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND u.SCH_NM='흥덕중' AND u.GRADE='2' AND p.PAY_STTS='APPROVED' GROUP BY p.USER_ID) sc ` +
      `UNION ALL SELECT 'province' AS k, s AS v FROM (SELECT SUM(p.PAY_AMT) AS s FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED' GROUP BY p.USER_ID) pv`,
    shape: (rows) => {
      const me = (rows.find((r) => r.k === "me") || {}).v || 0;
      const school = rows.filter((r) => r.k === "school").map((r) => r.v || 0);
      const province = rows.filter((r) => r.k === "province").map((r) => r.v || 0);
      const sAvg = round(mean(school));
      const pAvg = round(mean(province));
      const le = province.filter((x) => x <= me).length;
      const percentile = province.length ? round((le / province.length) * 100) : 0;
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

  // ④ nudgeCompare (nudgeTrend) — 내 조르기 '월별 추이' 1쿼리. shape가 이번 달 vs 지난달 + 월별 리스트 파생.
  //   (또래/학교 비교는 제거 — 자기 추이 중심.)
  nudgeCompare: {
    sql: `SELECT SUBSTR(REQ_DT,1,7) AS month, COUNT(*) AS cnt, SUM(RECV_AMT) AS amount FROM TB_BEG WHERE STUDENT_USER_ID='${UID}' AND REQ_STTS='ACCEPT' GROUP BY SUBSTR(REQ_DT,1,7) ORDER BY month`,
    shape: (rows) => {
      const monthly = rows.map((r) => ({ month: r.month, cnt: r.cnt || 0, amount: r.amount || 0 }));
      const n = monthly.length;
      const thisMonth = n ? { cnt: monthly[n - 1].cnt, amount: monthly[n - 1].amount } : { cnt: 0, amount: 0 };
      const lastMonth = n > 1 ? { cnt: monthly[n - 2].cnt, amount: monthly[n - 2].amount } : { cnt: 0, amount: 0 };
      return { thisMonth, lastMonth, diffCnt: thisMonth.cnt - lastMonth.cnt, monthly };
    },
  },

  // ⑤ merchantMap (map) — 단일 SELECT
  merchantMap: {
    sql: `SELECT MERCHANT_NM AS name, BIZ_ITEM_NM AS category, ADDR AS addr, LAT AS lat, LNG AS lng FROM TB_COM_VOUCHER WHERE USE_YN='Y' AND VOUCHER_STTS_NM='정상'`,
    shape: (rows) => ({ center: { lat: 36.6372, lng: 127.486 }, merchants: rows }),
  },

  // ⑥ balance (balanceList) — UNION ALL 한 문장. 합계 없이 항목별 '남은 금액'만(§5 ⑥).
  //   voucher_used / charge_recv(보호자 충전 수령) / charge_used(충전금 사용=BEG 결제) / points(에듀포인트)
  balance: {
    sql: `SELECT 'voucher_used' AS k, SUM(PAY_AMT) AS v FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_MEANS='VOUCHER' AND PAY_STTS='APPROVED' ` +
      `UNION ALL SELECT 'charge_recv' AS k, SUM(RECV_AMT) AS v FROM TB_BEG WHERE STUDENT_USER_ID='${UID}' AND REQ_STTS='ACCEPT' ` +
      `UNION ALL SELECT 'charge_used' AS k, SUM(PAY_AMT) AS v FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_MEANS='BEG' AND PAY_STTS='APPROVED' ` +
      `UNION ALL SELECT 'points' AS k, POINT_BAL AS v FROM TB_COM_USER WHERE USER_ID='${UID}'`,
    shape: (rows) => {
      const by = Object.fromEntries(rows.map((r) => [r.k, r.v || 0]));
      const pos = (n) => (n > 0 ? n : 0); // 음수 방지(방어)
      const vUsed = by.voucher_used || 0, recv = by.charge_recv || 0, cUsed = by.charge_used || 0, pts = by.points || 0;
      return {
        voucher: { label: "바우처(지원금)", sub: "학생 복지 지원금", limit: VOUCHER_LIMIT, used: vUsed, balance: pos(VOUCHER_LIMIT - vUsed) },
        charge: { label: "용돈 충전금", sub: "보호자가 충전한 용돈", received: recv, used: cUsed, balance: pos(recv - cUsed) },
        points: { label: "에듀포인트", sub: "질문·퀴즈로 모은 포인트", balance: pos(pts), unit: "P" },
      };
    },
  },

  // ⑦ channel (channel 카드) — 거래 행 1쿼리. shape가 오프라인/온라인 요약(합·건수·%)과 거래 리스트를 파생.
  channel: {
    sql: `SELECT p.PAY_CHANNEL AS channel, v.MERCHANT_NM AS item, v.BIZ_ITEM_NM AS cat, p.PAY_AMT AS amount, p.PAY_DT AS dt FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' ORDER BY p.PAY_DT DESC`,
    shape: (rows) => {
      const total = rows.reduce((s, r) => s + (r.amount || 0), 0) || 1;
      const agg = (ch) => {
        const rs = rows.filter((r) => r.channel === ch);
        const amount = rs.reduce((s, r) => s + (r.amount || 0), 0);
        return { amount, count: rs.length, pct: round((amount / total) * 100) };
      };
      return {
        offline: agg("OFFLINE"),
        online: agg("ONLINE"),
        rows: rows.map((r) => ({ channel: r.channel, item: r.item, cat: r.cat, amount: r.amount, dt: r.dt })),
      };
    },
  },

  // ⑧ merchantBreakdown (barlist) — 단일 GROUP BY
  merchantBreakdown: {
    sql: `SELECT v.MERCHANT_NM AS merchant, SUM(p.PAY_AMT) AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' GROUP BY v.MERCHANT_NM ORDER BY amount DESC LIMIT 6`,
    shape: (rows) => withPct(rows.map((x) => ({ merchant: x.merchant, amount: x.amount }))),
  },

  // ⑨ parentCard (list) — 단일 SELECT
  parentCard: {
    sql: `SELECT SUBSTR(p.PAY_DT,1,10) AS date, v.MERCHANT_NM AS merchant, p.PAY_AMT AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_MEANS='APPCARD' AND p.PAY_STTS='APPROVED' ORDER BY p.PAY_DT DESC`,
    shape: (rows) => ({
      total: rows.reduce((s, x) => s + (x.amount || 0), 0),
      count: rows.length,
      rows: rows.map((x) => ({ date: x.date, merchant: x.merchant, amount: x.amount })),
    }),
  },

  // ⑩ schoolCompare (schoolRank) — 충북 중학교 1인당 평균 랭킹. 단일 GROUP BY → shaper가 TOP5·우리학교 등수·충북평균 파생.
  schoolCompare: {
    sql: `SELECT u.SCH_NM AS school, SUM(p.PAY_AMT) AS tot, COUNT(DISTINCT u.USER_ID) AS students FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED' GROUP BY u.SCH_NM`,
    shape: (rows) => {
      const MY = "흥덕중"; // stu_demo의 SCH_NM(우리학교)
      const ranked = rows
        .map((x) => ({ school: x.school, avgPerStudent: round((x.tot || 0) / (x.students || 1)), students: x.students, me: x.school === MY }))
        .sort((a, b) => b.avgPerStudent - a.avgPerStudent);
      ranked.forEach((e, i) => (e.rank = i + 1));
      const totSum = rows.reduce((s, x) => s + (x.tot || 0), 0);
      const totStu = rows.reduce((s, x) => s + (x.students || 0), 0) || 1;
      const provinceAvg = round(totSum / totStu);
      const mine = ranked.find((e) => e.me);
      return {
        ranking: ranked.slice(0, 5).map((e) => ({ rank: e.rank, school: e.school, avgPerStudent: e.avgPerStudent, me: e.me })),
        myRank: mine ? mine.rank : null,
        myAvg: mine ? mine.avgPerStudent : 0,
        provinceAvg,
        schoolCount: ranked.length,
      };
    },
  },
};

export default QUERIES;
