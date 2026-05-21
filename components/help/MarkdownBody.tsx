"use client";

import { MarkdownContent } from "@/components/shared/MarkdownContent";

export function MarkdownBody({ content }: { content: string }) {
  return <MarkdownContent content={content} className="help-markdown" />;
}
