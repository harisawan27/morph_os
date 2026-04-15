import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pass-through — Morph OS works in guest mode, no route protection needed.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: [] };
