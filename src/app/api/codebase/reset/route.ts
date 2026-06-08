import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const projectId = searchParams.get("projectId");

    if (!organizationId || !projectId) {
      return NextResponse.json({ message: "Missing organizationId or projectId" }, { status: 400 });
    }

    const res = await fetch(
      `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/codebase`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const text = await res.text();

    if (!res.ok) {
      let parsed: unknown = { message: res.statusText };
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      return NextResponse.json(parsed, { status: res.status });
    }

    let data: unknown = {};
    try { data = JSON.parse(text); } catch { /* ignore */ }
    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PROXY /api/codebase/reset] Error:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
