/** Plain text from Markdown (for excerpts, meta tags, and search). */
export function stripMarkdownPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/#+\s*/g, " ")
    .replace(/[*_|~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
