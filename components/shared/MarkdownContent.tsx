"use client";

import dynamic from "next/dynamic";

const MarkdownInner = dynamic(
  () => import("@/components/shared/MarkdownInner").then((m) => m.MarkdownInner),
  { ssr: false, loading: () => null }
);

export type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content.trim()) return null;
  return <MarkdownInner content={content} className={className} />;
}
