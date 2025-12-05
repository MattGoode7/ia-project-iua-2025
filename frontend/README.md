# Social Content Studio

Panel en Next.js orientado a equipos de social media para orquestar la generación de guiones, propuestas visuales, videos para redes sociales y análisis de sentimiento a través de automatizaciones en n8n. Incluye un chatbot asistente integrado con n8n Chat. Cada resultado exitoso se guarda en MongoDB para facilitar el seguimiento del contenido creado.

## Características principales

- **Generador de Guiones**: Crea guiones para publicaciones con diferentes tonos (profesional, inspirador, cercano, divertido, corporativo).
- **Generador de Imágenes**: Propuestas visuales con objetivos específicos (engagement, awareness, conversión, educación, entretenimiento).
- **Generador de Videos**: Creación de videos cortos para redes sociales usando [short-video-maker](https://github.com/gyoridavid/short-video-maker) con:
  - Múltiples escenas con texto y términos de búsqueda para videos de fondo (Pexels)
  - Configuración de música, voz (Kokoro TTS), posición de subtítulos y orientación
  - Soporte para formatos vertical (9:16) y horizontal (16:9)
- **Analizador de Sentimiento**: Clasifica textos por categoría emocional y sentimientos.
- **Chatbot Asistente**: Widget de chat integrado con n8n Chat (`@n8n/chat`) que proporciona asistencia contextual sobre estrategias de contenido.
- **Historial Persistente**: Todos los resultados se guardan en MongoDB con paginación (5 elementos por página).
- **Integración con n8n**: Sistema de webhooks con polling para procesos asíncronos.

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   n8n           │────▶│  Servicios      │
│   (Next.js)     │◀────│   (Webhooks)    │◀────│  (AI/Video)     │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MongoDB       │     │   Flowise       │     │ short-video-    │
│   (Historial)   │     │   (Chatbot)     │     │ maker           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Requisitos

- Node.js 18+
- npm 9+
- Docker + Docker Compose
- n8n (para las automatizaciones)
- Flowise (para el chatbot) - opcional

## Servicios Docker

El proyecto incluye los siguientes servicios en `docker-compose.yml`:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| MongoDB | 27017 | Base de datos para historial |
| Qdrant | 6333, 6334 | Base de datos vectorial (para RAG del chatbot) |
| short-video-maker | 3123 | Generador de videos cortos |

## Configuración rápida

1. **Variables de entorno**

   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

   Completa en `.env.local`:

   ```env
   # n8n
   N8N_WEBHOOK_URL=https://tu-instancia-n8n.com/webhook/xxx
   N8N_POLL_INTERVAL_MS=3000
   N8N_POLL_TIMEOUT_MS=60000

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/content_studio
   MONGODB_DB=content_studio

   # Short Video Maker
   SHORT_VIDEO_MAKER_URL=http://localhost:3123

   # n8n Chat (Chatbot)
   NEXT_PUBLIC_N8N_CHAT_WEBHOOK=https://tu-instancia-n8n.com/webhook/chat
   NEXT_PUBLIC_CHAT_PROJECT=content-studio
   ```

2. **Levantar servicios Docker**

   ```bash
   # Desde la raíz del proyecto
   docker compose up -d
   ```

   Esto iniciará MongoDB, Qdrant y short-video-maker.

3. **Instalar dependencias y ejecutar**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   La app quedará disponible en [http://localhost:3000](http://localhost:3000).

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/content/script` | Genera guion. Body: `{ topic, tone }` |
| POST | `/api/content/image` | Genera propuesta visual. Body: `{ description, goals[] }` |
| POST | `/api/content/video` | Genera video. Body: `{ scenes[], config }` |
| GET | `/api/content/video?videoId=xxx` | Consulta estado del video |
| PATCH | `/api/content/video` | Actualiza estado del video. Body: `{ itemId, videoStatus }` |
| GET | `/api/content/video/download?videoId=xxx` | Descarga el video generado |
| POST | `/api/content/sentiment` | Analiza sentimiento. Body: `{ text }` |
| GET | `/api/history?limit=50` | Historial reciente |

### Payload de Video

```json
{
  "scenes": [
    {
      "text": "Texto que se mostrará y narrará",
      "searchTerms": ["palabra", "clave", "para", "buscar", "video"]
    }
  ],
  "config": {
    "paddingBack": 1500,
    "music": "chill",
    "voice": "af_heart",
    "captionPosition": "bottom",
    "orientation": "portrait"
  }
}
```

### Respuesta de n8n para Videos

El flujo de n8n debe retornar:

```json
{
  "status": "ready",
  "videoId": "uuid-del-video"
}
```

O si está procesando:

```json
{
  "status": "processing",
  "videoId": "uuid-del-video"
}
```

## Integración del Chatbot

El chatbot está integrado mediante `@n8n/chat` y aparece como un widget flotante en la esquina inferior derecha. Proporciona asistencia sobre:

- Estrategias de contenido para redes sociales
- Tips para crear publicaciones efectivas
- Buenas prácticas según la audiencia objetivo
- Orientación sobre tonos y formatos

Para configurarlo:

1. Crea un workflow en n8n con un nodo "Chat Trigger"
2. Configura el agente de IA con acceso a los documentos en `/docs` (opcional, para RAG)
3. Copia la URL del webhook del Chat Trigger
4. Configura la variable de entorno `NEXT_PUBLIC_N8N_CHAT_WEBHOOK`

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── content/
│   │   │   │   ├── script/route.ts      # Generación de guiones
│   │   │   │   ├── image/route.ts       # Generación de imágenes
│   │   │   │   ├── video/route.ts       # Generación de videos
│   │   │   │   ├── video/download/route.ts  # Descarga de videos
│   │   │   │   └── sentiment/route.ts   # Análisis de sentimiento
│   │   │   └── history/route.ts         # Consulta de historial
│   │   ├── globals.css                  # Estilos globales
│   │   ├── layout.tsx                   # Layout principal
│   │   └── page.tsx                     # Dashboard (cliente)
│   ├── components/
│   │   └── ContentChatWidget.tsx        # Widget del chatbot
│   ├── lib/
│   │   ├── db.ts                        # Conexión MongoDB
│   │   ├── n8n.ts                       # Cliente n8n con polling
│   │   └── content-service.ts           # Servicio de persistencia
│   ├── models/
│   │   └── ContentItem.ts               # Schema Mongoose
│   └── types/
│       └── content.ts                   # Tipos TypeScript
├── docs/                                # Documentos para RAG del chatbot
│   ├── audience_strategies.txt
│   ├── growth_dos_donts.txt
│   ├── overview.txt
│   ├── prompt_guidelines.txt
│   └── social_post_tips.txt
└── docker-compose.yml                   # Servicios Docker
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con hot reload |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Linting con ESLint |

## Configuración de n8n

### Flujo de Video

1. Recibe el webhook con `{ type: "video", scenes, config }`
2. Llama a la API de short-video-maker (`POST /api/short-video`)
3. Espera la generación o retorna el estado de procesamiento
4. Responde con `{ status, videoId }`

### Flujos de Contenido (Script, Image, Sentiment)

1. Recibe el webhook con `{ type, prompt }`
2. Procesa con el modelo de IA correspondiente
3. Retorna `{ status: "completed", result: {...} }`

## Notas Técnicas

- **Polling de Videos**: El frontend hace polling cada 5 segundos (máx. 5 minutos) hasta que el video esté listo.
- **TTS**: short-video-maker usa Kokoro TTS que solo soporta inglés actualmente.
- **Videos de Fondo**: Se obtienen de Pexels usando los `searchTerms` de cada escena.
- **Memoria**: short-video-maker requiere al menos 4GB de RAM.
