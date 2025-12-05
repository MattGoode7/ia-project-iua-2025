"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  FiActivity,
  FiFilm,
  FiImage,
  FiPenTool,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import type {
  ContentHistoryItem,
  ContentResult,
  ContentKind,
} from "@/types/content";

type RequestState = {
  loading: boolean;
  error: string | null;
  message?: string | null;
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

const musicOptions = [
  { label: "Tranquilo", value: "chill" },
  { label: "Alegre", value: "happy" },
  { label: "Esperanzador", value: "hopeful" },
  { label: "Emocionante", value: "excited" },
  { label: "Contemplativo", value: "contemplative" },
  { label: "Melancolico", value: "melancholic" },
  { label: "Oscuro", value: "dark" },
  { label: "Divertido", value: "funny/quirky" },
];

const voiceOptions = [
  { label: "Heart (Femenina)", value: "af_heart" },
  { label: "Bella (Femenina)", value: "af_bella" },
  { label: "Nova (Femenina)", value: "af_nova" },
  { label: "Sarah (Femenina)", value: "af_sarah" },
  { label: "Adam (Masculina)", value: "am_adam" },
  { label: "Echo (Masculina)", value: "am_echo" },
  { label: "Michael (Masculina)", value: "am_michael" },
];

const captionPositionOptions = [
  { label: "Superior", value: "top" },
  { label: "Centro", value: "center" },
  { label: "Inferior", value: "bottom" },
];

type VideoScene = {
  text: string;
  searchTermsInput: string;
};

type VideoConfig = {
  paddingBack: number;
  music: string;
  voice: string;
  captionPosition: "top" | "center" | "bottom";
  orientation: "portrait" | "landscape";
};

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
    description: "Crea videos para redes sociales con escenas personalizadas.",
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

  // Video state
  const [videoScenes, setVideoScenes] = useState<VideoScene[]>([
    { text: "", searchTermsInput: "" },
  ]);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    paddingBack: 1500,
    music: "chill",
    voice: "af_heart",
    captionPosition: "bottom",
    orientation: "portrait",
  });
  const [videoResult, setVideoResult] = useState<ContentResult | null>(null);
  const [videoState, setVideoState] = useState<RequestState>({
    loading: false,
    error: null,
    message: null,
  });

  const [history, setHistory] = useState<ContentHistoryItem[]>([]);
  const [historyState, setHistoryState] = useState<RequestState>({
    loading: true,
    error: null,
  });
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const fetchHistory = useCallback(async () => {
    setHistoryState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/history?limit=50", {
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

  // Video handlers
  const addScene = () => {
    setVideoScenes((prev) => [...prev, { text: "", searchTermsInput: "" }]);
  };

  const removeScene = (index: number) => {
    if (videoScenes.length <= 1) return;
    setVideoScenes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSceneText = (index: number, text: string) => {
    setVideoScenes((prev) =>
      prev.map((scene, i) => (i === index ? { ...scene, text } : scene))
    );
  };

  const updateSceneSearchTerms = (index: number, termsString: string) => {
    setVideoScenes((prev) =>
      prev.map((scene, i) => (i === index ? { ...scene, searchTermsInput: termsString } : scene))
    );
  };

  const parseSearchTerms = (input: string): string[] => {
    return input
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  const submitVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const scenesWithParsedTerms = videoScenes.map((s) => ({
      text: s.text,
      searchTerms: parseSearchTerms(s.searchTermsInput),
    }));
    
    const validScenes = scenesWithParsedTerms.filter(
      (s) => s.text.trim().length >= 5 && s.searchTerms.length > 0
    );
    
    if (validScenes.length === 0) {
      setVideoState({
        loading: false,
        error: "Agrega al menos una escena con texto y terminos de busqueda",
      });
      return;
    }

    setVideoState({ loading: true, error: null, message: null });
    setVideoResult(null);

    try {
      const response = await fetch("/api/content/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: validScenes,
          config: videoConfig,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo generar el video");
      }

      // El resultado puede tener videoStatus "processing" o "ready"
      const result = data.item?.result;
      const videoId = result?.videoId as string | undefined;
      const videoStatus = result?.videoStatus as string | undefined;

      if (!videoId) {
        throw new Error("No se recibió el ID del video");
      }

      // Si el video ya está listo
      if (videoStatus === "ready") {
        setVideoState({ loading: false, error: null, message: "¡Video generado exitosamente! Obteniendo video..." });
        setVideoResult({ videoId, videoStatus: "ready" } as ContentResult);
        setVideoScenes([{ text: "", searchTermsInput: "" }]);
        fetchHistory();
      } else {
        // El video está procesando, hacer polling
        setVideoState({ loading: true, error: null, message: "Video en proceso de generación..." });
        setVideoResult({ videoId, videoStatus: "processing" } as ContentResult);
        await pollVideoStatus(videoId, data.item?._id);
      }
    } catch (error) {
      setVideoState({
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo generar el video",
        message: null,
      });
    }
  };

  const pollVideoStatus = async (videoId: string, itemId?: string) => {
    const maxAttempts = 60; // 5 minutos máximo (60 * 5 segundos)
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Esperar 5 segundos
      attempts++;

      try {
        const statusResponse = await fetch(`/api/content/video?videoId=${videoId}`);
        const statusData = await statusResponse.json();

        if (statusData.status === "ready") {
          // Actualizar el item en MongoDB si tenemos el ID
          if (itemId) {
            await fetch(`/api/content/video`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId, videoStatus: "ready" }),
            });
          }
          
          setVideoState({ loading: false, error: null, message: "¡Video generado exitosamente!" });
          setVideoResult({ videoId, videoStatus: "ready" } as ContentResult);
          setVideoScenes([{ text: "", searchTermsInput: "" }]);
          fetchHistory();
          return;
        } else if (statusData.status === "error") {
          setVideoState({
            loading: false,
            error: "Error al generar el video",
            message: null,
          });
          return;
        }
        // Si sigue en "processing", continuar el loop
      } catch {
        // Ignorar errores de polling y continuar
      }
    }

    setVideoState({
      loading: false,
      error: "Tiempo de espera agotado. El video puede seguir procesándose en segundo plano.",
      message: null,
    });
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

  const renderVideoHistorySnippet = (item: ContentHistoryItem) => {
    const videoId = item.result?.videoId as string | undefined;
    const videoStatus = item.result?.videoStatus as string | undefined;
    const prompt = item.prompt?.slice(0, 100) ?? "";
    
    // Si no hay videoId, mostrar no disponible
    if (!videoId) {
      return (
        <div className="history-video">
          <div className="video-unavailable">
            <FiFilm className="video-unavailable-icon" />
            <span>Video no disponible</span>
          </div>
          {prompt && <p className="history-snippet">{prompt}...</p>}
        </div>
      );
    }

    // Si el video está procesando, mostrar estado de procesamiento
    if (videoStatus === "processing" || item.status === "processing") {
      return (
        <div className="history-video">
          <div className="video-processing-history">
            <FiFilm className="video-processing-icon" />
            <span>Procesando video...</span>
          </div>
          {prompt && <p className="history-snippet">{prompt.slice(0, 80)}...</p>}
        </div>
      );
    }

    // Video listo, mostrar reproductor
    return (
      <div className="history-video">
        <video
          className="history-video-player"
          controls
          preload="metadata"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        >
          <source
            src={`/api/content/video/download?videoId=${videoId}`}
            type="video/mp4"
          />
        </video>
        <div className="video-unavailable" style={{ display: "none" }}>
          <FiFilm className="video-unavailable-icon" />
          <span>Video no disponible</span>
        </div>
        {prompt && <p className="history-snippet">{prompt.slice(0, 80)}...</p>}
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
      return <p className="muted">No hay ejecuciones registradas todavia.</p>;
    }

    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    const startIndex = (historyPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = history.slice(startIndex, endIndex);

    return (
      <>
        {paginatedItems.map((item) => {
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
                    : item.type === "video"
                      ? renderVideoHistorySnippet(item)
                      : (
                        <p className="history-snippet">{snippets}</p>
                      )}
                <small className="muted">{date}</small>
              </div>
            </article>
          );
        })}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage === 1}
            >
              <FiChevronLeft />
              Anterior
            </button>
            <span className="pagination-info">
              {historyPage} de {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
              disabled={historyPage === totalPages}
            >
              Siguiente
              <FiChevronRight />
            </button>
          </div>
        )}
      </>
    );
  };

  const renderActivePanel = () => {
    if (activeTab === "script") {
      return (
        <section className="panel-card card">
          <div className="card-header">
            <div className="icon-circle success">{tabMeta.script.icon}</div>
            <div className="card-header-content">
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
            <div className="card-header-content">
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
        <section className="panel-card card">
          <div className="card-header">
            <div className="icon-circle accent">{tabMeta.video.icon}</div>
            <div className="card-header-content">
              <h2>{tabMeta.video.title}</h2>
              <p>{tabMeta.video.description}</p>
            </div>
          </div>
          <form className="form" onSubmit={submitVideo}>
            <div className="scenes-container">
              <div className="scenes-header">
                <span className="scenes-label">Escenas del video</span>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={addScene}
                >
                  Agregar escena
                </button>
              </div>
              {videoScenes.map((scene, index) => (
                <div key={index} className="scene-card">
                  <div className="scene-header">
                    <span className="scene-number">Escena {index + 1}</span>
                    {videoScenes.length > 1 && (
                      <button
                        type="button"
                        className="remove-scene"
                        onClick={() => removeScene(index)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <label>
                    Narracion (en ingles)
                    <textarea
                      rows={2}
                      value={scene.text}
                      onChange={(e) => updateSceneText(index, e.target.value)}
                      placeholder="Ej. Did you know that 90% of businesses fail in their first year?"
                    />
                  </label>
                  <label>
                    Terminos de busqueda (separados por coma)
                    <input
                      type="text"
                      value={scene.searchTermsInput}
                      onChange={(e) => updateSceneSearchTerms(index, e.target.value)}
                      placeholder="Ej. business, startup, office"
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="video-config">
              <span className="config-label">Configuracion del video</span>
              <div className="config-grid">
                <label>
                  Musica
                  <select
                    value={videoConfig.music}
                    onChange={(e) =>
                      setVideoConfig((prev) => ({ ...prev, music: e.target.value }))
                    }
                  >
                    {musicOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Voz
                  <select
                    value={videoConfig.voice}
                    onChange={(e) =>
                      setVideoConfig((prev) => ({ ...prev, voice: e.target.value }))
                    }
                  >
                    {voiceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Posicion de subtitulos
                  <select
                    value={videoConfig.captionPosition}
                    onChange={(e) =>
                      setVideoConfig((prev) => ({
                        ...prev,
                        captionPosition: e.target.value as "top" | "center" | "bottom",
                      }))
                    }
                  >
                    {captionPositionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Orientacion
                  <select
                    value={videoConfig.orientation}
                    onChange={(e) =>
                      setVideoConfig((prev) => ({
                        ...prev,
                        orientation: e.target.value as "portrait" | "landscape",
                      }))
                    }
                  >
                    <option value="portrait">Vertical (9:16)</option>
                    <option value="landscape">Horizontal (16:9)</option>
                  </select>
                </label>
              </div>
            </div>
            {videoState.error && (
              <p className="error-text">{videoState.error}</p>
            )}
            {videoState.message && !videoState.error && (
              <p className="success-text">{videoState.message}</p>
            )}
            <button
              type="submit"
              className="primary"
              disabled={videoState.loading}
            >
              {videoState.loading ? "Generando video..." : "Crear video"}
            </button>
            {videoState.loading && !videoState.message && (
              <p className="muted">
                La generación puede tomar varios minutos dependiendo de la cantidad de escenas.
              </p>
            )}
          </form>
          {videoResult?.videoId && (
            <div className="result-block">
              {videoResult.videoStatus === "processing" ? (
                <div className="video-processing">
                  <FiFilm className="video-processing-icon" />
                  <p>El video se está procesando...</p>
                  <p className="muted">{videoState.message || "Esto puede tomar varios minutos. El video aparecerá automáticamente cuando esté listo."}</p>
                </div>
              ) : (
                <>
                  {videoState.message && (
                    <p className="success-text" style={{ marginBottom: '16px' }}>{videoState.message}</p>
                  )}
                  <video
                    className="video-preview"
                    controls
                    preload="metadata"
                  >
                    <source
                      src={`/api/content/video/download?videoId=${videoResult.videoId}`}
                      type="video/mp4"
                    />
                    Tu navegador no soporta la reproducción de video.
                  </video>
                </>
              )}
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="panel-card card">
        <div className="card-header">
          <div className="icon-circle warning">{tabMeta.sentiment.icon}</div>
          <div className="card-header-content">
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
