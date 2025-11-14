# Social Content Studio

Panel en Next.js orientado a equipos de social media para orquestar la generación de guiones, propuestas visuales, (futuros) videos y análisis de sentimiento a través de una automatización en n8n. Cada resultado exitoso se guarda en MongoDB para facilitar el seguimiento del contenido creado.

## Características principales

- UI profesional con tarjetas para cada flujo: guiones, imágenes, videos (placeholder) y analizador de sentimiento.
- Conexión con un webhook de n8n enviando `{ type, prompt }` según la operación solicitada.
- Sistema de polling configurable (`N8N_POLL_INTERVAL_MS` / `N8N_POLL_TIMEOUT_MS`) hasta que n8n retorne el resultado final.
- Historial persistido en MongoDB y consultado desde `/api/history` para mostrar ejecuciones recientes.
- Arquitectura con API Routes (App Router) que centralizan validaciones, armado de prompts y persistencia.
- Docker Compose para levantar MongoDB localmente.

## Requisitos

- Node.js 18+
- npm 9+
- Docker + Docker Compose (para la base de datos)

## Configuración rápida

1. **Variables de entorno**

   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

   Completa en `.env.local`:

   - `N8N_WEBHOOK_URL`: URL pública del webhook de n8n.
   - `MONGODB_URI`: cadena de conexión (ej. `mongodb://localhost:27017/content_studio`).
   - (Opcional) `MONGODB_DB`, `N8N_POLL_INTERVAL_MS`, `N8N_POLL_TIMEOUT_MS`.

2. **MongoDB en Docker**

   ```bash
   cd ..
   docker compose up -d mongodb
   ```

   Detener: `docker compose down`.

3. **Instalar dependencias y ejecutar**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   La app quedará disponible en [http://localhost:3000](http://localhost:3000).

## Endpoints de la API interna

| Método | Ruta                     | Descripción                                          |
| ------ | ------------------------ | ---------------------------------------------------- |
| POST   | `/api/content/script`    | Genera un guion; espera `{ topic, tone }`.           |
| POST   | `/api/content/image`     | Genera propuesta visual; espera `{ description, goals[] }`. |
| POST   | `/api/content/sentiment` | Analiza sentimiento; espera `{ text }`.              |
| GET    | `/api/history?limit=12`  | Devuelve historial reciente persistido en MongoDB.   |

Cada POST arma un `prompt` con las opciones suministradas y envía a n8n un payload:

```json
{
  "type": "script" | "image" | "sentiment",
  "prompt": "Texto con instrucciones, tono, objetivos, etc."
}
```

Se espera que el webhook retorne:

```json
{ "status": "pending", "taskId": "xyz" }
```

o directamente:

```json
{ "status": "completed", "result": { ... } }
```

Cuando llega un `taskId`, el servidor consulta periódicamente el mismo webhook con `?taskId=...` hasta recibir `status: "completed"` o hasta que expire el timeout configurado.

## Estructura relevante

```
frontend/
├─ src/
│  ├─ app/
│  │  ├─ api/content/{script,image,sentiment}/route.ts  # Endpoints con validaciones y triggers a n8n
│  │  ├─ api/history/route.ts                           # Consulta de historial
│  │  └─ page.tsx                                       # Dashboard principal (cliente)
│  ├─ lib/db.ts                                         # Conexión reutilizable a MongoDB
│  ├─ lib/n8n.ts                                        # Llamada + polling al webhook
│  ├─ lib/content-service.ts                            # Persistencia/lectura de contenido
│  ├─ models/ContentItem.ts                             # Schema Mongoose del historial
│  └─ types/content.ts                                  # Tipos compartidos
└─ docker-compose.yml (en raíz del repo)                # Servicio MongoDB
```

## Scripts útiles

- `npm run dev`: entorno local con hot reload.
- `npm run build`: build de producción.
- `npm run start`: sirve el build en modo producción.
- `npm run lint`: linting con ESLint/Next.

## Próximos pasos sugeridos

- Completar la integración de videos cuando definas el flujo en n8n.
- Ajustar el parseo de `result` si el webhook retorna estructuras distintas (por ejemplo, URLs firmadas, base64, puntuaciones específicas).
- Añadir autenticación si necesitas segmentar el acceso al panel.
