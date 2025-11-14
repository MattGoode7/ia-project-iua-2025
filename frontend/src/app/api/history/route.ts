import { NextRequest, NextResponse } from "next/server";
import { getRecentContent } from "@/lib/content-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

  try {
    const items = await getRecentContent(safeLimit);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo recuperar el historial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
