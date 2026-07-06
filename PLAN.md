# PLAN: Migrate Extraction/Enrichment to Kilo Gateway

## Goal

Replace Gemini (`@google/genai`) with **Kilo Gateway** (OpenAI-compatible) in the
mining pipeline:

- **Event extraction** (`event-extractor.ts`) → done, uses `minimax/minimax-m3`
- **Event enrichment** (`event-enricher.ts`) → uses `minimax/minimax-m3`

Two phases, done sequentially. Phase 2 does not start until Phase 1 is manually
verified against real mining runs.

Out of scope for both phases: `event-deduplicator.ts` (semantic dedup) and
`event-moderator.ts` (user-submitted content safety check) — both keep using
Gemini. Not part of this task.

## Background (confirmed via research)

- Kilo Gateway base URL: `https://api.kilo.ai/api/gateway`
- Chat completions endpoint: `POST /chat/completions`, standard OpenAI request/response shape
- Auth header: `Authorization: Bearer $KILO_API_KEY`
- Model: `minimax/minimax-m3` — lists `response_format` in supported parameters
  (structured outputs supported)
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

- The `openai` npm SDK (`^6.45.0`) is already a dependency of `packages/api` —
  used as the client for Kilo Gateway by overriding `baseURL`.

## Phase 1 — Event Extraction (done)

Implemented and shipped across commits `1dcc0eb`, `07283f4`, `6edebf0`:

- **Client**: `packages/api/src/utils/llm-client.ts` exports `getKiloClient()`,
  a lazily-constructed singleton `OpenAI` client
  (`baseURL: "https://api.kilo.ai/api/gateway"`, `apiKey: process.env.KILO_API_KEY`).
  Shared by extraction now and enrichment in Phase 2.
- **Schema**: `packages/api/src/event-schema.ts` exports `getCategorySlugs()` /
  `getCitySlugs()` (cached DB-backed slug loaders — this is what fixed the
  category/city enum drift bug in `1dcc0eb`), `buildEventSchema(categorySlugs, citySlugs)`
  (strict JSON Schema, `additionalProperties: false`, all 12 fields required,
  `Price`/`image_url` as `["type", "null"]` unions), and
  `buildEventResponseFormat(categorySlugs, citySlugs)` (the `response_format`
  envelope). These are functions, not static exports, because the enum values
  must reflect live DB content on every call.
- **Extractor**: `packages/api/src/utils/event-extractor.ts` calls
  `kiloClient.chat.completions.create({ model: "minimax/minimax-m3", messages: [...], response_format: buildEventResponseFormat(...) })`,
  parses `completion.choices[0]?.message?.content`, and classifies errors via
  `error instanceof OpenAI.APIError` + `.status` (401/429/408) rather than
  substring-matching Gemini's error text. Function signature/return shape
  (`{ success, events?, error? }`) unchanged from the Gemini version.
- **Tests**: `packages/api/tests/event-extractor.spec.ts` mocks
  `../src/utils/llm-client` (`getKiloClient` returns a fake
  `{ chat: { completions: { create: jest.fn() } } }`) and uses
  `OpenAI.APIError.generate(...)` to construct realistic API errors for the
  error-classification tests.
- **Env**: `KILO_API_KEY` added to `packages/api/.env.example`; `GOOGLE_API_KEY`
  kept (still used by dedup/moderation/enrichment-until-Phase-2).

Phase 1 has been manually verified against real mining runs (per user
confirmation) — Phase 2 is cleared to start.

## Phase 2 — Event Enrichment (MiniMax M3)

### 2.1 Rewrite `packages/api/src/utils/event-enricher.ts`

- Replace `GoogleGenAI`/`Type` import and `new GoogleGenAI({})` usage with the
  shared `getKiloClient()` from `./llm-client` (already exists from Phase 1 —
  reused here, no changes needed to that file).
- Convert the inline `enrichmentSchema` (currently Gemini-style
  `Type.OBJECT`/`nullable: true`) to plain strict JSON Schema:
  - `title`, `description`, `location`, `address` → `"type": ["string", "null"]`
  - `Price` → `"type": ["number", "null"]`
  - `date_time_confirmed` → `"type": "boolean"`
  - `confirmation_reason` → `"type": "string"`
  - `additionalProperties: false`
  - `required` must list **all 6 keys** (strict mode requires every property in
    `required` even when nullable — nullability comes from the type union, not
    from omission).
  - Wrap in a `response_format` envelope analogous to
    `buildEventResponseFormat` — e.g. a local `enrichmentResponseFormat` object
    with `json_schema.name: "event_enrichment"`, `strict: true`. Since this
    schema has no dynamic enum content (unlike the extraction schema), it can
    be a static const, not a builder function.
- Replace the `ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt, config: { responseMimeType, responseSchema } })`
  call with:
  ```ts
  const completion = await getKiloClient().chat.completions.create({
    model: "minimax/minimax-m3",
    messages: [{ role: "user", content: prompt }],
    response_format: enrichmentResponseFormat,
  })
  const responseText = completion.choices[0]?.message?.content
  ```
- Update error handling: catch `OpenAI.APIError` and classify by `.status`
  (401/429/408) the same way `event-extractor.ts` does, instead of the current
  generic `error instanceof Error ? error.message : 'Unknown error'` fallback —
  for consistency with the extractor and to give clearer log messages. Keep the
  final catch-all for non-`Error`/non-`APIError` throwables ("Unknown error").
- No response-text change needed beyond the parse source
  (`completion.choices[0]?.message?.content` instead of `response.text`) — the
  existing `JSON.parse` + field-extraction logic (`enrichedFields` loop,
  `dateTimeConfirmed`, `confirmationReason` defaulting) stays as-is.
- Keep unchanged: the Spanish-language prompt content (including the 08:00/00:00
  unknown-time exception logic and the mandatory `confirmation_reason`
  instruction), the `EnrichmentResult` interface, and the function signature
  `enrichEventFromHtml(pageHtml, originalEvent, eventUrl)` — this is called
  as-is from `event-processor.ts:347` and mocked directly in tests, so no
  changes needed at either call site.

### 2.2 Update tests: `packages/api/tests/event-enricher.spec.ts`

- Replace the `jest.mock('@google/genai', ...)` block with a mock of
  `../src/utils/llm-client` (`getKiloClient: jest.fn()` returning
  `{ chat: { completions: { create: jest.fn() } } }`), matching the pattern in
  `event-extractor.spec.ts`.
- Update all mock response objects from `{ text: JSON.stringify(...) }` to
  `{ choices: [{ message: { content: JSON.stringify(...) } }] }`.
- Update the "no response" test's expected error message (currently
  `'No response from Gemini'`) and the API-error test to use
  `OpenAI.APIError.generate(...)` (see `event-extractor.spec.ts`'s
  `makeApiError` helper) instead of a plain `Error('API error')`, so the new
  `.status`-based classification is actually exercised.
- All test *assertions* on `result.success` / `result.dateTimeConfirmed` /
  `result.enrichedFields` / `result.confirmationReason` stay the same — the
  function's external contract is unchanged.

### 2.3 Manual verification

- Manually trigger mining jobs that exercise enrichment (i.e. events with a
  distinct `event_url` different from `source_url`).
- Confirm in logs (`[Procesador de Eventos]` audit line: title/date/time/confirmed/razón)
  that enrichment output is sane, `confirmationReason` is always populated,
  and the `active` flag (driven by `dateTimeConfirmed`) is being set correctly.
- Spot-check a few enriched events in the DB/admin panel against their source
  detail pages.

## Cross-cutting notes

- **Gemini is not fully removed**: `GOOGLE_API_KEY`, `@google/genai`, and
  Gemini calls remain for `event-deduplicator.ts` and `event-moderator.ts`.
  Do not remove the `@google/genai` dependency or `GOOGLE_API_KEY` env var.
- **`.env.example` comment cleanup**: the existing Kilo Gateway section header
  in `packages/api/.env.example` says "DeepSeek models" — this is stale (no
  DeepSeek model was ever used; both extraction and enrichment use
  `minimax/minimax-m3`). Update the comment when touching this file in Phase 2.
- **`OVERVIEW.md` update**: after Phase 2 is complete, note in the relevant
  section that extraction/enrichment both run on Kilo Gateway
  (`minimax/minimax-m3`), not Gemini — Gemini remains only for dedup/moderation.
- **No behavior change to dedup gating, timezone conversion, or the
  three-dedup-layer pipeline in `event-processor.ts`** — this migration is
  scoped strictly to swapping the LLM client/model in the enricher, not
  touching orchestration logic.