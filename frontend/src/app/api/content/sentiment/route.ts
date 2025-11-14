import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { triggerN8N } from "@/lib/n8n";
import { saveContentItem } from "@/lib/content-service";

export const dynamic = "force-dynamic";

const SentimentSchema = z.object({
  text: z.string().min(10, "Necesito más contexto para analizar el sentimiento."),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = SentimentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") },
      { status: 400 }
    );
  }

  const { text } = parsed.data;

  const prompt = [
    "Analiza el sentimiento del siguiente texto destinado a redes sociales.",
    "Indica si es positivo, negativo o neutro y justifica brevemente.",
    `Texto: ${text}`,
  ].join("\n");

  try {
    const n8nResponse = await triggerN8N({
      type: "sentiment",
      prompt,
    });

    const item = await saveContentItem({
      type: "sentiment",
      prompt,
      metadata: {},
      result: n8nResponse.result,
      n8nTaskId: n8nResponse.taskId,
      status: "completed",
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado durante el análisis de sentimiento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
