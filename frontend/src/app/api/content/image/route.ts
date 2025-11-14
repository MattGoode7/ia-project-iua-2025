import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { triggerN8N } from "@/lib/n8n";
import { saveContentItem } from "@/lib/content-service";

export const dynamic = "force-dynamic";

const ImageSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Describe con más detalle qué imagen necesitas."),
  goals: z.preprocess(
    (value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === "string" && value.length > 0) {
        return [value];
      }
      return [];
    },
    z.array(z.string().trim().min(3)).min(1, "Selecciona al menos un objetivo visual.")
  ),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "No se pudo interpretar la solicitud." },
      { status: 400 }
    );
  }
  const parsed = ImageSchema.safeParse(json);

  if (!parsed.success) {
    console.error("Payload inválido para /api/content/image", json, parsed.error.flatten());
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.entries(flattened.fieldErrors)
      .flatMap(([field, messages]) => (messages ?? []).map((msg) => `${field}: ${msg}`));
    const message =
      [...flattened.formErrors, ...fieldErrors].filter(Boolean).join(". ") ||
      "Datos incompletos para generar la imagen.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  const { description, goals } = parsed.data;

  const prompt = [
    "Genera una propuesta de imagen para redes sociales.",
    `Descripción solicitada: ${description}`,
    `Objetivos del contenido: ${goals.join(", ")}`,
    "Devuelve una breve explicación del concepto y, si aplica, la URL/base64 de la imagen.",
  ].join("\n");

  try {
    const n8nResponse = await triggerN8N({
      type: "image",
      prompt,
    });

    const item = await saveContentItem({
      type: "image",
      prompt,
      metadata: { goals },
      result: n8nResponse.result,
      n8nTaskId: n8nResponse.taskId,
      status: "completed",
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado generando representación visual";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
