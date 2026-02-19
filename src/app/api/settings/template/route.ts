import { NextRequest, NextResponse } from "next/server";
import { getTemplate, updateTemplate } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(getTemplate());
}

export async function PUT(request: NextRequest) {
  const { name, content } = await request.json();
  updateTemplate(name, content);
  return NextResponse.json({ ok: true });
}
