import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(request: NextRequest) {
  const { templateHtml, cwd, title } = (await request.json()) as {
    templateHtml?: string;
    cwd?: string;
    title?: string;
  };

  const project = createProject({ title, cwd, templateHtml });
  return NextResponse.json(project);
}
