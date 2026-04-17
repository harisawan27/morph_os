"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

// ── Code block with copy button ───────────────────────────────────────────────
function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace("language-", "") ?? "";

  const raw = typeof children === "string"
    ? children
    : Array.isArray(children)
    ? (children as string[]).join("")
    : "";

  const copy = () => {
    navigator.clipboard.writeText(raw.trimEnd()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div
      className="relative my-3 rounded-xl overflow-hidden text-[13px]"
      style={{ background: "var(--bg-code)", border: "1px solid var(--border)" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-[11px] font-medium tracking-wide uppercase select-none" style={{ color: "var(--t4)" }}>
          {lang || "code"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg transition-all"
          style={{ color: copied ? "rgba(134,239,172,0.8)" : "var(--t4)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = copied ? "rgba(134,239,172,0.8)" : "var(--t4)"; }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Code content */}
      <pre className="overflow-x-auto px-4 py-3.5 m-0" style={{ background: "transparent" }}>
        <code
          className={className}
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontSize: "13px",
            lineHeight: "1.65",
            color: "var(--t2)",
          }}
        >
          {children}
        </code>
      </pre>
    </div>
  );
}

// ── Inline code ───────────────────────────────────────────────────────────────
function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded-md text-[12.5px]"
      style={{
        background: "rgba(147,51,234,0.12)",
        border: "1px solid rgba(147,51,234,0.2)",
        color: "var(--code-inline-color)",
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      }}
    >
      {children}
    </code>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // ── Headings ──────────────────────────────────────────────────────
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold mt-5 mb-2 leading-snug" style={{ color: "var(--t1)" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-4 mb-2 leading-snug" style={{ color: "var(--t1)" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1.5 leading-snug" style={{ color: "var(--t1)" }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mt-3 mb-1" style={{ color: "var(--t1)" }}>
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-medium mt-2 mb-1" style={{ color: "var(--t2)" }}>
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-medium mt-2 mb-1 uppercase tracking-wide" style={{ color: "var(--t3)" }}>
              {children}
            </h6>
          ),

          // ── Paragraph ─────────────────────────────────────────────────────
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-3 last:mb-0" style={{ color: "var(--t2)" }}>
              {children}
            </p>
          ),

          // ── Lists ─────────────────────────────────────────────────────────
          ul: ({ children }) => (
            <ul className="my-2 pl-5 space-y-1 text-sm" style={{ listStyleType: "disc", color: "var(--t2)" }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 pl-5 space-y-1 text-sm" style={{ listStyleType: "decimal", color: "var(--t2)" }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5" style={{ color: "var(--t2)" }}>
              {children}
            </li>
          ),

          // ── Blockquote ────────────────────────────────────────────────────
          blockquote: ({ children }) => (
            <blockquote
              className="my-3 pl-4 py-1 rounded-r-xl text-sm italic leading-relaxed"
              style={{
                borderLeft: "3px solid rgba(147,51,234,0.5)",
                background: "rgba(147,51,234,0.05)",
                color: "var(--t3)",
              }}
            >
              {children}
            </blockquote>
          ),

          // ── Horizontal rule ───────────────────────────────────────────────
          hr: () => (
            <hr className="my-4 border-none h-px" style={{ background: "var(--border)" }} />
          ),

          // ── Code ──────────────────────────────────────────────────────────
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return <InlineCode>{children}</InlineCode>;
            }
            return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
          },
          pre: ({ children }) => <>{children}</>,

          // ── Links ─────────────────────────────────────────────────────────
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "rgba(167,139,250,0.85)", textDecorationColor: "rgba(167,139,250,0.35)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(216,180,254,1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(167,139,250,0.85)"; }}
            >
              {children}
            </a>
          ),

          // ── Emphasis & Strong ─────────────────────────────────────────────
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: "var(--t1)" }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic" style={{ color: "var(--t2)" }}>{children}</em>
          ),

          // ── Strikethrough (GFM) ───────────────────────────────────────────
          del: ({ children }) => (
            <del style={{ color: "var(--t4)", textDecorationColor: "var(--t4)" }}>{children}</del>
          ),

          // ── Tables (GFM) ─────────────────────────────────────────────────
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: "var(--bg-input)" }}>{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr style={{ borderBottom: "1px solid var(--border)" }}>{children}</tr>
          ),
          th: ({ children }) => (
            <th
              className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--t3)" }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm" style={{ color: "var(--t2)" }}>
              {children}
            </td>
          ),

          // ── Task list checkbox (GFM) ──────────────────────────────────────
          input: ({ type, checked }) => {
            if (type === "checkbox") {
              return (
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded mr-1.5 shrink-0 align-middle"
                  style={{
                    border: "1.5px solid rgba(147,51,234,0.5)",
                    background: checked ? "rgba(147,51,234,0.3)" : "transparent",
                  }}
                >
                  {checked && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="rgba(216,180,254,0.9)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              );
            }
            return null;
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Highlight.js theme overrides — dark tokens to match Morph palette */}
      <style>{`
        .hljs { background: transparent !important; }
        .hljs-keyword, .hljs-built_in { color: rgba(167,139,250,0.9); }
        .hljs-string, .hljs-attr      { color: rgba(134,239,172,0.85); }
        .hljs-number, .hljs-literal   { color: rgba(251,191,36,0.85); }
        .hljs-comment                 { color: rgba(148,163,184,0.45); font-style: italic; }
        .hljs-title, .hljs-name       { color: rgba(96,165,250,0.9); }
        .hljs-type, .hljs-class       { color: rgba(251,146,60,0.85); }
        .hljs-variable, .hljs-params  { color: rgba(248,113,113,0.85); }
        .hljs-operator, .hljs-punctuation { color: rgba(148,163,184,0.6); }
        .hljs-selector-tag, .hljs-selector-class { color: rgba(216,180,254,0.9); }
        .hljs-property                { color: rgba(125,211,252,0.9); }
        .hljs-function                { color: rgba(96,165,250,0.9); }
        .hljs-meta                    { color: rgba(148,163,184,0.55); }
        .hljs-deletion                { color: rgba(248,113,113,0.8); background: rgba(248,113,113,0.08); }
        .hljs-addition                { color: rgba(134,239,172,0.8); background: rgba(134,239,172,0.08); }
      `}</style>
    </>
  );
}
