import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { triggerN8N } from "@/lib/n8n";
import { saveContentItem } from "@/lib/content-service";

export const dynamic = "force-dynamic";

const VideoSchema = z.object({
  scenes: z
    .array(
      z.object({
        text: z.string().min(5, "El texto de la escena es muy corto"),
        searchTerms: z.array(z.string()).min(1, "Se requiere al menos un término de búsqueda"),
      })
    )
    .min(1, "Se requiere al menos una escena"),
  config: z
    .object({
      paddingBack: z.number().default(1500),
      music: z.string().default("chill"),
      voice: z.string().default("af_heart"),
      captionPosition: z.enum(["top", "center", "bottom"]).default("bottom"),
      captionBackgroundColor: z.string().default("blue"),
      orientation: z.enum(["portrait", "landscape"]).default("portrait"),
    })
    .optional(),
});

export type VideoRequestBody = z.infer<typeof VideoSchema>;

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = VideoSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { scenes, config } = parsed.data;

  // Config por defecto si no se proporciona
  const videoConfig = config ?? {
    paddingBack: 1500,
    music: "chill",
    voice: "af_heart",
    captionPosition: "bottom" as const,
    captionBackgroundColor: "blue",
    orientation: "portrait" as const,
  };

  // Crear prompt descriptivo para el historial
  const promptSummary = scenes.map((s) => s.text).join(" | ");

  try {
    // Enviar a n8n para que procese con short-video-maker
    const n8nResponse = await triggerN8N({
      type: "video",
      prompt: promptSummary,
      scenes,
      config: videoConfig,
    });

    // n8n devuelve { videoId: "xxx", videoStatus: "ready" | "processing" }
    const result = n8nResponse.result ?? {};
    const videoId = result.videoId as string | undefined;
    const videoStatus = (result.videoStatus as string) ?? "processing";

    console.log("[Video API] Respuesta de n8n:", { videoId, videoStatus, result });

    // Determinar el estado del item según el status del video
    let itemStatus: "completed" | "processing" | "failed" = "failed";
    if (videoId) {
      itemStatus = videoStatus === "ready" ? "completed" : "processing";
    }

    // Guardar en MongoDB
    const item = await saveContentItem({
      type: "video",
      prompt: promptSummary,
      metadata: {
        scenes,
        config: videoConfig,
      },
      result: {
        videoId,
        videoStatus,
      },
      n8nTaskId: n8nResponse.taskId,
      status: itemStatus,
    });

    console.log("[Video API] Item guardado en MongoDB:", item);

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperado generando video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET para obtener el estado de un video específico
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
    // Consultar estado directamente a short-video-maker
    const videoMakerUrl = process.env.SHORT_VIDEO_MAKER_URL || "http://localhost:3123";
    const statusResponse = await fetch(`${videoMakerUrl}/api/short-video/${videoId}/status`);

    if (!statusResponse.ok) {
      throw new Error(`Error consultando estado: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    return NextResponse.json(statusData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error consultando estado del video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH para actualizar el estado del video en MongoDB
export async function PATCH(req: NextRequest) {
  try {
    const { itemId, videoStatus } = await req.json();

    if (!itemId || !videoStatus) {
      return NextResponse.json(
        { error: "Se requieren itemId y videoStatus" },
        { status: 400 }
      );
    }

    const { updateContentItem } = await import("@/lib/content-service");
    
    const updatedItem = await updateContentItem(itemId, {
      result: { videoStatus },
      status: videoStatus === "ready" ? "completed" : "processing",
    });

    if (!updatedItem) {
      return NextResponse.json(
        { error: "No se encontró el item" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error actualizando estado del video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
