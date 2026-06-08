import { NextRequest, NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");
  const isApi = pathname.startsWith("/api");

  console.log(`[MIDDLEWARE] ${pathname} | token=${!!token} | isApi=${isApi}`);

  // Never intercept API routes — they handle auth themselves
  if (isApi) {
    console.log(`[MIDDLEWARE] Passing API route through`);
    return NextResponse.next();
  }

  if (!token && !isPublic && !isOnboarding) {
    console.log(`[MIDDLEWARE] No token, redirecting to /login`);
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!token && isOnboarding) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}
