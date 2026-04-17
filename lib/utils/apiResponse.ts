import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function successResponse<T>(
  data: T,
  message?: string,
  status = 200,
  meta?: ApiResponse["meta"]
): NextResponse {
  const body: ApiResponse<T> = { success: true, data, message, meta };
  return NextResponse.json(body, { status });
}

export function errorResponse(error: string, status = 400): NextResponse {
  const body: ApiResponse = { success: false, error };
  return NextResponse.json(body, { status });
}

export function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "Forbidden"): NextResponse {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = "Not found"): NextResponse {
  return errorResponse(message, 404);
}

export function serverErrorResponse(message = "Internal server error"): NextResponse {
  return errorResponse(message, 500);
}
