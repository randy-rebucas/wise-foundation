const MAX_LIMIT = 100;
const MAX_PAGE = 9999;

export function parsePagination(searchParams: URLSearchParams): { page: number; limit: number } {
  const page = Math.min(Math.max(parseInt(searchParams.get("page") ?? "1") || 1, 1), MAX_PAGE);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20") || 1, 1), MAX_LIMIT);
  return { page, limit };
}
