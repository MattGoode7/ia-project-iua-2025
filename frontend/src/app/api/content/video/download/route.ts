import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/content/video/download?videoId=xxx
// Proxy para descargar el video desde short-video-maker
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json(
      { error: "Se requiere el parámetro videoId" },
      { status: 400 }
    );
  }

  try {
    const videoMakerUrl = process.env.SHORT_VIDEO_MAKER_URL || "http://localhost:3123";
    const videoResponse = await fetch(`${videoMakerUrl}/api/short-video/${videoId}`);

    if (!videoResponse.ok) {
      throw new Error(`Error descargando video: ${videoResponse.status}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    
    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="video-${videoId}.mp4"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error descargando video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
