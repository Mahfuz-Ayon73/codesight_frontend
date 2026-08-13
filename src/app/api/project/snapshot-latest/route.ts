import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const projectId = searchParams.get("projectId");

  if (!organizationId || !projectId) {
    return NextResponse.json({ message: "Missing organizationId or projectId" }, { status: 400 });
  }

  const res = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/snapshots/latest`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 404) {
    return new NextResponse(null, { status: 404 });
  }

  const data = await res.json().catch(() => ({ message: res.statusText }));
  return NextResponse.json(data, { status: res.status });
}
