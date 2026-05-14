"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-0 mb-4 text-xl font-semibold tracking-tight text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-lg font-semibold tracking-tight text-foreground first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-base font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1.5 text-sm text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5 text-sm text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className="font-medium text-primary underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>
  ),
  pre: ({ children }) => <pre className="mb-4 overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">{children}</pre>,
  hr: () => <hr className="my-8 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-2 border-primary/50 pl-4 text-sm italic text-muted-foreground">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[20rem] border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-medium text-foreground">{children}</th>,
  td: ({ children }) => <td className="border border-border px-3 py-2 text-muted-foreground">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

export function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="help-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
