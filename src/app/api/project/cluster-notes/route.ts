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
  const snapshotId = searchParams.get("snapshotId");

  if (!organizationId || !projectId || !snapshotId) {
    return NextResponse.json({ message: "Missing organizationId, projectId, or snapshotId" }, { status: 400 });
  }

  const res = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/notes?snapshotId=${snapshotId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const projectId = searchParams.get("projectId");

  if (!organizationId || !projectId) {
    return NextResponse.json({ message: "Missing organizationId or projectId" }, { status: 400 });
  }

  const body = await request.text();

  const res = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/notes`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    }
  );

  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const projectId = searchParams.get("projectId");
  const noteId = searchParams.get("noteId");

  if (!organizationId || !projectId || !noteId) {
    return NextResponse.json({ message: "Missing organizationId, projectId, or noteId" }, { status: 400 });
  }

  const res = await fetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}/graph/notes/${noteId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
