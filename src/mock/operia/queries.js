// 알려진 10개 intent — 고정 SQL 템플릿 + shaper (MOCK_API_설계.md §8.4 / TEMPLATE_설계.md §4)
// ★ 실 오페리아 계약 = 한 요청 = SQL 1문장 = 결과셋 1개(rows). intent당 sql은 '정확히 1문장'(UNION ALL 허용).
//   shape(rows)는 그 단일 rows를 '템플릿 표준 데이터'(§2)로 정규화한다(표현/필드는 charts/intentConfig·templates 담당).
import { labelOfCode, canonChannel, labelForColumn } from "../../charts/codeLabels";

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
// ★ 실 backend 월/일축은 'YYYY-MM'(Claude CONCAT) 또는 'YYYYMM'(LEFT) / 'YYYY-MM-DD'·'YYYYMMDD' 둘 다 올 수 있다.
//   구분자에 의존하지 말고 숫자만 추출해 위치로 파싱(작업A). mock('YYYY-MM','YYYY-MM-DD')도 동일 결과(회귀 0).
const digits = (v) => String(v == null ? "" : v).replace(/[^0-9]/g, "");
const mLabel = (ym) => { const d = digits(ym); const mm = d.length >= 6 ? +d.slice(4, 6) : 0; return mm ? mm + "월" : String(ym || ""); };
// 월 → 정규 'YYYY-MM'(현재월 비교용). 'YYYY-MM'/'YYYYMM' 모두 수용.
const monthKey = (v) => { const d = digits(v); return d.length >= 6 ? `${d.slice(0, 4)}-${d.slice(4, 6)}` : String(v == null ? "" : v); };
const dLabel = (ymd) => { const d = digits(ymd); if (d.length < 8) return String(ymd || ""); const mm = +d.slice(4, 6), dd = +d.slice(6, 8); return mm && dd ? `${mm}/${dd}` : String(ymd || ""); };
// 일자 → ISO 'YYYY-MM-DD'(list/연속7일 키 표준화). 'YYYYMMDD'·'YYYY-MM-DD' 모두 수용.
const toIsoDate = (v) => { const d = digits(v); return d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : String(v == null ? "" : v); };
const pad2 = (n) => String(n).padStart(2, "0");
const ymdOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
// '오늘'(실제 현재일). 미래 날짜 결제는 어떤 차트에도 안 나오게 SQL에서 컷오프(목업 데이터에 미래 결제가 섞여 있어도 방지).
const TODAY = ymdOf(new Date());
const NOT_FUTURE = `AND PAY_DT <= '${TODAY} 23:59:59'`;
// 일별 결제합 rows([{day,amount}])를 '오늘로 끝나는 연속 7일' series로. 결제 없는 날은 value 0, 미래 날짜는 안 나옴.
// 앵커='오늘'(실제 현재일). 고정 데모일이 필요하면 ymdOf(new Date()) 대신 상수("2026-06-22")로 교체.
const last7Days = (rows) => {
  const byDay = new Map(rows.map((r) => [toIsoDate(r.day), r.amount || 0]));
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
// 결제수단 코드 → 한글: backend(PARENT_CARD/JORUGI)·mock(APPCARD/BEG) 모두 codeLabels 가 수용.
const meansLabel = (code) => labelOfCode(code, "PAY_MEAN_CD");

export const QUERIES = {
  // ① report → bar 표준형 { series:[{label,value}], breakdown:[{label,value,pct,key}] }
  report: {
    sql: `SELECT SUBSTR(PAY_DT,1,7) AS month, PAY_MEANS AS means, SUM(PAY_AMT) AS amount FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' ${NOT_FUTURE} GROUP BY SUBSTR(PAY_DT,1,7), PAY_MEANS ORDER BY month`,
    // ★ backend 월별은 breakdown(means) 컬럼이 없을 수 있다 → 그 경우 막대만(§6-1·작업D). means 있으면 결제수단 분해.
    shape: (rows) => {
      const hasMeans = rows.some((r) => r.means != null);
      return {
        series: sumBy(rows, "month").sort((a, b) => (a.month < b.month ? -1 : 1)).map((x) => ({ label: mLabel(x.month), value: x.amount })),
        breakdown: hasMeans
          ? withPct(sumBy(rows, "means").sort((a, b) => b.amount - a.amount))
              .map((x) => ({ label: meansLabel(x.means), value: x.amount, pct: x.pct, key: x.means }))
          : [],
      };
    },
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
      // 범주가 코드값(CATEGORY_CD)이면 한글 라벨, mock 의 한글 업종명(BIZ_ITEM_NM)은 원문 통과.
      return { total, slices: rows.map((x) => ({ label: labelOfCode(x.category, "CATEGORY_CD"), value: x.amount, cnt: x.cnt, pct: round((x.amount / total) * 100) })) };
    },
  },

  // ③ friendCompare → compare 표준형 { bars:[{label,value,me?}], percentile }
  friendCompare: {
    sql: `SELECT 'me' AS k, SUM(PAY_AMT) AS v FROM TB_PAY_DTL WHERE USER_ID='${UID}' AND PAY_STTS='APPROVED' ` +
      `UNION ALL SELECT 'school' AS k, s AS v FROM (SELECT SUM(p.PAY_AMT) AS s FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND u.SCH_NM='흥덕중' AND u.GRADE='2' AND p.PAY_STTS='APPROVED' GROUP BY p.USER_ID) sc ` +
      `UNION ALL SELECT 'province' AS k, s AS v FROM (SELECT SUM(p.PAY_AMT) AS s FROM TB_PAY_DTL p JOIN TB_COM_USER u ON u.USER_ID=p.USER_ID WHERE u.USER_TYPE='STUDENT' AND p.PAY_STTS='APPROVED' GROUP BY p.USER_ID) pv`,
    // 두 형태 처리:
    //  · (mock) 분포 행 {k:'me'/'school'/'province', v} → 학교/충북 평균 + 백분위 계산
    //  · (2차요청 backend B-2) 직접 비교 행 {label, amount} = 나/또래/충북 3행 → 그대로 막대(백분위 없음)
    //  · 그 외(구형 #3=학교별 {sch_nm, avg} 등) → null 반환 → table 폴백(정상, 회귀 아님)
    shape: (rows) => {
      if (rows.some((r) => r.k === "me" || r.k === "school" || r.k === "province")) {
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
      }
      // 2차요청 직접 비교형: 라벨이 나/또래/충북류일 때만 compare(학교명 등 구형은 table 폴백)
      const KNOWN = /나|본인|내|또래|친구|학년|우리학교|충북|도\s*평균|평균|^me$|peer|school|province/i;
      if (rows.length >= 2 && rows.length <= 4 && rows.every((r) => KNOWN.test(String(r.k)))) {
        const bars = rows.map((r) => ({ label: String(r.k), value: r.v || 0, me: /나|본인|내|^me$/i.test(String(r.k)) }));
        if (!bars.some((b) => b.me)) bars[0].me = true;
        return { percentile: null, bars };
      }
      return null;
    },
  },

  // ④ nudgeCompare → trend 표준형 { current:{label,count,value,month,isCurrentMonth}, prev:{label,count,value}|null, delta:number|null, monthly:[{label,count,value}] }
  // ★ 정직 표시: 이전 달 행이 실제로 있을 때만 prev/delta. 단일월이면 prev=null·delta=null(없는 지난달을 0으로 지어내지 않음).
  nudgeCompare: {
    sql: `SELECT SUBSTR(REQ_DT,1,7) AS month, COUNT(*) AS cnt, SUM(RECV_AMT) AS amount FROM TB_BEG WHERE STUDENT_USER_ID='${UID}' AND REQ_STTS='ACCEPT' GROUP BY SUBSTR(REQ_DT,1,7) ORDER BY month`,
    shape: (rows) => {
      const monthly = rows.map((r) => ({ label: mLabel(r.month), count: r.cnt || 0, value: r.amount || 0 }));
      const months = rows.map((r) => monthKey(r.month));
      const n = monthly.length;
      if (!n) return { current: { label: "", count: 0, value: 0, month: "", isCurrentMonth: false }, prev: null, delta: null, monthly };
      const i = n - 1;
      const current = { label: monthly[i].label, count: monthly[i].count, value: monthly[i].value, month: months[i], isCurrentMonth: months[i] === monthKey(TODAY) };
      const prev = n > 1 ? { label: monthly[i - 1].label, count: monthly[i - 1].count, value: monthly[i - 1].value } : null;
      const delta = prev ? current.count - prev.count : null;
      return { current, prev, delta, monthly };
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
    // ★ 3가지 입력 형태 모두 처리(shapeForIntent 가 balance 는 raw tableData 를 그대로 넘김):
    //   A) mock 계산형 {k,v} (k=voucher_used/charge_recv/charge_used/points) → 한도·수령 기준 잔액 계산
    //   B) backend 가로 단일행 {voucher_balance, charge_balance, edu_point}(또는 한글 라벨) → 3항목 피벗
    //   C) backend 세로 {item, balance}(2차요청 후) → 행별 항목 매핑
    //   합산하지 않음(항목별 표시). 컬럼명(영문 코드)·한글 라벨 둘 다 인식.
    shape: (rows) => {
      if (!rows || !rows.length) return null;
      const pos = (n) => (n > 0 ? n : 0);
      const META = {
        voucher: { label: "바우처(지원금)", sub: "학생 복지 지원금", unit: "원" },
        charge: { label: "용돈 충전금", sub: "보호자가 충전한 용돈", unit: "원" },
        point: { label: "에듀포인트", sub: "질문·퀴즈로 모은 포인트", unit: "P" },
      };
      // 항목 식별 규칙(영문 코드/한글 라벨 공통)
      const KIND = [
        { re: /voucher.*bal|바우처|지원금/i, meta: META.voucher },
        { re: /charge.*bal|충전|용돈/i, meta: META.charge },
        { re: /edu.*point|^point|포인트|에듀포인트/i, meta: META.point },
      ];
      const keys = Object.keys(rows[0]);

      // ★ 단일행 + 숫자컬럼 1개(operia 잔액 총액 ACCOUNT_BALANCE_AMT 등) → 단일 KPI 로 렌더.
      //   기존 A/B/C KIND 매칭이 안 잡히던 케이스(라벨=값 깨짐)의 근본 방지. KIND 에 명확히 매칭되면(하위호환)
      //   여기서 처리하지 않고 아래 기존 경로(B: 단일행 피벗)로 넘긴다.
      if (rows.length === 1) {
        const numCols = keys.filter((c) => typeof rows[0][c] === "number");
        if (numCols.length === 1) {
          const col = numCols[0];
          const matchesKind = KIND.some((k) => k.re.test(col));
          if (!matchesKind) {
            return { kpi: true, items: [{ label: labelForColumn(col), sub: "", value: pos(rows[0][col] || 0), unit: /P$|POINT|포인트/i.test(String(col)) ? "P" : "원" }] };
          }
        }
      }

      // A) 계산형 {k,v} — used/recv/points 원시값으로 잔액 계산(mock)
      if (keys.includes("k") && keys.includes("v") && rows.some((r) => /used|recv|points/i.test(String(r.k)))) {
        const by = Object.fromEntries(rows.map((r) => [r.k, r.v || 0]));
        const vUsed = by.voucher_used || 0, recv = by.charge_recv || 0, cUsed = by.charge_used || 0, pts = by.points || 0;
        return { items: [
          { ...META.voucher, value: pos(VOUCHER_LIMIT - vUsed) },
          { ...META.charge, value: pos(recv - cUsed) },
          { ...META.point, value: pos(pts) },
        ] };
      }

      // B) 가로 단일행 — 컬럼이 곧 항목(이미 계산된 잔액). user_id 등 비수치 컬럼은 무시.
      if (rows.length === 1) {
        const row = rows[0];
        const items = [];
        for (const { re, meta } of KIND) {
          const col = keys.find((c) => re.test(c) && typeof row[c] === "number");
          if (col) items.push({ ...meta, value: pos(row[col]) });
        }
        if (items.length) return { items };
      }

      // C) 세로 {item, balance} — 행별 라벨→항목 매핑(모르는 라벨은 원문 표시)
      const labelKey = keys.find((c) => /item|^k$|label|구분|항목|종류/i.test(c)) || keys[0];
      const valKey = keys.find((c) => /bal|amount|^v$|value|금액|잔액|포인트/i.test(c) && typeof rows[0][c] === "number") || keys[1];
      if (labelKey && valKey) {
        const items = rows.map((r) => {
          const raw = String(r[labelKey]);
          const k = KIND.find((x) => x.re.test(raw));
          return k ? { ...k.meta, value: pos(r[valKey] || 0) } : { label: raw, sub: "", value: pos(r[valKey] || 0), unit: "원" };
        });
        if (items.length) return { items };
      }
      return null;
    },
  },

  // ⑦ channel → txList 표준형 { groups:[{key,label,amount,count,pct}], rows:[{group,item,amount,date}] }
  channel: {
    sql: `SELECT p.PAY_CHANNEL AS channel, v.MERCHANT_NM AS item, v.BIZ_ITEM_NM AS cat, p.PAY_AMT AS amount, p.PAY_DT AS dt FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' ORDER BY p.PAY_DT DESC`,
    shape: (rows) => {
      // backend CHANNEL_CD 는 코드('ON'/'OFF')·영문·한글("온라인"/"오프라인"), mock 은 'ONLINE'/'OFFLINE'
      //   → canonChannel 로 표준키 정규화(trim·대소문자·한글 수용; 템플릿 groupStyles 키와 정렬).
      const canon = canonChannel;
      const total = rows.reduce((s, r) => s + (r.amount || 0), 0) || 1;
      // backend 집계행은 cnt(cnt_pay)로 건수를 주고, mock 은 거래 1건=1행. count 는 cnt 있으면 합, 없으면 행 수.
      const group = (ch, label) => {
        const rs = rows.filter((r) => canon(r.channel) === ch);
        const amount = rs.reduce((s, r) => s + (r.amount || 0), 0);
        const count = rs.reduce((s, r) => s + (r.cnt != null ? r.cnt : 1), 0);
        return { key: ch, label, amount, count, pct: round((amount / total) * 100) };
      };
      // 거래 단위 컬럼(item)이 있을 때만 tx 리스트 구성. backend 집계행(채널별 합계)엔 item 이 없어 리스트 생략(스택바+요약만).
      const hasItem = rows.some((r) => r.item != null);
      return {
        groups: [group("OFFLINE", "오프라인"), group("ONLINE", "온라인")],
        rows: hasItem ? rows.map((r) => ({ group: canon(r.channel), item: r.item, amount: r.amount, date: r.dt })) : [],
      };
    },
  },

  // ⑧ merchantBreakdown → barlist 표준형 { items:[{label,value,pct}] }
  // ★미집계 응답 방어(Q2): backend 가 가맹점/업종별 집계 없이 개별 거래를 그대로 줄 수 있다(중복 label·미정렬).
  //   → label 정규화(카테고리 코드는 CATEGORY_CD 한글화, 이미 한글이면 통과) → 동일 label 합산 1행 병합
  //   → 합계 내림차순 → withPct 로 비율 재계산. mock 은 이미 GROUP BY 집계라 병합이 no-op(회귀 0).
  merchantBreakdown: {
    sql: `SELECT v.MERCHANT_NM AS merchant, SUM(p.PAY_AMT) AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_STTS='APPROVED' GROUP BY v.MERCHANT_NM ORDER BY amount DESC LIMIT 6`,
    shape: (rows) => {
      const labeled = rows.map((x) => ({ merchant: labelOfCode(x.merchant, "CATEGORY_CD"), amount: x.amount }));
      const merged = sumBy(labeled, "merchant").sort((a, b) => b.amount - a.amount);
      return { items: withPct(merged).map((x) => ({ label: x.merchant, value: x.amount, pct: x.pct })) };
    },
  },

  // ⑨ parentCard → list 표준형 { rows:[{date,merchant,amount}], total, count }
  parentCard: {
    sql: `SELECT SUBSTR(p.PAY_DT,1,10) AS date, v.MERCHANT_NM AS merchant, p.PAY_AMT AS amount FROM TB_PAY_DTL p JOIN TB_COM_VOUCHER v ON v.MERCHANT_NO=p.MERCHANT_NO WHERE p.USER_ID='${UID}' AND p.PAY_MEANS='APPCARD' AND p.PAY_STTS='APPROVED' ORDER BY p.PAY_DT DESC`,
    // date 는 ISO 'YYYY-MM-DD'로 정규화(backend dlng_dt='YYYYMMDD' → 표시/정렬용). mock(SUBSTR 1~10)도 동일 결과.
    shape: (rows) => ({
      total: rows.reduce((s, x) => s + (x.amount || 0), 0),
      count: rows.length,
      rows: rows.map((x) => ({ date: toIsoDate(x.date), merchant: x.merchant, amount: x.amount })),
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
      const totStu = rows.reduce((s, x) => s + (x.students || 0), 0);
      // students 있으면 1인당(총합/총인원), 없으면(backend 학교별=총액만) 학교 총액의 단순평균.
      const provinceAvg = totStu ? round(totSum / totStu) : round(mean(ranked.map((e) => e.value)));
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
