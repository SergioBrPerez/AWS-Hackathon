# Agent Locally — Asistente Gastronómico Inteligente

Demo del Seminario & Hackathon de Agentes de IA en AWS (UC3M). Ver `SEMINARIO AWS.pdf`.

**Stack:** Next.js (Vercel) · Supabase (PostgreSQL + pgvector) · Vercel AI SDK con proveedor intercambiable (Gemini / Amazon Bedrock) · Leaflet + OpenStreetMap.

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # y rellenar claves
npm run dev                  # http://localhost:3000
```

## Estructura

- `src/app/` — pantallas y API routes
- `src/lib/ai/model.ts` — selección de proveedor de IA (`AI_PROVIDER=google|bedrock`)
- `src/lib/supabase/` — clientes de Supabase
- `supabase/migrations/` — esquema SQL versionado
