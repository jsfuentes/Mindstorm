import { NextRequest, NextResponse } from "next/server";
import {
  getActiveProjectData,
  switchActiveProject,
  projectExists,
} from "@/lib/queries";

export async function GET() {
  const data = getActiveProjectData();
  if (!data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const { projectId } = await request.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  if (!projectExists(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const data = switchActiveProject(projectId);
  return NextResponse.json(data);
}
