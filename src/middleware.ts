import { authMiddleware } from "@/lib/middlewares/auth-middleware";

export function middleware(request: import("next/server").NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
