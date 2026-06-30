import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
    if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const projectId = searchParams.get("projectId");
    const count = searchParams.get("count") ?? "10";

    if (!organizationId || !projectId) {
      return NextResponse.json({ message: "Missing params" }, { status: 400 });
    }

    const res = await fetch(
      `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/analyze-history?count=${count}`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );

    return new NextResponse(null, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
