import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

async function context(request: NextRequest) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;
  return {
    token,
    organizationId: request.nextUrl.searchParams.get("organizationId"),
    projectId: request.nextUrl.searchParams.get("projectId"),
  };
}

function proxy(text: string, status: number) {
  return new NextResponse(text, { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request: NextRequest) {
  const { token, organizationId, projectId } = await context(request);
  const snapshotId = request.nextUrl.searchParams.get("snapshotId");
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!organizationId || !projectId || !snapshotId) {
    return NextResponse.json({ message: "Missing organizationId, projectId, or snapshotId" }, { status: 400 });
  }
  const response = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/edit-revisions?snapshotId=${snapshotId}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  return proxy(await response.text(), response.status);
}

export async function POST(request: NextRequest) {
  const { token, organizationId, projectId } = await context(request);
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!organizationId || !projectId) {
    return NextResponse.json({ message: "Missing organizationId or projectId" }, { status: 400 });
  }
  const response = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/edit-revisions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return proxy(await response.text(), response.status);
}

export async function PUT(request: NextRequest) {
  const { token, organizationId, projectId } = await context(request);
  const revisionId = request.nextUrl.searchParams.get("revisionId");
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!organizationId || !projectId || !revisionId) {
    return NextResponse.json({ message: "Missing organizationId, projectId, or revisionId" }, { status: 400 });
  }
  const response = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/edit-revisions/${revisionId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return proxy(await response.text(), response.status);
}

export async function DELETE(request: NextRequest) {
  const { token, organizationId, projectId } = await context(request);
  const revisionId = request.nextUrl.searchParams.get("revisionId");
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!organizationId || !projectId || !revisionId) {
    return NextResponse.json({ message: "Missing organizationId, projectId, or revisionId" }, { status: 400 });
  }
  const response = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/edit-revisions/${revisionId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return proxy(await response.text(), response.status);
}
