"use client";

import { Fragment, type ReactNode } from "react";

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Renders model text: paragraphs, bullet/numbered lists, **bold**, *italic* and clickable [n] citation chips. */
export default function RichText({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const inline = (line: string): ReactNode =>
    line.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[\d+(?:,\s*\d+)*\])/g).map((part, i) => {
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return <strong key={i}>{bold[1]}</strong>;
      const em = part.match(/^\*([^*]+)\*$/);
      if (em) return <em key={i}>{em[1]}</em>;
      const cite = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
      if (cite)
        return (
          <Fragment key={i}>
            {cite[1].split(/,\s*/).map((n) => (
              <button
                key={n}
                onClick={() => onCite?.(Number(n))}
                className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-accent-soft px-1 align-text-top text-[11px] font-semibold text-violet-700 hover:bg-accent hover:text-white"
              >
                {n}
              </button>
            ))}
          </Fragment>
        );
      return <Fragment key={i}>{part}</Fragment>;
    });

  return (
    <>
      {text
        .trim()
        .split(/\n{2,}/)
        .map((block, bi) => {
          const lines = block.split("\n").filter((l) => l.trim());
          const cls = "leading-relaxed [&:not(:first-child)]:mt-3";
          if (lines.length && lines.every((l) => BULLET.test(l))) {
            const ordered = /^\s*\d/.test(lines[0]);
            const List = ordered ? "ol" : "ul";
            return (
              <List key={bi} className={`${cls} space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
                {lines.map((l, li) => (
                  <li key={li}>{inline(l.replace(BULLET, ""))}</li>
                ))}
              </List>
            );
          }
          return (
            <p key={bi} className={cls}>
              {lines.map((l, li) => (
                <Fragment key={li}>
                  {li > 0 && <br />}
                  {inline(l)}
                </Fragment>
              ))}
            </p>
          );
        })}
    </>
  );
}
