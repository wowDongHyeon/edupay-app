// 알려진 10개 intent — 고정 SQL 템플릿 + shaper (MOCK_API_설계.md §8.4 / TEMPLATE_설계.md §4)
// ★ 실 오페리아 계약 = 한 요청 = SQL 1문장 = 결과셋 1개(rows). intent당 sql은 '정확히 1문장'(UNION ALL 허용).
//   shape(rows)는 그 단일 rows를 '템플릿 표준 데이터'(§2)로 정규화한다(표현/필드는 charts/intentConfig·templates 담당).
const UID = "stu_demo";
const VOUCHER_LIMIT = 100000;

const round = (n) => Math.round(n || 0);
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + (x || 0), 0) / arr.length : 0);
const withPct = (rows) => {
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0) || 1;
  return rows.map((r) => ({ ...r, pct: round((r.amount / total) * 100) }));
};
// 단일 rows를 keyField로 그룹 합산 → [{[keyField], amount}]
const sumBy = (rows, keyField, valField = "amount") => {
  const m = new Map();
  for (const r of rows) m.set(r[keyField], (m.get(r[keyField]) || 0) + (r[valField] || 0));
  return [...m.entries()].map(([k, amount]) => ({ [keyField]: k, amount }));
};
// 라벨 포매터(데이터 레이어 자급 — charts에 의존하지 않음)
const mLabel = (ym) => { const mm = +String(ym || "").slice(5, 7); return mm ? mm + "월" : String(ym || ""); };
const dLabel = (ymd) => { const s = String(ymd || ""); const mm = +s.slice(5, 7), dd = +s.slice(8, 10); return mm && dd ? `${mm}/${dd}` : s; };
const pad2 = (n) => String(n).padStart(2, "0");
const ymdOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
// '오늘'(실제 현재일). 미래 날짜 결제는 어떤 차트에도 안 나오게 SQL에서 컷오프(목업 데이터에 미래 결제가 섞여 있어도 방지).
const TODAY = ymdOf(new Date());
const NOT_FUTURE = `AND PAY_DT <= '${TODAY} 23:59:59'`;
// 일별 결제합 rows([{day,amount}])를 '오늘로 끝나는 연속 7일' series로. 결제 없는 날은 value 0, 미래 날짜는 안 나옴.
// 앵커='오늘'(실제 현재일). 고정 데모일이 필요하면 ymdOf(new Date()) 대신 상수("2026-06-22")로 교체.
const last7Days = (rows) => {
  const byDay = new Map(rows.map((r) => [String(r.day), r.amount || 0]));
  const anchor = new Date(ymdOf(new Date()) + "T00:00:00");
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const ymd = ymdOf(d);
    out.push({ label: dLabel(ymd), value: byDay.get(ymd) || 0 });
  }
  return out;
};
const MEANS_LABEL = { VOUCHER: "바우처(지원금)", APPCARD: "부모카드", BEG: "조르기" };

export const QUERIES = {
  // ① report → bar 표준형 { series:[{label,value}], breakdown:[{label,value,pct,key}] }
  report: {
    sql: `SELECT SUBSTR(PAY_DT,1,7) AS month, PAY_MEANS AS means, SUM(PAY_AMT) AS amount FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' ${NOT_FUTURE} GROUP BY SUBSTR(PAY_DT,1,7), PAY_MEANS ORDER BY month`,
    shape: (rows) => ({
      series: sumBy(rows, "month").sort((a, b) => (a.month < b.month ? -1 : 1)).map((x) => ({ label: mLabel(x.month), value: x.amount })),
      breakdown: withPct(sumBy(rows, "means").sort((a, b) => b.amount - a.amount))
        .map((x) => ({ label: MEANS_LABEL[x.means] || x.means, value: x.amount, pct: x.pct, key: x.means })),
    }),
  },

  // ①-b reportDaily → bar 표준형 { series } (일별, breakdown 없음). report 카드 '일별' 탭 lazy 내부 intent.
  // ★'달력 기준 연속 최근 7일' = 가장 최근 결제일('오늘')로 끝나는 7일(오늘 포함). 결제 없는 날은 0원으로 채움(띄엄띄엄 방지).
  reportDaily: {
    sql: `SELECT SUBSTR(PAY_DT,1,10) AS day, SUM(PAY_AMT) AS amount FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' ${NOT_FUTURE} GROUP BY SUBSTR(PAY_DT,1,10) ORDER BY day`,
    shape: (rows) => ({ series: last7Days(rows) }),
  },

  // ② catSpend → donut 표준형 { slices:[{label,value,pct,cnt}], total }
  catSpend: {
    sql: `SELECT v.BIZ_ITEM_NM AS category, SUM(p.PAY_AMT) AS amount, COUNT(*) AS cnt FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' GROUP BY v.BIZ_ITEM_NM ORDER BY amount DESC`,
    shape: (rows) => {
      const total = rows.reduce((s, x) => s + (x.amount || 0), 0) || 1;
      return { total, slices: rows.map((x) => ({ label: x.category, value: x.amount, cnt: x.cnt, pct: round((x.amount / total) * 100) })) };
    },
  },

  // ③ friendCompare → compare 표준형 { bars:[{label,value,me?}], percentile }
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
        percentile,
        bars: [
          { label: "나", value: me, me: true },
          { label: "우리학교 같은학년", value: sAvg },
          { label: "충북 평균", value: pAvg },
        ],
      };
    },
  },

  // ④ nudgeCompare → trend 표준형 { current:{count,value}, prev:{value}, delta, monthly:[{label,count,value}] }
  nudgeCompare: {
    sql: `SELECT SUBSTR(REQ_DT,1,7) AS month, COUNT(*) AS cnt, SUM(RECV_AMT) AS amount FROM TB_BEG WHERE STUDENT_USER_ID='${UID}' AND REQ_STTS='ACCEPT' GROUP BY SUBSTR(REQ_DT,1,7) ORDER BY month`,
    shape: (rows) => {
      const monthly = rows.map((r) => ({ label: mLabel(r.month), count: r.cnt || 0, value: r.amount || 0 }));
      const n = monthly.length;
      const cur = n ? monthly[n - 1] : { count: 0, value: 0 };
      const prv = n > 1 ? monthly[n - 2] : { count: 0, value: 0 };
      return { current: { count: cur.count, value: cur.value }, prev: { value: prv.value }, delta: cur.count - prv.count, monthly };
    },
  },

  // ⑤ merchantMap → map 표준형 { center, items:[{name,category,addr,lat,lng}] }
  merchantMap: {
    sql: `SELECT MERCHANT_NM AS name, BIZ_ITEM_NM AS category, ADDR AS addr, LAT AS lat, LNG AS lng FROM TB_COM_VOUCHER WHERE USE_YN='Y' AND VOUCHER_STTS_NM='정상'`,
    shape: (rows) => ({ center: { lat: 36.6372, lng: 127.486 }, items: rows }),
  },

  // ⑥ balance → statList 표준형 { items:[{label,sub,value,unit}] } (합계 없음; 음수 방어)
  balance: {
    sql: `SELECT 'voucher_used' AS k, SUM(PAY_AMT) AS v FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_MEANS='VOUCHER' AND PAY_STTS='APPROVED' ` +
      `UNION ALL SELECT 'charge_recv' AS k, SUM(RECV_AMT) AS v FROM TB_BEG WHERE STUDENT_USER_ID='${UID}' AND REQ_STTS='ACCEPT' ` +
      `UNION ALL SELECT 'charge_used' AS k, SUM(PAY_AMT) AS v FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_MEANS='BEG' AND PAY_STTS='APPROVED' ` +
      `UNION ALL SELECT 'points' AS k, POINT_BAL AS v FROM TB_COM_USER WHERE USER_ID='${UID}'`,
    shape: (rows) => {
      const by = Object.fromEntries(rows.map((r) => [r.k, r.v || 0]));
      const pos = (n) => (n > 0 ? n : 0);
      const vUsed = by.voucher_used || 0, recv = by.charge_recv || 0, cUsed = by.charge_used || 0, pts = by.points || 0;
      return {
        items: [
          { label: "바우처(지원금)", sub: "학생 복지 지원금", value: pos(VOUCHER_LIMIT - vUsed), unit: "원" },
          { label: "용돈 충전금", sub: "보호자가 충전한 용돈", value: pos(recv - cUsed), unit: "원" },
          { label: "에듀포인트", sub: "질문·퀴즈로 모은 포인트", value: pos(pts), unit: "P" },
        ],
      };
    },
  },

  // ⑦ channel → txList 표준형 { groups:[{key,label,amount,count,pct}], rows:[{group,item,amount,date}] }
  channel: {
    sql: `SELECT p.PAY_CHANNEL AS channel, v.MERCHANT_NM AS item, v.BIZ_ITEM_NM AS cat, p.PAY_AMT AS amount, p.PAY_DT AS dt FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' ORDER BY p.PAY_DT DESC`,
    shape: (rows) => {
      const total = rows.reduce((s, r) => s + (r.amount || 0), 0) || 1;
      const group = (ch, label) => {
        const rs = rows.filter((r) => r.channel === ch);
        const amount = rs.reduce((s, r) => s + (r.amount || 0), 0);
        return { key: ch, label, amount, count: rs.length, pct: round((amount / total) * 100) };
      };
      return {
        groups: [group("OFFLINE", "오프라인"), group("ONLINE", "온라인")],
        rows: rows.map((r) => ({ group: r.channel, item: r.item, amount: r.amount, date: r.dt })),
      };
    },
  },

  // ⑧ merchantBreakdown → barlist 표준형 { items:[{label,value,pct}] }
  merchantBreakdown: {
    sql: `SELECT v.MERCHANT_NM AS merchant, SUM(p.PAY_AMT) AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' GROUP BY v.MERCHANT_NM ORDER BY amount DESC LIMIT 6`,
    shape: (rows) => ({ items: withPct(rows.map((x) => ({ merchant: x.merchant, amount: x.amount }))).map((x) => ({ label: x.merchant, value: x.amount, pct: x.pct })) }),
  },

  // ⑨ parentCard → list 표준형 { rows:[{date,merchant,amount}], total, count }
  parentCard: {
    sql: `SELECT SUBSTR(p.PAY_DT,1,10) AS date, v.MERCHANT_NM AS merchant, p.PAY_AMT AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_MEANS='APPCARD' AND p.PAY_STTS='APPROVED' ORDER BY p.PAY_DT DESC`,
    shape: (rows) => ({
      total: rows.reduce((s, x) => s + (x.amount || 0), 0),
      count: rows.length,
      rows: rows.map((x) => ({ date: x.date, merchant: x.merchant, amount: x.amount })),
    }),
  },

  // ⑩ schoolCompare → barlist 표준형 { items:[{label,value,rank,me}], avgRow, myRank, myAvg, provinceAvg }
  schoolCompare: {
    sql: `SELECT u.SCH_NM AS school, SUM(p.PAY_AMT) AS tot, COUNT(DISTINCT u.USER_ID) AS students FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED' GROUP BY u.SCH_NM`,
    shape: (rows) => {
      const MY = "흥덕중";
      const ranked = rows
        .map((x) => ({ label: x.school, value: round((x.tot || 0) / (x.students || 1)), me: x.school === MY }))
        .sort((a, b) => b.value - a.value);
      ranked.forEach((e, i) => (e.rank = i + 1));
      const totSum = rows.reduce((s, x) => s + (x.tot || 0), 0);
      const totStu = rows.reduce((s, x) => s + (x.students || 0), 0) || 1;
      const provinceAvg = round(totSum / totStu);
      const mine = ranked.find((e) => e.me);
      return {
        items: ranked.slice(0, 5),
        avgRow: { label: "충북 평균", value: provinceAvg },
        myRank: mine ? mine.rank : null,
        myAvg: mine ? mine.value : 0,
        provinceAvg,
      };
    },
  },
};

export default QUERIES;
