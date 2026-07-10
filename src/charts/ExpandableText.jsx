import React from "react";
/* ExpandableText — 긴 문자열 …클립 + 탭하면 전체 표시 / 재탭 접힘.
   모바일(WebView)은 hover 툴팁·long-press 불가 → 탭으로 대체. barlist.jsx 의 expanded 패턴을 인스턴스별 독립 상태로 공통화.
   · 접힘: truncate  / 펼침: break-words whitespace-normal (전체 표시, 높이만 늘어남)
   · className 에는 폭·색·크기·flex 등 레이아웃만 넘긴다(truncate 는 넣지 말 것 — 상태로 관리). 접힘 레이아웃은 기존과 동일.
   · role/title/cursor 로 접근성·데스크톱 hover 보너스. onClick 은 stopPropagation 으로 부모 행 onClick 과 충돌 방지.
   · 짧은 텍스트엔 무해(truncate 가 무시됨). */
export function ExpandableText({ text, className = "", as: Tag = "span", title }) {
  const [open, setOpen] = React.useState(false);
  const stateCls = open ? "break-words whitespace-normal" : "truncate";
  return (
    <Tag
      role="button"
      title={title != null ? title : text}
      className={"cursor-pointer " + stateCls + (className ? " " + className : "")}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
    >
      {text}
    </Tag>
  );
}
export default ExpandableText;
