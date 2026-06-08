import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

// Allow up to 60 seconds for large chunk forwarding
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  // Extract org/project IDs from the query params
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const projectId = searchParams.get("projectId");

  if (!organizationId || !projectId) {
    return NextResponse.json({ message: "Missing organizationId or projectId" }, { status: 400 });
  }

  const springUrl = `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/upload/zip-chunk`;

  // Forward the multipart body as-is to Spring Boot
  const body = await request.arrayBuffer();
  const contentType = request.headers.get("content-type") ?? "";

  const res = await fetch(springUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }));
    return NextResponse.json(data, { status: res.status });
  }

  // 202 Accepted (chunk received, not done) or 200 (all chunks done)
  if (res.status === 202) {
    return new NextResponse(null, { status: 202 });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 200 });
}
