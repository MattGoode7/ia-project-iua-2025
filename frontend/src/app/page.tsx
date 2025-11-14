"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  FiActivity,
  FiFilm,
  FiImage,
  FiPenTool,
  FiRefreshCw,
} from "react-icons/fi";
import type {
  ContentHistoryItem,
  ContentResult,
  ContentKind,
} from "@/types/content";

type RequestState = {
  loading: boolean;
  error: string | null;
};

const toneOptions = [
  "Profesional",
  "Inspirador",
  "Cercano",
  "Divertido",
  "Corporativo",
];

const imageGoalOptions = [
  { label: "Generar interacción", value: "Engagement orgánico" },
  { label: "Promocionar un producto", value: "Impulso comercial" },
  { label: "Educar a la audiencia", value: "Educativo" },
  { label: "Inspirar a la comunidad", value: "Inspiracional" },
];

const typeCopy: Record<string, string> = {
  script: "Guion",
  image: "Imagen",
  video: "Video",
  sentiment: "Sentimiento",
};

const icons: Record<ContentKind, JSX.Element> = {
  script: <FiPenTool />,
  image: <FiImage />,
  video: <FiFilm />,
  sentiment: <FiActivity />,
};

type TabId = "script" | "image" | "video" | "sentiment";

const tabMeta: Record<
  TabId,
  { title: string; description: string; icon: JSX.Element }
> = {
  script: {
    title: "Guiones listos para publicar",
    description: "Define el brief y el tono para recibir una propuesta completa.",
    icon: <FiPenTool />,
  },
  image: {
    title: "Ideas visuales",
    description: "Describe la escena y selecciona el objetivo principal.",
    icon: <FiImage />,
  },
  video: {
    title: "Videos cortos",
    description: "Placeholder · La integración con IA se sumará pronto.",
    icon: <FiFilm />,
  },
  sentiment: {
    title: "Analizador de sentimiento",
    description: "Valida la percepción del copy antes de publicarlo.",
    icon: <FiActivity />,
  },
};

const TAB_ORDER: TabId[] = ["script", "image", "video", "sentiment"];

const BASE64_REGEX = /^[A-Za-z0-9+/=\s]+$/;

function isBase64ImageString(value: unknown) {
  if (typeof value !== "string" || !value.length) return false;
  if (value.startsWith("data:image")) return true;
  if (value.length < 100) return false;
  const sanitized = value.replace(/\s+/g, "");
  return BASE64_REGEX.test(sanitized);
}

function extractBase64FromObject(
  source: unknown
): { data: string | null; mime?: string } {
  if (!source || typeof source !== "object") return { data: null };
  const maybeData = (source as { data?: unknown }).data;
  if (isBase64ImageString(maybeData)) {
    const mime =
      (source as { contentType?: string }).contentType ??
      (source as { mimeType?: string }).mimeType ??
      (source as { type?: string }).type;
    return { data: maybeData as string, mime };
  }
  return { data: null };
}

function normalizeContentResult(result?: ContentResult | null) {
  if (!result) return null;
  let current: ContentResult = { ...result };

  while (
    current.output &&
    typeof current.output === "object" &&
    current.output !== null &&
    !Array.isArray(current.output)
  ) {
    const { output, ...rest } = current;
    current = { ...rest, ...(output as Record<string, unknown>) };
  }

  if (
    typeof current.output === "string" &&
    isBase64ImageString(current.output)
  ) {
    current = { ...current, imageData: current.output };
  }

  const stringCandidates: Array<unknown> = [
    current.imageData,
    (current as { imageBase64?: unknown }).imageBase64,
    (current as { image?: unknown }).image,
    (current as { data?: unknown }).data,
    (current as { binary?: unknown }).binary,
    (current as { file?: unknown }).file,
  ];

  for (const candidate of stringCandidates) {
    if (isBase64ImageString(candidate)) {
      current = { ...current, imageData: candidate as string };
      break;
    }
  }

  if (!current.imageData) {
    const objectCandidates = [
      (current as { image?: unknown }).image,
      (current as { data?: unknown }).data,
      (current as { binary?: unknown }).binary,
      (current as { file?: unknown }).file,
    ];
    for (const obj of objectCandidates) {
      const { data, mime } = extractBase64FromObject(obj);
      if (data) {
        current = {
          ...current,
          imageData: data,
          imageMimeType:
            current.imageMimeType ??
            current.imageType ??
            (current as { contentType?: string }).contentType ??
            mime,
        };
        break;
      }
    }
  }

  if (
    current.imageData &&
    !current.imageMimeType &&
    (current.imageType || (current as { contentType?: string }).contentType)
  ) {
    current.imageMimeType =
      current.imageType ?? (current as { contentType?: string }).contentType;
  }

  return current;
}

function extractText(result?: ContentResult | null) {
  const normalized = normalizeContentResult(result);
  if (!normalized) return null;

  if (
    normalized.imageData ||
    normalized.imageUrl ||
    normalized.imageBase64
  ) {
    if (typeof normalized.text === "string" && normalized.text.length > 0) {
      return normalized.text;
    }
    if (
      typeof normalized.description === "string" &&
      normalized.description.length > 0
    ) {
      return normalized.description;
    }
    return null;
  }

  if (typeof normalized.category === "string") {
    const feelings =
      typeof normalized.feelings === "string" && normalized.feelings.length > 0
        ? ` (${normalized.feelings})`
        : "";
    const detail =
      typeof normalized.text === "string"
        ? `\n${normalized.text}`
        : typeof normalized.output === "string"
          ? `\n${normalized.output}`
          : "";
    return `Sentimiento: ${normalized.category}${feelings}${detail}`;
  }

  if (typeof normalized.text === "string") return normalized.text;
  if (typeof normalized.summary === "string") return normalized.summary;
  if (
    typeof normalized.output === "string" &&
    !isBase64ImageString(normalized.output)
  ) {
    return normalized.output;
  }
  if (normalized.sentiment) {
    const score =
      typeof normalized.score === "number"
        ? ` (confianza ${(normalized.score * 100).toFixed(0)}%)`
        : "";
    return `Sentimiento: ${normalized.sentiment}${score}${
      normalized.text ? `\n${normalized.text}` : ""
    }`;
  }

  return JSON.stringify(normalized, null, 2);
}

const SENTIMENT_IGNORED_KEYS = new Set([
  "category",
  "feelings",
  "text",
  "output",
  "sentiment",
]);

function formatLabel(label: string) {
  if (!label) return "";
  const spaced = label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function renderSentimentDetails(result: ContentResult) {
  const normalized = normalizeContentResult(result);
  if (!normalized) return null;

  const category = normalized.category ?? normalized.sentiment ?? "Sin clasificar";
  const feelings =
    typeof normalized.feelings === "string" && normalized.feelings.length > 0
      ? normalized.feelings
      : null;
  const mainText =
    typeof normalized.text === "string"
      ? normalized.text
      : typeof normalized.output === "string"
        ? normalized.output
        : null;

  const extraEntries = Object.entries(normalized)
    .filter(
      ([key, value]) =>
        !SENTIMENT_IGNORED_KEYS.has(key) &&
        value !== undefined &&
        value !== null &&
        (typeof value === "string" || typeof value === "number")
    )
    .map(([key, value]) => ({
      key,
      value: String(value),
    }));

  return (
    <>
      <div className="sentiment-header">
        <span className="sentiment-pill">{category}</span>
        {feelings && <span className="sentiment-feeling">{feelings}</span>}
      </div>
      {mainText && <p className="sentiment-quote">{mainText}</p>}
      {extraEntries.length > 0 && (
        <ul className="sentiment-extra">
          {extraEntries.map((entry) => (
            <li key={entry.key}>
              <span>{formatLabel(entry.key)}:</span> {entry.value}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function resolveImageSource(result?: ContentResult | null) {
  const normalized = normalizeContentResult(result);
  if (!normalized) return null;

  if (
    typeof normalized.imageData === "string" &&
    normalized.imageData.length > 0
  ) {
    if (normalized.imageData.startsWith("data:image")) {
      return normalized.imageData;
    }
    const type =
      normalized.imageMimeType ??
      normalized.imageType ??
      (normalized as { contentType?: string }).contentType ??
      "image/png";
    return `data:${type};base64,${normalized.imageData}`;
  }

  if (
    typeof (normalized as { imageBase64?: string }).imageBase64 === "string" &&
    (normalized as { imageBase64: string }).imageBase64.length > 0
  ) {
    const base64 = (normalized as { imageBase64: string }).imageBase64;
    if (base64.startsWith("data:image")) {
      return base64;
    }
    const type =
      normalized.imageMimeType ??
      normalized.imageType ??
      (normalized as { contentType?: string }).contentType ??
      "image/png";
    return `data:${type};base64,${base64}`;
  }

  if (
    typeof normalized.imageUrl === "string" &&
    normalized.imageUrl.length > 0
  ) {
    return normalized.imageUrl;
  }

  return null;
}

function renderImagePreview(result: ContentResult | null) {
  const src = resolveImageSource(result);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Imagen generada por IA" className="preview" />
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("script");
  const [scriptTopic, setScriptTopic] = useState("");
  const [scriptTone, setScriptTone] = useState(toneOptions[0]);
  const [scriptResult, setScriptResult] = useState<string | null>(null);
  const [scriptState, setScriptState] = useState<RequestState>({
    loading: false,
    error: null,
  });

  const [imageDescription, setImageDescription] = useState("");
  const [imageGoals, setImageGoals] = useState<string[]>([]);
  const [imageResult, setImageResult] = useState<ContentResult | null>(null);
  const [imageState, setImageState] = useState<RequestState>({
    loading: false,
    error: null,
  });

  const [sentimentText, setSentimentText] = useState("");
  const [sentimentResult, setSentimentResult] = useState<ContentResult | null>(null);
  const [sentimentState, setSentimentState] = useState<RequestState>({
    loading: false,
    error: null,
  });

  const [history, setHistory] = useState<ContentHistoryItem[]>([]);
  const [historyState, setHistoryState] = useState<RequestState>({
    loading: true,
    error: null,
  });

  const fetchHistory = useCallback(async () => {
    setHistoryState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/history?limit=12", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo obtener el historial");
      }

      setHistory(data.items ?? []);
      setHistoryState({ loading: false, error: null });
    } catch (error) {
      setHistoryState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener el historial",
      });
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const submitScript = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scriptTopic.trim()) return;

    setScriptState({ loading: true, error: null });
    setScriptResult(null);

    try {
      const response = await fetch("/api/content/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: scriptTopic, tone: scriptTone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo generar el guion");
      }

      const text = extractText(data.item?.result);
      setScriptResult(text ?? "No se recibió texto de la automatización.");
      setScriptState({ loading: false, error: null });
      setScriptTopic("");
      fetchHistory();
    } catch (error) {
      setScriptState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el guion",
      });
    }
  };

  const toggleImageGoal = (value: string) => {
    setImageGoals((prev) =>
      prev.includes(value) ? prev.filter((goal) => goal !== value) : [...prev, value]
    );
  };

  const submitImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imageDescription.trim() || imageGoals.length === 0) return;

    setImageState({ loading: true, error: null });
    setImageResult(null);

    try {
      const response = await fetch("/api/content/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: imageDescription,
          goals: imageGoals,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo generar la propuesta visual");
      }

      setImageResult(normalizeContentResult(data.item?.result ?? null));
      setImageDescription("");
      setImageGoals([]);
      setImageState({ loading: false, error: null });
      fetchHistory();
    } catch (error) {
      setImageState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar la propuesta visual",
      });
    }
  };

  const submitSentiment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sentimentText.trim()) return;

    setSentimentState({ loading: true, error: null });
    setSentimentResult(null);

    try {
      const response = await fetch("/api/content/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentimentText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo analizar el sentimiento");
      }

      setSentimentResult(normalizeContentResult(data.item?.result) ?? null);
      setSentimentText("");
      setSentimentState({ loading: false, error: null });
      fetchHistory();
    } catch (error) {
      setSentimentState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar el sentimiento",
      });
    }
  };

  const renderSentimentHistorySnippet = (item: ContentHistoryItem) => {
    const normalized = normalizeContentResult(item.result);
    if (!normalized) return null;

    const label = normalized.category ?? normalized.sentiment ?? "Sin clasificar";
    const feelings =
      typeof normalized.feelings === "string" && normalized.feelings.length > 0
        ? normalized.feelings
        : null;
    const copy =
      typeof normalized.text === "string"
        ? normalized.text
        : typeof normalized.output === "string"
          ? normalized.output
          : "";

    return (
      <div className="history-sentiment">
        <div className="sentiment-header">
          <span className="sentiment-pill">{label}</span>
          {feelings && <span className="sentiment-feeling">{feelings}</span>}
        </div>
        {copy && <p className="sentiment-quote compact">{copy}</p>}
      </div>
    );
  };

  const renderImageHistorySnippet = (item: ContentHistoryItem) => {
    const src = resolveImageSource(item.result);
    const caption = extractText(item.result);
    return (
      <div className="history-image">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Imagen histórica" className="history-thumb" />
        ) : (
          <p className="history-snippet">Sin vista previa disponible</p>
        )}
        {caption && <p className="history-snippet">{caption}</p>}
      </div>
    );
  };

  const renderHistory = () => {
    if (historyState.loading) {
      return <p className="muted">Cargando historial...</p>;
    }

    if (historyState.error) {
      return (
        <div className="error-banner">
          <p>{historyState.error}</p>
          <button onClick={fetchHistory} className="ghost-button">
            Reintentar
          </button>
        </div>
      );
    }

    if (history.length === 0) {
      return <p className="muted">No hay ejecuciones registradas todavía.</p>;
    }

    return history.map((item) => {
      const snippets = extractText(item.result)?.slice(0, 200) ?? "";
      const date = new Date(item.createdAt).toLocaleString();
      return (
        <article key={item._id} className="history-item">
          <div className="history-icon">{icons[item.type] ?? <FiPenTool />}</div>
          <div className="history-content">
            <div className="history-row">
              <span className="badge">{typeCopy[item.type] ?? item.type}</span>
              <span className={`status ${item.status}`}>{item.status}</span>
            </div>
            {item.type === "sentiment"
              ? renderSentimentHistorySnippet(item)
              : item.type === "image"
                ? renderImageHistorySnippet(item)
                : (
                  <p className="history-snippet">{snippets}</p>
                )}
            <small className="muted">{date}</small>
          </div>
        </article>
      );
    });
  };

  const renderActivePanel = () => {
    if (activeTab === "script") {
      return (
        <section className="panel-card card">
          <div className="card-header">
            <div className="icon-circle success">{tabMeta.script.icon}</div>
            <div>
              <h2>{tabMeta.script.title}</h2>
              <p>{tabMeta.script.description}</p>
            </div>
          </div>
          <form className="form" onSubmit={submitScript}>
            <label>
              Tema o brief
              <textarea
                value={scriptTopic}
                onChange={(event) => setScriptTopic(event.target.value)}
                placeholder="Ej. Lanzamiento de una nueva funcionalidad enfocada en programar historias"
                rows={4}
              />
            </label>
            <label>
              Tono
              <select
                value={scriptTone}
                onChange={(event) => setScriptTone(event.target.value)}
              >
                {toneOptions.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </label>
            {scriptState.error && (
              <p className="error-text">{scriptState.error}</p>
            )}
            <button
              type="submit"
              className="primary"
              disabled={scriptState.loading}
            >
              {scriptState.loading ? "Generando..." : "Generar guion"}
            </button>
          </form>
          {scriptResult && (
            <div className="result-block">
              <p>{scriptResult}</p>
            </div>
          )}
        </section>
      );
    }

    if (activeTab === "image") {
      return (
        <section className="panel-card card">
          <div className="card-header">
            <div className="icon-circle accent">{tabMeta.image.icon}</div>
            <div>
              <h2>{tabMeta.image.title}</h2>
              <p>{tabMeta.image.description}</p>
            </div>
          </div>
          <form className="form" onSubmit={submitImage}>
            <label>
              Descripción de la imagen
              <textarea
                rows={4}
                value={imageDescription}
                onChange={(event) => setImageDescription(event.target.value)}
                placeholder="Ej. Mockup de app sobre mesa con luz natural y colores pastel"
              />
            </label>
            <div className="options-group">
              <p>Objetivo principal</p>
              <div className="options-list">
                {imageGoalOptions.map((option) => (
                  <label key={option.value} className="checkbox">
                    <input
                      type="checkbox"
                      checked={imageGoals.includes(option.value)}
                      onChange={() => toggleImageGoal(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {imageState.error && (
              <p className="error-text">{imageState.error}</p>
            )}
            <button
              type="submit"
              className="primary"
              disabled={imageState.loading}
            >
              {imageState.loading ? "Sincronizando..." : "Solicitar propuesta"}
            </button>
          </form>
          {imageResult && (
            <div className="result-block">
      {renderImagePreview(imageResult)}
      {extractText(imageResult) && <p>{extractText(imageResult)}</p>}
            </div>
          )}
        </section>
      );
    }

    if (activeTab === "video") {
      return (
        <section className="panel-card card placeholder">
          <div className="card-header">
            <div className="icon-circle muted">{tabMeta.video.icon}</div>
            <div>
              <h2>{tabMeta.video.title}</h2>
              <p>{tabMeta.video.description}</p>
            </div>
          </div>
          <p className="muted">
            Estamos preparando plantillas de prompts dinámicos, storyboards y
            plantillas de rodaje automatizadas. Comparte tus casos prioritarios para
            ayudarnos a definir la primera versión.
          </p>
        </section>
      );
    }

    return (
      <section className="panel-card card">
        <div className="card-header">
          <div className="icon-circle warning">{tabMeta.sentiment.icon}</div>
          <div>
            <h2>{tabMeta.sentiment.title}</h2>
            <p>{tabMeta.sentiment.description}</p>
          </div>
        </div>
        <form className="form" onSubmit={submitSentiment}>
          <label>
            Texto a evaluar
            <textarea
              rows={5}
              value={sentimentText}
              onChange={(event) => setSentimentText(event.target.value)}
              placeholder="Ej. Actualizamos nuestros precios para ayudarte a crear más campañas..."
            />
          </label>
          {sentimentState.error && (
            <p className="error-text">{sentimentState.error}</p>
          )}
          <button
            type="submit"
            className="primary"
            disabled={sentimentState.loading}
          >
            {sentimentState.loading ? "Analizando..." : "Analizar sentimiento"}
          </button>
        </form>
        {sentimentResult && (
          <div className="result-block sentiment-block">
            {renderSentimentDetails(sentimentResult)}
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Laboratorio creativo asistido por IA</p>
          <h1>Social Content Studio</h1>
          <p className="muted">
            Centraliza briefs, genera guiones, piezas visuales y valida tono con un
            único panel conectado a tus automatizaciones en n8n.
          </p>
        </div>
      </header>

      <section className="tabs">
        <div className="tab-list">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="tab-icon">{tabMeta[tab].icon}</span>
              <span>
                <strong>{tabMeta[tab].title}</strong>
                <small>{tabMeta[tab].description}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="panel-shell">{renderActivePanel()}</div>
      </section>

      <section className="card history-card">
        <div className="card-header">
          <div>
            <h2>Historial de contenido</h2>
            <p className="muted">
              Cada respuesta confirmada se almacena para tu referencia rápida.
            </p>
          </div>
          <button onClick={fetchHistory} className="ghost-button">
            <FiRefreshCw />
            Actualizar
          </button>
        </div>
        <div className="history-list">{renderHistory()}</div>
      </section>
    </main>
  );
}
