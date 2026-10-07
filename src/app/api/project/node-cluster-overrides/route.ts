import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

async function authContext(request: NextRequest) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const projectId = request.nextUrl.searchParams.get("projectId");
  return { token, organizationId, projectId };
}

function proxyResponse(text: string, status: number) {
  return new NextResponse(text, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) {
  const { token, organizationId, projectId } = await authContext(request);
  const snapshotId = request.nextUrl.searchParams.get("snapshotId");
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!organizationId || !projectId || !snapshotId) {
    return NextResponse.json(
      { message: "Missing organizationId, projectId, or snapshotId" },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/overrides/nodes?snapshotId=${snapshotId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return proxyResponse(await response.text(), response.status);
}

export async function POST(request: NextRequest) {
  const { token, organizationId, projectId } = await authContext(request);
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!organizationId || !projectId) {
    return NextResponse.json({ message: "Missing organizationId or projectId" }, { status: 400 });
  }

  const response = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/overrides/nodes/preview`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return proxyResponse(await response.text(), response.status);
}

export async function PUT(request: NextRequest) {
  const { token, organizationId, projectId } = await authContext(request);
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!organizationId || !projectId) {
    return NextResponse.json({ message: "Missing organizationId or projectId" }, { status: 400 });
  }

  const response = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/overrides/nodes`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return proxyResponse(await response.text(), response.status);
}
