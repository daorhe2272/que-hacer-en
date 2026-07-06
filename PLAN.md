# PLAN: Migrate Extraction/Enrichment to Kilo Gateway (DeepSeek)

## Goal

Replace Gemini (`@google/genai`) with **Kilo Gateway** (OpenAI-compatible) in the
mining pipeline:

- **Event extraction** (`event-extractor.ts`) → `deepseek/deepseek-v4-pro`
- **Event enrichment** (`event-enricher.ts`) → `deepseek/deepseek-v4-flash`

Two phases, done sequentially. Phase 2 does not start until Phase 1 is manually
verified against real mining runs.

Out of scope for both phases: `event-deduplicator.ts` (semantic dedup) and
`event-moderator.ts` (user-submitted content safety check) — both keep using
Gemini. Not part of this task.

## Background (confirmed via research)

- Kilo Gateway base URL: `https://api.kilo.ai/api/gateway`
- Chat completions endpoint: `POST /chat/completions`, standard OpenAI request/response shape
- Auth header: `Authorization: Bearer $KILO_API_KEY`
- Model slugs: `deepseek/deepseek-v4-pro`, `deepseek/deepseek-v4-flash` — both list
  `response_format` in their supported parameters (structured outputs supported)
- Structured output contract (OpenAI-style, strict mode):

  ```json
  {
    "type": "json_schema",
    "json_schema": {
      "name": "schema_name",
      "schema": {
        "type": "object",
        "properties": { "...": "..." },
        "required": ["field1", "field2"],
        "additionalProperties": false
      },
      "strict": true
    }
  }
  ```

  Strict mode requires every property in `required`, `additionalProperties: false`
  at every object level, and nullable fields expressed as `"type": ["string", "null"]`
  (no separate `nullable: true` flag like Gemini's schema format).

- The `openai` npm SDK is the standard client for any OpenAI-compatible endpoint
  (works against Kilo Gateway by overriding `baseURL`). It is **not** currently a
  dependency of `packages/api` — needs adding.

## Phase 1 — Event Extraction (DeepSeek V4 Pro)

### 1.1 Dependencies

- `pnpm add --filter @que-hacer-en/api openai`

### 1.2 Env vars

Add to `packages/api/.env.example` (new section, keep `GOOGLE_API_KEY` — still
needed by `event-deduplicator.ts` and `event-moderator.ts`):

```
# --- Kilo Gateway (DeepSeek models for mining pipeline) --------------------
KILO_API_KEY=your-kilo-gateway-key
```

Add `KILO_API_KEY` to the real `.env` (not committed) and to Cloud Run runtime
env vars (see `OVERVIEW.md` §12 runtime env table — add a row there too).

### 1.3 New shared Kilo client helper

Create `packages/api/src/utils/kilo-client.ts`:

- Exports a lazily-constructed singleton `OpenAI` client configured with
  `baseURL: "https://api.kilo.ai/api/gateway"` and `apiKey: process.env.KILO_API_KEY`.
- Rationale: both extraction and (later) enrichment need the same client
  construction; avoids duplicating baseURL/key wiring in two files.

### 1.4 Rewrite `packages/api/src/event-schema.ts`

Convert `eventSchema` from Gemini's `Type.OBJECT`/`nullable` shape to plain
JSON Schema, strict-mode compliant:

- `type: "object"` instead of `Type.OBJECT`, `type: "string"` instead of `Type.STRING`, etc.
- `Price` and `image_url` become `"type": ["number", "null"]` / `"type": ["string", "null"]`
  instead of `nullable: true`.
- Add `"additionalProperties": false` to both the outer object and the `items` object.
- Drop `propertyOrdering` (Gemini-specific, no equivalent/needed in OpenAI schema).
- Keep `required` listing all keys (already the case — strict mode compatible).
- `ExtractedEvent` / `EventExtractionResponse` TypeScript interfaces are unchanged
  (schema shape describes the same data).
- Wrap the schema in the `response_format` envelope expected by the SDK, e.g.
  export a `eventResponseFormat` object:
  ```ts
  export const eventResponseFormat = {
    type: "json_schema",
    json_schema: {
      name: "event_extraction",
      schema: eventSchema,
      strict: true,
    },
  } as const
  ```

### 1.5 Rewrite `packages/api/src/utils/event-extractor.ts`

- Replace `import { GoogleGenAI } from "@google/genai"` with the shared Kilo
  client from `kilo-client.ts`.
- Replace `ai.models.generateContent(...)` call with:
  ```ts
  const completion = await kiloClient.chat.completions.create({
    model: "deepseek/deepseek-v4-pro",
    messages: [{ role: "user", content: prompt }],
    response_format: eventResponseFormat,
  })
  const responseText = completion.choices[0]?.message?.content
  ```
- Keep the exact same function signature and return shape
  (`{ success, events?, error? }`) — this boundary is mocked by
  `data-sources.spec.ts`, `mining-utils.spec.ts` and does not need to change,
  so **no other files besides the extractor itself need edits for this phase**.
- Preserve existing error classification logic (API key / quota / timeout /
  generic) — adjust string matching if DeepSeek/OpenAI SDK error messages differ
  (e.g. OpenAI SDK throws `APIError` with `.status` — consider checking
  `error.status === 401` for auth, `429` for quota/rate, instead of substring
  matching on `error.message`, since that was tailored to Gemini's error text).
- Keep the prompt content itself unchanged (current-year hint, HTML content,
  instructions) — only the transport/client changes.

### 1.6 Update tests: `packages/api/tests/event-extractor.spec.ts`

- Replace the `jest.mock('@google/genai', ...)` block with a mock of the new
  `kilo-client.ts` module (or of the `openai` package directly — prefer mocking
  `kilo-client.ts` since that's the actual import surface `event-extractor.ts`
  will use).
- Mock shape: `{ chat: { completions: { create: jest.fn() } } }`.
- Update all mock response objects from `{ text: JSON.stringify(...) }` to
  `{ choices: [{ message: { content: JSON.stringify(...) } }] }`.
- Update error-scenario tests to match whatever error shape the `openai` SDK
  actually throws (verify empirically once the SDK is installed — likely
  `OpenAI.APIError` with `.status`/`.message`).
- All test *assertions* on `result.success`/`result.events`/`result.error`
  stay the same since the function's external contract is unchanged.

### 1.7 Manual verification (blocks Phase 2)

Before starting Phase 2:

- Set `KILO_API_KEY` in local `.env`.
- Run unit tests: `pnpm --filter @que-hacer-en/api test`.
- Manually trigger real mining jobs from the admin UI (`/admin` → Data Sources
  tab, both "run mining job" on a saved source and ad-hoc `mine-url`) against a
  few real target URLs.
- Confirm in logs (`[Event Extractor]`, `[Direct Mining]`, `[Mining]`) that:
  - Events are extracted with correct field values (title, date, time, slugs, etc.)
  - JSON parsing succeeds (no schema-shape mismatches from the strict-mode conversion)
  - Error handling still degrades gracefully on bad input
- Confirm downstream steps (dedup, enrichment via Gemini still, DB insert) keep
  working unchanged — this proves the extractor's output contract truly didn't
  change shape.
- Only proceed to Phase 2 once several real mining runs are confirmed clean.

## Phase 2 — Event Enrichment (DeepSeek V4 Flash)

Do not start until Phase 1 sign-off above.

### 2.1 Rewrite `packages/api/src/utils/event-enricher.ts`

- Replace `GoogleGenAI` import/usage with the shared `kilo-client.ts` client
  (already created in Phase 1 — reused here).
- Convert `enrichmentSchema` (currently inline Gemini-style `Type.OBJECT`) to
  plain JSON Schema + `response_format` envelope, same conversion pattern as
  §1.4:
  - `title`, `description`, `location`, `address` → `"type": ["string", "null"]`
  - `Price` → `"type": ["number", "null"]`
  - `date_time_confirmed` → `"type": "boolean"`
  - `confirmation_reason` → `"type": "string"`
  - `additionalProperties: false`, all 6 keys in `required` (strict mode needs
    every property required, even the nullable ones — nullability is expressed
    via the type union, not by omitting from `required`).
- Replace the `ai.models.generateContent(...)` call with
  `kiloClient.chat.completions.create({ model: "deepseek/deepseek-v4-flash", messages: [...], response_format: enrichmentResponseFormat })`.
- Parse `completion.choices[0]?.message?.content` instead of `response.text`.
- Keep the Spanish-language prompt content, the `EnrichmentResult` interface,
  and the function signature (`enrichEventFromHtml(pageText, originalEvent, eventUrl)`)
  unchanged — this is mocked directly in `event-processor.spec.ts`, so no
  changes needed there.
- Preserve the confirmationReason mandatory-field behavior and the
  08:00/00:00 unknown-time exception logic already encoded in the prompt.

### 2.2 Update tests: `packages/api/tests/event-enricher.spec.ts`

- Same mocking pattern change as §1.6: mock `kilo-client.ts` instead of
  `@google/genai`, update mock response shapes from `response.text` to
  `completion.choices[0].message.content`.

### 2.3 Manual verification

- Manually trigger mining jobs that exercise enrichment (i.e. events with a
  distinct `event_url` different from `source_url`).
- Confirm in logs (`[Procesador de Eventos]` audit line: title/date/time/confirmed/razón)
  that enrichment output is sane, `confirmationReason` is always populated,
  and `active` flag (`dateTimeConfirmed`) is being set correctly.
- Spot-check a few enriched events in the DB/admin panel against their source
  detail pages.

## Cross-cutting notes

- **Cost/model choice rationale**: DeepSeek V4 Pro replaces Gemini for the
  higher-stakes first-pass extraction (needs to parse arbitrary/messy HTML
  reliably); DeepSeek V4 Flash replaces Gemini for the cheaper, more
  constrained per-event enrichment pass — matches the "cheaper model" ask
  since Flash is the low-cost tier.
- **Gemini is not fully removed**: `GOOGLE_API_KEY`, `@google/genai`, and
  Gemini calls remain for `event-deduplicator.ts` and `event-moderator.ts`.
  Do not remove the `@google/genai` dependency or `GOOGLE_API_KEY` env var.
- **`OVERVIEW.md` update**: after Phase 2 is complete, update OVERVIEW.md's
  env var tables (§5 API env vars, §12 runtime env vars) to document
  `KILO_API_KEY`, and note in §"Database Architecture"/pipeline description
  (if such a section exists) that extraction/enrichment now use DeepSeek via
  Kilo Gateway rather than Gemini.
- **No behavior change to dedup gating, timezone conversion, or the
  three-dedup-layer pipeline in `event-processor.ts`** — this migration is
  scoped strictly to swapping the LLM client/model in the extractor and
  enricher, not touching orchestration logic.