import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { triggerN8N } from "@/lib/n8n";
import { saveContentItem } from "@/lib/content-service";

export const dynamic = "force-dynamic";

const ScriptSchema = z.object({
  topic: z.string().min(10, "Describe con más contexto la publicación."),
  tone: z
    .string()
    .min(3)
    .max(50)
    .describe("Tono a aplicar sobre el guion."),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = ScriptSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") },
      { status: 400 }
    );
  }

  const { topic, tone } = parsed.data;

  const prompt = [
    "Genera un guion para una publicación en redes sociales.",
    `Tono sugerido: ${tone}.`,
    `Instrucciones del usuario: ${topic}`,
    "Devuelve una estructura clara con ganchos, cuerpo y llamado a la acción.",
  ].join("\n");

  try {
    const n8nResponse = await triggerN8N({
      type: "script",
      prompt,
    });

    const item = await saveContentItem({
      type: "script",
      prompt,
      metadata: { tone },
      result: n8nResponse.result,
      n8nTaskId: n8nResponse.taskId,
      status: "completed",
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperado generando guion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
