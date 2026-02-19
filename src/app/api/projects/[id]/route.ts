import { NextRequest, NextResponse } from "next/server";
import {
  projectExists,
  updateProject,
  deleteProject,
} from "@/lib/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!projectExists(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  updateProject(id, { cwd: body.cwd });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteProject(id);
  return NextResponse.json({ ok: true });
}
