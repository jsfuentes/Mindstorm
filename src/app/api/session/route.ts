import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ documentHtml: "", history: [] });
  return NextResponse.json(getSession(projectId));
}

export async function PUT(request: NextRequest) {
  const { documentHtml, history, projectId } = await request.json();
  if (!projectId) return NextResponse.json({ ok: false }, { status: 400 });
  updateSession(projectId, documentHtml, history);
  return NextResponse.json({ ok: true });
}
