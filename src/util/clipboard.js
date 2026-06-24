// 클립보드 복사 유틸 — 말풍선 long-press 복사용.
//
// navigator.clipboard.writeText 우선(보안 컨텍스트 필요). 미지원/실패(구형 WebView·비-https 등)면
// textarea + execCommand('copy') 폴백. 폭스에듀 네이티브 WebView 에서도 동작하도록 폴백을 둔다.
//
// @returns {Promise<boolean>} 성공 여부(빈 문자열은 false).

export async function copyText(text) {
  const s = String(text == null ? "" : text);
  if (!s) return false;

  // ① 표준 Clipboard API (https/secure context)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(s);
      return true;
    }
  } catch (e) {
    // 권한 거부/미지원 → 폴백으로
  }

  // ② 폴백: 화면 밖 textarea 선택 후 execCommand('copy')
  try {
    const ta = document.createElement("textarea");
    ta.value = s;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, s.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) {
    return false;
  }
}

export default copyText;
