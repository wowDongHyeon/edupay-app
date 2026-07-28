// 한국어 조사 자동 선택 — 앞 단어 받침 유무로 은/는·이/가·을/를 결정.
//   순수 함수. word 마지막 글자 기준으로 조사를 붙여 word+조사 를 반환.
//   목적: 인사이트 문구의 하드코딩 "은(는)"·"이(가)" 병기 제거(intentConfig).

const PAIR = {
  "은는": ["은", "는"], // [받침 있음, 받침 없음]
  "이가": ["이", "가"],
  "을를": ["을", "를"],
};

// 숫자로 끝날 때 한국어 관용 발음 받침 여부: 0(영)·1(일)·3(삼)·6(육)·7(칠)·8(팔)=받침, 2·4·5·9=무받침.
const DIGIT_JONG = { "0": true, "1": true, "3": true, "6": true, "7": true, "8": true, "2": false, "4": false, "5": false, "9": false };

// 마지막 글자에 받침이 있는지. 판단 불가(영문·기호)면 기본값 true(받침 취급) → "은(는)" 병기는 절대 출력 안 됨.
function hasJong(word) {
  const w = String(word ?? "").trim();
  if (!w) return true; // 빈 문자열 폴백
  const ch = w[w.length - 1];
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return ((code - 0xac00) % 28) !== 0; // 한글 음절(가~힣)
  if (ch >= "0" && ch <= "9") return DIGIT_JONG[ch];                         // 숫자
  return true; // 영문·기호 등: 안전 기본값(받침 취급)
}

// word + (kind 조사). kind ∈ "은는"|"이가"|"을를". 잘못된 kind면 word 원문 반환.
export function josa(word, kind) {
  const pair = PAIR[kind];
  const w = String(word ?? "");
  if (!pair) return w;
  return w + (hasJong(w) ? pair[0] : pair[1]);
}

export default josa;
