import { Buffer } from "node:buffer";

type N8NPayload = {
  type: string;
  prompt: string;
};

type StatusResponse = {
  status: "pending" | "completed" | "error";
  result?: unknown;
  taskId?: string;
  message?: string;
  error?: string;
};

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const POLL_INTERVAL =
  Number(process.env.N8N_POLL_INTERVAL_MS ?? "3000") || 3000;
const POLL_TIMEOUT =
  Number(process.env.N8N_POLL_TIMEOUT_MS ?? "60000") || 60000;

if (!WEBHOOK_URL) {
  console.warn("N8N_WEBHOOK_URL es requerido para procesar solicitudes.");
}

function isStatusEnvelope(payload: unknown): payload is StatusResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "status" in payload &&
    typeof (payload as { status?: unknown }).status === "string"
  );
}

const BASE64_REGEX = /^[A-Za-z0-9+/=\s]+$/;

function isLikelyBase64(value: string) {
  if (!value) return false;
  if (value.startsWith("data:image")) return true;
  if (value.length < 100) return false;
  const sanitized = value.replace(/\s+/g, "");
  return BASE64_REGEX.test(sanitized);
}

function unwrapResultPayload(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return { items: [] };
    }

    const first = payload[0] as Record<string, unknown> | undefined;
    if (first && "output" in first) {
      const output = (first as { output?: unknown }).output;
      if (output && typeof output === "object") {
        return output as Record<string, unknown>;
      }
      return { output };
    }

    return { items: payload };
  }

  if (payload && typeof payload === "object") {
    return payload as Record<string, unknown>;
  }

  if (typeof payload === "string") {
    if (isLikelyBase64(payload)) {
      return { imageData: payload };
    }
    return { output: payload };
  }

  return { value: payload };
}

async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    return response.json();
  }

  if (contentType.startsWith("image/") || contentType.includes("application/octet-stream")) {
    const arrayBuffer = await response.arrayBuffer();
    const type = contentType || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return {
      imageData: `data:${type};base64,${base64}`,
      imageType: type,
    };
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.startsWith("data:image")) {
      return { imageData: text };
    }
    return { output: text };
  }
}

export async function triggerN8N(payload: N8NPayload) {
  if (!WEBHOOK_URL) {
    throw new Error("Missing N8N_WEBHOOK_URL environment variable");
  }

  const initial = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!initial.ok) {
    throw new Error(`Webhook error (${initial.status})`);
  }

  const initialData: unknown = await parseResponsePayload(initial);

  if (!isStatusEnvelope(initialData)) {
    return {
      status: "completed" as const,
      result: unwrapResultPayload(initialData),
    };
  }

  if (initialData.status === "completed") {
    return {
      status: "completed" as const,
      result: unwrapResultPayload(
        initialData.result ?? initialData
      ),
      taskId: initialData.taskId,
    };
  }

  if (initialData.status === "error") {
    throw new Error(
      initialData.message ?? initialData.error ?? "La automatización respondió con error"
    );
  }

  if (!initialData.taskId) {
    throw new Error(
      "La automatización no devolvió un taskId para continuar el seguimiento"
    );
  }

  const startedAt = Date.now();
  const pollUrl = new URL(WEBHOOK_URL);
  pollUrl.searchParams.set("taskId", initialData.taskId);

  while (Date.now() - startedAt < POLL_TIMEOUT) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    const pollResponse = await fetch(pollUrl.toString(), { cache: "no-store" });

    if (!pollResponse.ok) {
      throw new Error(`Error al consultar el estado (${pollResponse.status})`);
    }

    const pollData: unknown = await parseResponsePayload(pollResponse);

    if (!isStatusEnvelope(pollData)) {
      return {
        status: "completed" as const,
        result: unwrapResultPayload(pollData),
        taskId: initialData.taskId,
      };
    }

    if (pollData.status === "completed") {
      return {
        status: "completed" as const,
        result: unwrapResultPayload(
          pollData.result ?? pollData
        ),
        taskId: pollData.taskId ?? initialData.taskId,
      };
    }

    if (pollData.status === "error") {
      throw new Error(pollData.message ?? "La automatización retornó error");
    }
  }

  throw new Error(
    "Se agotó el tiempo de espera para recibir la respuesta de n8n"
  );
}
