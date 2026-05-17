/** Escape user input for safe use in MongoDB `$regex` or `RegExp`. */
export function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function caseInsensitiveRegex(input: string): RegExp {
  return new RegExp(escapeRegexLiteral(input), "i");
}
