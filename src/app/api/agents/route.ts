import { NextRequest, NextResponse } from "next/server";
import { getAgentsByProject, upsertAgents } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json([]);
  return NextResponse.json(getAgentsByProject(projectId));
}

export async function PUT(request: NextRequest) {
  const { agents, projectId } = await request.json();
  if (!projectId) return NextResponse.json({ ok: false }, { status: 400 });
  upsertAgents(agents, projectId);
  return NextResponse.json({ ok: true });
}
