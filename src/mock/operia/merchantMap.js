// ⑤ merchantMap — 근처 사용 가능 가맹점(지도) (card: merchantMap)
// MOCK_API_설계.md §5 ⑤
export default {
  question: "근처 사용 가능 가맹점 알려줘",
  sql:
    "SELECT MERCHANT_NM, BIZ_ITEM_NM, ADDR, LAT, LNG FROM TB_COM_VOUCHER " +
    "WHERE USE_YN='Y' AND VOUCHER_STTS_NM='정상';",
  result: {
    center: { lat: 36.6372, lng: 127.486 },
    merchants: [
      { name: "GS25 청주흥덕점", category: "편의점", addr: "청주시 흥덕구 대농로 12", lat: 36.6378, lng: 127.4852 },
      { name: "분식왕 떡볶이", category: "식비", addr: "청주시 흥덕구 가경로 33", lat: 36.6361, lng: 127.4889 },
      { name: "흥덕문구", category: "학용품", addr: "청주시 흥덕구 신율로 8", lat: 36.639, lng: 127.4843 },
      { name: "CU 가경점", category: "편의점", addr: "청주시 흥덕구 가경로 51", lat: 36.6355, lng: 127.4901 },
    ],
  },
};
