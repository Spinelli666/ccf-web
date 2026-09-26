// Renderizador de markdown das anotações, sem dependência externa e sem HTML cru
// (tudo vira elemento React, então não tem como injetar script). Cobre o que se usa
// numa anotação: títulos #/##/###, negrito, itálico, riscado, `código`, blocos ```,
// listas (-, *, 1.), tarefas (- [ ] / - [x]), citação (>), linha (---) e links.
import { Fragment, type ReactNode } from "react";

type Block =
  | { t: "h"; level: 1 | 2 | 3; text: string }
  | { t: "hr" }
  | { t: "code"; text: string }
  | { t: "quote"; lines: string[] }
  | { t: "list"; ordered: boolean; items: ListItem[] }
  | { t: "p"; lines: string[] };

type ListItem = { text: string; indent: number; task: null | boolean; line: number; num?: number };

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TASK_RE = /^\[([ xX])\]\s+(.*)$/;

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (trimmed.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push({ t: "code", text: buf.join("\n") });
      continue;
    }
    const h = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push({ t: "h", level: h[1].length as 1 | 2 | 3, text: h[2] });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }
    if (trimmed.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) buf.push(lines[i++].trim().replace(/^>\s?/, ""));
      blocks.push({ t: "quote", lines: buf });
      continue;
    }
    const li = line.match(LIST_RE);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (!m || /\d/.test(m[2]) !== ordered) break;
        const task = m[3].match(TASK_RE);
        items.push({
          text: task ? task[2] : m[3],
          indent: Math.min(4, Math.floor(m[1].replace(/\t/g, "  ").length / 2)),
          task: task ? task[1].toLowerCase() === "x" : null,
          line: i,
          num: ordered ? parseInt(m[2], 10) : undefined,
        });
        i++;
      }
      blocks.push({ t: "list", ordered, items });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      const tl = l.trim();
      if (!tl || tl.startsWith("```") || /^#{1,3}\s/.test(tl) || tl.startsWith(">") || LIST_RE.test(l) || /^(-{3,}|\*{3,}|_{3,})$/.test(tl)) break;
      buf.push(l);
      i++;
    }
    blocks.push({ t: "p", lines: buf });
  }
  return blocks;
}

const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+?\*\*|__[^_]+?__)|(~~[^~]+?~~)|(\*[^*\s](?:[^*]*?[^*\s])?\*|_[^_\s](?:[^_]*?[^_\s])?_)|(\[[^\]]+\]\([^)\s]+\))/;

function renderInline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = rest.match(INLINE_RE);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{renderInline(tok.slice(2, -2), k)}</strong>);
    else if (m[3]) out.push(<del key={k}>{renderInline(tok.slice(2, -2), k)}</del>);
    else if (m[4]) out.push(<em key={k}>{renderInline(tok.slice(1, -1), k)}</em>);
    else if (m[5]) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      const href = /^https?:\/\//i.test(lm[2]) ? lm[2] : null;
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer">
            {renderInline(lm[1], k)}
          </a>
        ) : (
          <Fragment key={k}>{tok}</Fragment>
        )
      );
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

export function Markdown({ text, onToggleTask }: { text: string; onToggleTask?: (line: number) => void }) {
  const blocks = parseBlocks(text || "");
  if (blocks.length === 0) return <p className="md-empty">Página em branco.</p>;
  return (
    <>
      {blocks.map((b, bi) => {
        switch (b.t) {
          case "h":
            return b.level === 1 ? (
              <h1 key={bi}>{renderInline(b.text)}</h1>
            ) : b.level === 2 ? (
              <h2 key={bi}>{renderInline(b.text)}</h2>
            ) : (
              <h3 key={bi}>{renderInline(b.text)}</h3>
            );
          case "hr":
            return <hr key={bi} />;
          case "code":
            return (
              <pre key={bi}>
                <code>{b.text}</code>
              </pre>
            );
          case "quote":
            return (
              <blockquote key={bi}>
                {b.lines.map((l, li) => (
                  <Fragment key={li}>
                    {li > 0 && <br />}
                    {renderInline(l, `q${li}`)}
                  </Fragment>
                ))}
              </blockquote>
            );
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={bi} className={b.items.some((it) => it.task !== null) ? "md-tasks" : undefined}>
                {b.items.map((it, ii) => (
                  <li
                    key={ii}
                    value={it.num}
                    style={it.indent ? { marginLeft: it.indent * 18 } : undefined}
                    className={it.task !== null ? `md-task${it.task ? " done" : ""}` : undefined}
                  >
                    {it.task !== null && (
                      <input
                        type="checkbox"
                        checked={it.task}
                        disabled={!onToggleTask}
                        onChange={() => onToggleTask?.(it.line)}
                      />
                    )}
                    <span>{renderInline(it.text, `l${ii}`)}</span>
                  </li>
                ))}
              </Tag>
            );
          }
          case "p":
            return (
              <p key={bi}>
                {b.lines.map((l, li) => (
                  <Fragment key={li}>
                    {li > 0 && <br />}
                    {renderInline(l, `p${li}`)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </>
  );
}

/** Marca/desmarca a tarefa (- [ ] / - [x]) da linha `line` do texto. */
export function toggleTaskLine(text: string, line: number): string {
  const lines = text.split("\n");
  const l = lines[line];
  if (l === undefined) return text;
  lines[line] = l.replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/, (_m, pre: string, c: string) => `${pre}[${c.trim() ? " " : "x"}]`);
  return lines.join("\n");
}
