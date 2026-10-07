import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { authMiddleware } from "@/lib/middlewares/auth-middleware";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

function request(path: string, authenticated = false) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: authenticated ? { cookie: `${AUTH_TOKEN_COOKIE}=test-token` } : undefined,
  });
}

describe("authMiddleware", () => {
  it.each([false, true])(
    "allows the email verification page when authenticated=%s",
    (authenticated) => {
      const response = authMiddleware(
        request("/verify-email?token=verification-token", authenticated),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it("still redirects unauthenticated users away from protected pages", () => {
    const response = authMiddleware(request("/projects"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
