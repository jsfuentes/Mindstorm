import { NextRequest, NextResponse } from "next/server";
import { getSavedPaths, addSavedPath } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(getSavedPaths());
}

export async function POST(request: NextRequest) {
  const { path: newPath } = await request.json();
  addSavedPath(newPath);
  return NextResponse.json({ ok: true });
}
