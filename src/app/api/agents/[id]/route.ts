import { NextRequest, NextResponse } from "next/server";
import { deleteAgent } from "@/lib/queries";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteAgent(id);
  return NextResponse.json({ ok: true });
}
