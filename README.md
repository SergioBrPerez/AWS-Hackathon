# 🍽️ Agent Locally — Asistente Gastronómico Inteligente

> Un agente de IA que lee la carta por ti y te dice **qué plato puede pedir cada persona de la mesa**, incluso cuando hay celíacos, veganos, alergias o un embarazo en el mismo grupo.

Proyecto del **Seminario & Hackathon de Agentes de IA en AWS · UC3M**.
Equipo: Sergio Brigidano · Lucía Liu Wang · Carlos Velázquez.
Documento de diseño completo: [`SEMINARIO AWS.pdf`](./SEMINARIO%20AWS.pdf).

---

## 1. El problema

Comer fuera con restricciones alimentarias es lento y arriesgado, y **en grupo el problema se multiplica**: una persona celíaca, una embarazada, un vegetariano y alguien con poco presupuesto en la misma mesa.

Las plataformas actuales (Google Maps, TheFork, TripAdvisor) fallan en cuatro puntos:

| # | Limitación actual | Ejemplo |
|---|---|---|
| 1 | **Filtran por local, no por plato.** Un restaurante "con opciones vegetarianas" puede tener solo una ensalada. | No sabes *qué* puede pedir cada persona. |
| 2 | **No entienden matices no estandarizados**, como el embarazo. Solo existen etiquetas para los 14 alérgenos oficiales. | Nadie avisa de que el tiramisú lleva huevo crudo y alcohol, o la salsa César anchoas y yema cruda. |
| 3 | **Descartan platos que se podrían adaptar.** No distinguen un ingrediente estructural de uno retirable. | Huevos rotos *con chorizo* → basta pedirlos sin chorizo. Una lasaña boloñesa, en cambio, no tiene arreglo. |
| 4 | **No ayudan en la mesa.** Con la carta delante, sigues preguntando al camarero plato por plato. | — |

## 2. Nuestra solución

Una **web app mobile-first** con un **agente de IA** que actúa como *mediador gastronómico y auditor de cartas*, antes de salir y una vez sentados.

### Dos modos de uso

**🔎 Modo 1 — Buscar restaurante (antes de ir)**
- Búsqueda individual o **"Mesa de grupo"** con un perfil por comensal.
- Restricciones estrictas (chips) + preferencias en lenguaje natural (*"italiano o tapas, nada de fritos ni picante"*) + presupuesto (€ / €€ / €€€).
- **Motor de aproximación:** si ningún sitio encaja al 100 %, el agente no devuelve "0 resultados", sino las mejores alternativas y el compromiso que implican (*"cumple para 3 de vosotros y tiene 4 platos adaptables para la persona vegana"*).

**🍽️ Modo 2 — Estoy en el restaurante**
- Eliges el local de la lista, **haces una foto a la carta** (hasta 4 páginas) o **pegas su texto**, y el agente la clasifica con un **semáforo por comensal**:
  - 🟢 **Apto tal cual**
  - 🟡 **Apto con modificación**: *"Pedir sin chorizo (huevos y patatas son 100 % aptos)"*
  - 🔴 **No recomendado**, con el motivo del riesgo

### Capacidades del agente

- **Auditoría profunda de ingredientes y embarazo:** revisa *todos* los ingredientes y, si el plato no los detalla, **infiere los probables** a partir del nombre y la descripción.
- **Smart Removal:** decide si un plato se vuelve apto quitando un único ingrediente superficial o una guarnición.
- **Mapa y filtro económico:** distancia, % de compatibilidad del grupo y rango de precio de un vistazo.
- **Memoria colectiva:** cada elección confirmada se registra. Así, grupos con un perfil similar ven *"Elegido por 9 grupos con perfil celíaco + embarazo"*.

### Modelo de negocio
Los restaurantes pueden **enriquecer su carta** (ingredientes, notas de cocina) y **pagar por aparecer destacados** (campo `patrocinado`), siempre sin alterar el semáforo de seguridad.

---

## 3. Cómo funciona

### Arquitectura

```mermaid
flowchart TD
    U["📱 Usuario<br/>Web mobile-first (Vercel)"] --> API["Next.js API Routes<br/>+ Vercel AI SDK"]
    U --> MAP["🗺️ Leaflet + OpenStreetMap"]
    API --> LLM{"🧠 Agente de IA<br/>AI_PROVIDER"}
    LLM -->|1º si hay credenciales| BR["Amazon Bedrock<br/>(Claude)"]
    LLM -->|respaldo| GE["Google Gemini"]
    LLM --> T["🔧 4 herramientas<br/>(function calling)"]
    T --> DB[("Supabase<br/>PostgreSQL + pgvector")]
```

**Por qué esta arquitectura:** las credenciales de AWS del workshop son temporales. El agente se conecta a través del **Vercel AI SDK** con una cadena de modelos: usa Claude en Amazon Bedrock mientras haya credenciales y, si caducan o fallan, pasa solo a Gemini, sin tocar código. Los datos viven en Supabase, fuera de AWS, y la demo sigue funcionando después del hackathon.

### Flujo de una búsqueda en grupo (Modo 1)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as Agente IA
    participant DB as Supabase
    U->>A: 4 comensales (celíaca, embarazada, vegetariano, €€) + "nada de fritos"
    A->>DB: buscar_candidatos(presupuesto_max=2, "sin fritos")
    DB-->>A: restaurantes candidatos
    loop por cada candidato
        A->>DB: auditar_carta_grupo(restaurante, perfiles)
        DB-->>A: platos + ingredientes + nota_cocina
        Note over A: clasifica cada plato 🟢🟡🔴 por comensal
    end
    A->>DB: consultar_experiencia_previa("celiaco+embarazo+vegetariano")
    DB-->>A: "elegido por N grupos"
    A-->>U: ranking + % de encaje + explicación del compromiso
    U->>A: Confirmar elección
    A->>DB: registrar_feedback_eleccion(...)  ➜ memoria colectiva
```

### Herramientas del agente

| Tool | Qué hace |
|---|---|
| `buscar_candidatos(presupuesto_max, preferencias_texto)` | Filtra restaurantes por precio y afinidad culinaria (SQL + búsqueda semántica). |
| `auditar_carta_grupo(restaurante_id, lista_perfiles)` | Cruza ingredientes y `nota_cocina` de cada plato con cada comensal → 🟢 / 🟡 / 🔴. |
| `consultar_experiencia_previa(firma_perfil)` | Mira si grupos con restricciones equivalentes eligieron ese local, y cuántas veces. |
| `registrar_feedback_eleccion(firma_perfil, restaurante_id, platos)` | Al pulsar "Confirmar elección", suma 1 al contador para reforzar futuras recomendaciones. |

### Cómo decide el semáforo

El semáforo combina **reglas en código** (rápidas, deterministas y conservadoras) con la **IA solo para los casos dudosos**, en una única llamada por restaurante ([`src/lib/semaforo/`](src/lib/semaforo/)). Si la IA falla, el plato queda en 🔴 por seguridad.

Para cada plato y cada comensal:
1. **¿Hay ingredientes?** Si la carta no los da, el agente infiere los típicos del plato (p. ej., cocido madrileño → garbanzos, carnes, chorizo, tocino…) y lo indica.
2. **¿Algún ingrediente choca con la restricción?** Alérgenos declarados + reglas propias (embarazo: lácteos sin pasteurizar, carne/pescado crudo, embutido curado, huevo poco hecho, alcohol en salsas).
3. **Si choca, ¿se puede retirar?** Solo si es superficial (`permite_modificacion` + `nota_cocina`: *"el chorizo se añade al final"*) → 🟡 con instrucción literal para el camarero. Si es estructural (carne en el ragú, harina en el rebozado) → 🔴.

### Modelo de datos (Supabase)

```mermaid
erDiagram
    restaurantes ||--o{ platos : tiene
    restaurantes ||--o{ historial_elecciones : "elegido en"
    restaurantes {
        uuid id PK
        text nombre
        text tipo_cocina
        int rango_precio "1=€ 2=€€ 3=€€€"
        float latitud
        float longitud
        bool patrocinado
        vector embedding
    }
    platos {
        uuid id PK
        uuid restaurante_id FK
        text nombre
        text categoria
        text[] ingredientes
        text[] alergenos_declarados
        bool permite_modificacion
        text nota_cocina
        vector embedding
    }
    historial_elecciones {
        uuid id PK
        text firma_perfil "embarazo+sin_gluten"
        uuid restaurante_id FK
        int contador_selecciones
        uuid[] platos_validados
    }
```

---

## 4. Stack

| Capa | Tecnología |
|---|---|
| Frontend + backend ligero | Next.js 15 (App Router) + TypeScript + Tailwind, desplegado en **Vercel** |
| IA | **Vercel AI SDK**: Amazon Bedrock (Claude Opus 5.5) como principal · Google Gemini de respaldo |
| Datos | **Supabase**: PostgreSQL + pgvector (embeddings `gte-small`) |
| Mapa | Leaflet + OpenStreetMap (sin API key) |

## 5. Puesta en marcha

**Requisitos:** Node 20+, una cuenta de Supabase y una API key de Google AI Studio.

```bash
npm install
cp .env.example .env.local     # rellenar (ver comentarios dentro del archivo)
```

**Base de datos.** En Supabase, abre **SQL Editor → New query** y ejecuta, por este orden:
1. [`supabase/migrations/0001_esquema_inicial.sql`](supabase/migrations/0001_esquema_inicial.sql): tablas, función y seguridad.
2. [`supabase/seed.sql`](supabase/seed.sql): 12 restaurantes ficticios de Madrid con 72 platos de prueba.

```bash
npm run db:check      # comprueba claves, tablas y datos
npm run ia:check      # qué modelos de IA responden (Bedrock / Gemini) y cuánto tardan
npm run test:reglas   # prueba el motor de reglas del semáforo (sin IA)
npm run agente -- "Somos 2: Ana celíaca y Bea vegana, presupuesto €"   # habla con el agente
npm run carta -- foto-carta.jpg   # lee una carta (foto o .txt) y muestra el semáforo
npm run dev           # http://localhost:3000
```

### Modelos de IA: cadena de respaldo

La app prueba los modelos **en orden** y salta al siguiente si uno falla (credenciales caducadas, cuota agotada, saturación o tiempo de espera de `AI_TIMEOUT_S`):

1. **Amazon Bedrock · Claude** (`BEDROCK_MODEL_ID`): solo si hay credenciales AWS en `.env.local`. Las del workshop son **temporales**; para renovarlas, ejecutar `aws configure export-credentials --format env` en la terminal del workshop.
2. **Google Gemini** (`GEMINI_MODEL_ID` y luego `GEMINI_FALLBACK_MODELS`).

Un modelo que falla se salta durante un rato (10 min si son credenciales, 30 s si es saturación). `npm run ia:check` muestra qué modelos responden ahora mismo.

### Estructura del repo

```
src/app/                 Pantallas y API routes
src/lib/ai/model.ts      Cadena de modelos de IA: Bedrock → Gemini
src/lib/agente/          Herramientas del agente y prompt de sistema
src/lib/semaforo/        Motor de reglas, auditoría con IA de los casos dudosos y lectura de cartas (foto/texto)
src/lib/restricciones.ts Restricciones soportadas y firma de perfil
src/lib/supabase/        Clientes (navegador / servidor) y tipos
supabase/migrations/     Esquema SQL versionado
supabase/seed.sql        Datos de demo
scripts/                 Comprobación de la BD y pruebas de reglas y agente
```

## 6. Hoja de ruta

- [x] **Fase 0:** esqueleto Next.js, selector de proveedor de IA, pantalla de inicio
- [x] **Fase 1:** esquema Supabase + datos de demo
- [x] **Fase 2:** agente con las 4 herramientas (`/api/chat`) + motor de reglas del semáforo
- [x] **Fase 3:** Modo 1: configurador de grupo + resultados en lista y mapa, con el progreso del agente en vivo
- [x] **Fase 4:** Modo 2 (foto de la carta, texto pegado o restaurante de la lista) + ficha del local con carta semáforo y "Confirmar elección"
- [ ] **Fase 5:** memoria colectiva + búsqueda semántica (RAG)
- [ ] **Fase 6:** despliegue en Vercel

> ⚠️ **Aviso:** demo académica con restaurantes ficticios. Las recomendaciones del agente no sustituyen la confirmación con el personal del restaurante en caso de alergias graves.
