# Plan: Project Context Preparation

## Objective

Read and internalize the project's foundational documents and the Gemini-based event extraction pipeline.

---

## How Gemini LLM Is Used to Extract Events from Websites

### High-Level Pipeline

The system uses a 3-step mining pipeline, orchestrated by `mining-utils.ts`:

```
URL → HTML Fetch → Gemini Extraction → DB Storage
```

### Step 1: HTML Fetching (`packages/api/src/utils/html-fetcher.ts`)

`fetchHtmlContent(url, options)` fetches the page HTML before handing it to Gemini.

- **Static-first strategy**: uses `undici` (not `node-fetch`) with relaxed SSL (`rejectUnauthorized: false`) and a 5-second timeout.
- **Dynamic fallback**: if the static HTML looks incomplete (SPA placeholders like `<div id="root"></div>`, loading indicators, `<1000 chars`), it falls back to **Puppeteer** (headless Chrome).
- **Cleanup**: scripts, styles, and style attributes are stripped from the HTML before passing it to Gemini, significantly reducing token usage.
- **Logging**: character count, word count, and estimated token count (chars/4) are logged before and after cleanup, plus the first 200 chars of the result.
- Returns `{ success, content (preview), fullHtml (full cleaned HTML), method ('static'|'dynamic') }`.

### Step 2: Gemini Extraction (`packages/api/src/utils/event-extractor.ts`)

`extractEventsFromHtml(html, sourceUrl)` sends the cleaned HTML to Gemini and returns structured events.

- Uses `@google/genai` SDK (`GoogleGenAI` class), initialized with `new GoogleGenAI({})` — relies on `GOOGLE_API_KEY` env var being set implicitly by the SDK.
- **Model**: `gemini-3.1-flash-lite`
- **Structured output**: passes `responseMimeType: "application/json"` and `responseSchema: eventSchema` in the config, so Gemini is forced to return valid JSON conforming to the schema.
- **Prompt**: tells the model the source URL, current year (for date inference), and asks it to extract all distinct events from the HTML.
- **Schema** (`packages/api/src/event-schema.ts`): each extracted event must have:
  - `source_url`, `event_url` (string)
  - `title`, `description` (string)
  - `date` (YYYY-MM-DD), `time` (HH:MM)
  - `location`, `address` (string)
  - `category_slug` (enum: `musica`, `arte`, `gastronomia`, `deportes`, `tecnologia`, `networking`, `cine`, `negocios`)
  - `city_slug` (enum: `bogota`, `medellin`, `cali`, `barranquilla`, `cartagena`)
  - `Price` (number | null)
  - `image_url` (string | null)
- **Error handling**: distinguishes API key errors, quota/rate-limit errors, timeout errors, JSON parse failures, missing `events` array — each returns a typed `{ success: false, error: string }`.
- Returns `{ success, events?, error? }`.

### Step 3: Event Processing & Storage (`packages/api/src/utils/event-processor.ts`)

`processExtractedEvents(extractedEvents[], adminUserId)` filters and saves events.

Per-event validation/filtering (events are **skipped** if):
1. Missing required fields (title, date, time, category_slug, city_slug).
2. Date is in the past (before today, Colombia UTC-5 timezone).
3. Date is more than 60 days in the future.
4. Duplicate detected via DB query matching normalized title + venue + date.

Accepted events are converted via `convertExtractedEventToDbFormat()` (maps `category_slug` → `category`, `city_slug` → `city`, forces `currency: 'COP'`, drops image if null) and stored with `createMinedEventDb()`:
- Looks up `city_id` and `category_id` by slug.
- Converts Colombia local time (UTC-5) to UTC manually (server-timezone-independent).
- Inserts into `events` table with **`active = false`** (mined events need admin review/activation).
- Stores `event_url` from the extraction.
- Handles tags (insert-or-ignore pattern).

### Content Moderation (`packages/api/src/utils/event-moderator.ts`)

A separate `moderateEventContent(title, description, location)` function also uses Gemini (`gemini-3.1-flash-lite`) with structured output to classify event content as `safe: boolean` with an optional `reason` (in Spanish). It checks for hate speech, violence, explicit content, political propaganda, religious proselytizing, and scams.
- Requires `GOOGLE_API_KEY` env var explicitly; if missing, **defaults to safe (fail-open)**.
- Also fails open on API errors (to avoid blocking legitimate users during outages).

### Entry Points

There are two ways mining is triggered:

| Entry point | Route | Auth |
|---|---|---|
| One-off URL (admin panel) | `POST /api/admin/mine-url` (`admin.ts`) | Admin JWT |
| Saved data source | `POST /api/data-sources/:id/mine` (`data-sources.ts`) | Admin JWT |

The admin mine-url endpoint also supports **streaming** via Server-Sent Events (`stream: true` in body), sending `{ status: 'progress' | 'completed' | 'failed' | 'end', message, eventsExtracted, eventsStored, eventsFailed }` events as the pipeline progresses.

The Next.js proxy layer for these:
- `POST /api/admin/mine-url` → `packages/web/src/app/api/admin/mine-url/route.ts` (uses `createProxyHandler`)
- `POST /api/data-sources/:id/mine` → `packages/web/src/app/api/data-sources/[id]/mine/route.ts`

### Key Environment Variable

| Variable | Where used |
|---|---|
| `GOOGLE_API_KEY` | Implicitly by `@google/genai` SDK in extractor; explicitly checked in moderator |

---

## Proposed Feature: Enhanced Mining Pipeline

### Overview

The full enhanced pipeline handles:
1. **Multi-URL extraction** — mine multiple source URLs in one run, collect all events
2. **Filtering** — past events and >60-day events (already implemented)
3. **Cross-batch + cross-DB deduplication** — exact-match DB check (existing), then semantic LLM dedup against both the batch itself and existing DB events
4. **Per-event enrichment + verification** — fetch the individual event URL, use LLM to improve data quality and auto-activate if date/time are confirmed

No orchestration framework (LangChain, etc.) is needed. Every step is a plain `async` TypeScript function. The pipeline is just sequential `await` calls — the complexity is managed through clean function boundaries.

---

### Step-by-step Pipeline (New Design)

```
[Multiple source URLs]
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1 — EXTRACTION (per source URL, run in parallel)      │
│   fetchHtmlContent(url)          → html-fetcher.ts          │
│   extractEventsFromHtml(html)    → event-extractor.ts       │
│   Collect all ExtractedEvent[]   → mining-utils.ts          │
└─────────────────────────────────────────────────────────────┘
        │  all raw events from all URLs
        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2 — FILTERING & DEDUPLICATION                         │
│   1. Filter: past events, >60d future, missing fields       │
│   2. Deduplicate within batch (same title+date+city)        │
│   3. DB exact-match duplicate check (existing)              │
│   4. LLM semantic duplicate check vs DB events (NEW)        │
│      — grouped by city+date, one LLM call per group        │
│      → event-deduplicator.ts (NEW)                         │
└─────────────────────────────────────────────────────────────┘
        │  clean, unique candidate events
        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3 — ENRICHMENT & VERIFICATION (per event)             │
│   For each event where event_url ≠ source_url:              │
│     fetchHtmlContent(event_url)  → html-fetcher.ts          │
│     enrichEventFromHtml(...)     → event-enricher.ts (NEW)  │
│     LLM enriches data + verifies date/time                  │
│     If date+time confirmed → mark for auto-activation       │
│   On fetch/LLM failure → keep original data, store inactive │
└─────────────────────────────────────────────────────────────┘
        │  enriched events with activation flags
        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4 — STORAGE                                           │
│   createMinedEventDb() with active=true or active=false     │
│   (already implemented, minor signature change)             │
└─────────────────────────────────────────────────────────────┘
```

---

### New File: `packages/api/src/utils/event-deduplicator.ts`

Handles semantic duplicate detection using Gemini as a judge.

**Exported interface:**
```ts
interface ExistingEventSummary {
  id: string
  title: string
  location: string
  date: string  // YYYY-MM-DD
}

interface SemanticDuplicateResult {
  candidateIndex: number
  isDuplicate: boolean
  duplicateOfId?: string
  reason?: string
}

export async function checkSemanticDuplicates(
  candidates: Array<{ index: number; title: string; location: string; date: string }>,
  existingEvents: ExistingEventSummary[]
): Promise<SemanticDuplicateResult[]>
```

**Behavior:**
- One Gemini call per invocation, with a prompt listing all `N` existing events and `M` candidates.
- Uses structured output (`responseSchema`) returning an array of `{ candidate_index, is_duplicate, duplicate_of_id?, reason? }`.
- On failure (API error, timeout, quota) → returns empty array (fail-open: no candidates are marked as duplicates, all proceed to storage as inactive).
- Model: `gemini-3.1-flash-lite`.

**How it's called from `event-processor.ts`** (pre-loop, batched):
1. After initial filtering, collect all valid candidates.
2. Query DB once per distinct `city_slug` for all future events (active + inactive).
3. Group both candidates and existing events by `city_slug + date`.
4. For each group where `existingEvents.length > 0`, call `checkSemanticDuplicates`.
5. Build a `Set<number>` of candidate indices flagged as duplicates.
6. Skip those in the storage loop.

**DB query for existing events:**
```sql
SELECT e.id, e.title, e.venue AS location,
       (e.starts_at AT TIME ZONE 'America/Bogota')::date::text AS date
FROM events e
JOIN cities c ON c.id = e.city_id
WHERE c.slug = $1
  AND (e.starts_at AT TIME ZONE 'America/Bogota')::date >= CURRENT_DATE
ORDER BY e.starts_at ASC
```
Includes both active and inactive to prevent storing duplicates of queued-for-review events.

---

### New File: `packages/api/src/utils/event-enricher.ts`

Handles per-event enrichment by visiting the individual event URL.

**Exported interface:**
```ts
interface EnrichmentResult {
  success: boolean
  enrichedEvent?: Partial<ExtractedEvent>
  dateTimeConfirmed: boolean  // true if LLM confirmed date+time match source extraction
  error?: string
}

export async function enrichEventFromHtml(
  html: string,
  originalEvent: ExtractedEvent,
  eventUrl: string
): Promise<EnrichmentResult>
```

**LLM behavior:**
- Prompt gives the model the original extracted event data and the individual page HTML.
- Asks it to:
  1. Improve any field where the detail page has **more specific or detailed information** (address, price, description, image_url, location — not date/time).
  2. Check whether the date and time on the detail page **match** the originally extracted values.
  3. Return the improved fields + a `date_time_confirmed: boolean`.
- Uses structured output with a schema derived from `ExtractedEvent` (all fields optional except `date_time_confirmed`).
- Model: `gemini-3.1-flash-lite`.

**Activation logic** (in `event-processor.ts`):
- `dateTimeConfirmed = true` → store with `active = true` (no admin review needed).
- `dateTimeConfirmed = false` → store with `active = false` (date/time mismatch, admin reviews).
- Enrichment fetch fails or LLM call fails → store original data with `active = false`.
- `event_url === source_url` (no distinct detail page) → skip enrichment, store with `active = false`.

---

### Changes to `packages/api/src/utils/mining-utils.ts`

**New exported function: `mineUrlsDirectlyStreaming`** (plural, multi-URL):

```ts
export async function mineUrlsDirectlyStreaming(
  urls: string[],
  userId: string,
  onProgress?: ProgressCallback
): Promise<MiningResult>
```

**Flow:**
1. Fetch + extract events from all URLs (can run in parallel with `Promise.all`, since fetching is I/O-bound and independent).
2. Merge all `ExtractedEvent[]` arrays.
3. Pass the merged array to `processExtractedEvents` (single call).

The existing single-URL functions (`mineUrlDirectly`, `mineUrlDirectlyStreaming`) are kept for backward compatibility — they can delegate to the new multi-URL function with a single-element array.

---

### Changes to `packages/api/src/utils/event-processor.ts`

`processExtractedEvents` gains two new phases inserted between the existing filtering and the storage step:

**Signature stays the same** — only internal logic changes:

```
Existing:  validate → date filter → isDuplicateEvent (DB) → store
New:       validate → date filter → dedup within batch → isDuplicateEvent (DB)
             → checkSemanticDuplicates (LLM, batched) → enrichEventFromHtml (LLM, per event)
             → store (with computed active flag)
```

New internal step — **within-batch deduplication**: before any DB or LLM calls, remove candidates that are exact duplicates of each other within the batch itself (same normalized title + city + date). This is a pure in-memory operation using a `Set`, costs nothing, and prevents wasted LLM enrichment calls on redundant events from overlapping source URLs.

`createMinedEventDb` gains an optional `active` parameter (currently always `false`) so enriched events can be stored as active.

---

### Changes to `packages/api/src/routes/admin.ts`

`POST /api/admin/mine-url` currently accepts a single URL. It should also accept an array:

```ts
// Body: { url: string, stream?: boolean }         ← existing, kept
// Body: { urls: string[], stream?: boolean }       ← new, multi-URL
```

Logic: if `urls` is present (array), delegate to `mineUrlsDirectlyStreaming`; if `url` (string) is present, use existing path (or delegate to the multi-URL function with a single-element array for DRY code).

---

### Token / Cost Analysis

**Deduplication LLM calls:**
- Compact event summary: ~60 tokens.
- Typical run: 10 extracted events across 5 dates, 80 existing city events → ~4 date groups with existing events → 4 LLM calls, ~600 tokens each → negligible cost.

**Enrichment LLM calls:**
- One call per event with a distinct `event_url` (i.e., most extracted events).
- Input: ~100 tokens (original event JSON) + cleaned individual page HTML (~2,000–5,000 tokens) + prompt overhead.
- Typical run: 10 events → 10 Gemini calls, ~3,000–5,000 tokens each → ~0.01 USD total with Flash pricing.
- Enrichment calls run **sequentially** (not in parallel) to avoid hammering both the Puppeteer browser pool and the Gemini rate limits.

---

### Detailed Implementation

---

#### File 1 (NEW): `packages/api/src/utils/event-deduplicator.ts`

**Purpose**: Semantic duplicate detection via Gemini. Called once per city+date group, not per individual event.

**Exported types and function:**
```ts
export interface ExistingEventSummary {
  id: string
  title: string
  location: string
  date: string  // YYYY-MM-DD Colombia
}

export interface SemanticDuplicateResult {
  candidateIndex: number
  isDuplicate: boolean
  duplicateOfId?: string
  reason?: string
}

export async function checkSemanticDuplicates(
  candidates: Array<{ index: number; title: string; location: string; date: string }>,
  existingEvents: ExistingEventSummary[]
): Promise<SemanticDuplicateResult[]>
```

**Internal logic:**
1. Build a prompt listing existing events (id, title, location, date) and candidate events (index, title, location, date). Instruct the model to determine per candidate whether it refers to the same real-world event as any existing entry, accounting for paraphrased titles and abbreviated venues.
2. Call Gemini with `responseMimeType: "application/json"` and a structured `responseSchema`:
   - Array of objects: `{ candidate_index: INTEGER, is_duplicate: BOOLEAN, duplicate_of_id: STRING (nullable), reason: STRING (nullable) }`
   - Required: `["candidate_index", "is_duplicate"]`
3. Parse response → return `SemanticDuplicateResult[]`.
4. **On any failure** (API error, quota, timeout, parse error) → log warning, return `[]` (fail-open: no candidates blocked, they proceed to storage as `active = false`).
5. Model: `gemini-3.1-flash-lite`. Initialize with `new GoogleGenAI({})` (same as `event-extractor.ts`).
6. Never called when `existingEvents.length === 0` or `candidates.length === 0` (caller guards).
7. Max ~150 lines.

---

#### File 2 (NEW): `packages/api/src/utils/event-enricher.ts`

**Purpose**: Per-event enrichment — fetches the individual event detail page and uses the LLM to improve field quality and verify date/time match.

**Exported types and function:**
```ts
export interface EnrichmentResult {
  success: boolean
  enrichedFields: Partial<Pick<ExtractedEvent,
    'title' | 'description' | 'location' | 'address' | 'Price' | 'image_url'>>
  dateTimeConfirmed: boolean
  error?: string
}

export async function enrichEventFromHtml(
  html: string,
  originalEvent: ExtractedEvent,
  eventUrl: string
): Promise<EnrichmentResult>
```

**Internal logic:**
1. Build a prompt providing the original event data (as JSON) and the detail page HTML. Instruct the model to:
   - For `title`, `description`, `location`, `address`, `Price`, `image_url`: return the detail-page value **only if more specific or detailed** than the original; otherwise return null/omit.
   - For `date` and `time`: do NOT return updated values. Instead, return `date_time_confirmed: true` if the detail page shows the same date and time as the original, `false` if they differ or the page has no date/time info.
2. Gemini response schema:
   - Object with optional fields: `title`, `description`, `location`, `address`, `Price` (NUMBER nullable), `image_url` (STRING nullable), plus required `date_time_confirmed: BOOLEAN`.
3. Merge only non-null returned fields onto `enrichedFields`.
4. **On any failure** → return `{ success: false, enrichedFields: {}, dateTimeConfirmed: false, error }`. Caller keeps original data and stores `active = false`.
5. Model: `gemini-3.1-flash-lite`. Initialize with `new GoogleGenAI({})`.
6. Does NOT modify `date`, `time`, `city_slug`, or `category_slug` — those are structural.
7. Max ~150 lines.

---

#### File 3 (MODIFY): `packages/api/src/utils/event-processor.ts`

**A. New private helper: `fetchExistingEventsForCity(citySlug: string): Promise<ExistingEventSummary[]>`**

Queries:
```sql
SELECT e.id, e.title, e.venue AS location,
       (e.starts_at AT TIME ZONE 'America/Bogota')::date::text AS date
FROM events e
JOIN cities c ON c.id = e.city_id
WHERE c.slug = $1
  AND (e.starts_at AT TIME ZONE 'America/Bogota')::date >= CURRENT_DATE
ORDER BY e.starts_at ASC
```
Returns both active and inactive future events. On query error → logs and returns `[]` (fail-open).

**B. New private helper: `deduplicateWithinBatch(events: ExtractedEvent[]): ExtractedEvent[]`**

Pure function. Removes candidates sharing the same `lowercase(title) + city_slug + date` within the batch (keeps first occurrence). Uses a `Set<string>` as a seen-key tracker. Normalization: lowercase + strip accents (same as existing `normalize()` in `repository.ts`).

**C. Modified: `createMinedEventDb`**

Add `active: boolean = false` parameter. Change the `INSERT` statement from hardcoded `false` to this parameter. All existing callers pass no argument → default `false` → no behavior change.

**D. Modified: `processExtractedEvents` — new internal flow:**

Signature stays identical. Internal restructuring:

```
STEP 1 (existing, per-event): validate required fields + date range filter
  → collects validCandidates[]

STEP 2 (NEW, in-memory): deduplicateWithinBatch(validCandidates)
  → collects uniqueCandidates[]

STEP 3 (existing, now a pre-pass): DB exact-match isDuplicateEvent for each uniqueCandidate
  → collects nonDbDuplicateCandidates[]

STEP 4 (NEW, batched before storage loop):
  → collect distinct city slugs from nonDbDuplicateCandidates
  → for each city: fetchExistingEventsForCity(citySlug)  [one DB query per city]
  → build Map<citySlug, ExistingEventSummary[]>
  → group nonDbDuplicateCandidates by citySlug+date
  → for each group where existingEvents.length > 0:
      checkSemanticDuplicates(candidatesInGroup, existingEventsForDate)
  → build Set<number> of candidate-array indices flagged as duplicates
  → collects semanticallyUniqueCandidates[]

STEP 5 (NEW, per event, sequential):
  → for each semanticallyUniqueCandidate:
      if event_url === source_url:
        active = false, use original data
      else:
        fetchResult = fetchHtmlContent(event_url)
        if !fetchResult.success:
          active = false, use original data
        else:
          enrichResult = enrichEventFromHtml(fetchResult.fullHtml, original, event_url)
          if !enrichResult.success:
            active = false, use original data
          else:
            merge enrichResult.enrichedFields onto event data
            active = enrichResult.dateTimeConfirmed

STEP 6 (existing): createMinedEventDb(eventData, adminUserId, eventUrl, active)
  → collect storedEvents[]
```

New imports needed in `event-processor.ts`: `checkSemanticDuplicates` from `event-deduplicator`, `enrichEventFromHtml` from `event-enricher`, `fetchHtmlContent` from `html-fetcher`.

**File size check**: current file is 297 lines. Estimated additions: ~100 lines for new helpers + ~60 lines for new steps in `processExtractedEvents`. Projected total: ~460 lines — within the 800-line limit.

---

#### File 4 (MODIFY): `packages/api/src/utils/mining-utils.ts`

**New exported function:**
```ts
export async function mineUrlsDirectlyStreaming(
  urls: string[],
  userId: string,
  onProgress?: ProgressCallback
): Promise<MiningResult>
```

**Flow:**
1. `onProgress?.('Iniciando minería de datos...')`
2. Fetch + extract all URLs in **parallel**:
   ```ts
   const allEvents = (await Promise.all(
     urls.map(url => fetchAndExtract(url, onProgress))
   )).flat()
   ```
   Private `fetchAndExtract(url, onProgress)` calls `fetchHtmlContent` then `extractEventsFromHtml`, returns `ExtractedEvent[]` (empty array on any per-URL failure, logs error without aborting other URLs).
3. `onProgress?.(`Extraídos ${allEvents.length} eventos de ${urls.length} fuentes. Procesando...`)`
4. `processExtractedEvents(allEvents, userId)`
5. Return `MiningResult` with totals.

**Backward-compatible refactor of existing single-URL functions** (removes duplicated logic):
```ts
export async function mineUrlDirectly(url: string, userId: string): Promise<MiningResult> {
  return mineUrlsDirectlyStreaming([url], userId)
}

export async function mineUrlDirectlyStreaming(
  url: string, userId: string, onProgress?: ProgressCallback
): Promise<MiningResult> {
  return mineUrlsDirectlyStreaming([url], userId, onProgress)
}
```
All existing tests pass unchanged — behavior is identical for single-URL calls.

---

#### File 5 (MODIFY): `packages/api/src/routes/admin.ts`

`POST /api/admin/mine-url`: accept both `url: string` and `urls: string[]` in the request body:

```ts
const { url, urls, stream = false } = req.body

const targetUrls: string[] =
  Array.isArray(urls) && urls.length > 0 ? urls :
  typeof url === 'string' && url ? [url] : []

if (targetUrls.length === 0)
  return res.status(400).json({ error: 'Se requiere una URL o un array de URLs' })

for (const u of targetUrls) {
  try { new URL(u) } catch {
    return res.status(400).json({ error: `Formato de URL inválido: ${u}` })
  }
}
```

Then pass `targetUrls` to `mineUrlsDirectlyStreaming` (streaming) or `mineUrlsDirectlyStreaming` without callback (non-streaming). No other changes to the route.

---

### Test Files

#### New: `packages/api/tests/event-deduplicator.spec.ts`

Mock `@google/genai`. Cover:
- Returns duplicate results correctly when LLM identifies matches
- Does not mark non-duplicates as duplicates (negative case)
- Handles partial batch (some duplicates, some not)
- Returns `[]` (fail-open) on API error
- Returns `[]` (fail-open) on JSON parse error
- Returns `[]` (fail-open) on quota/rate error

#### New: `packages/api/tests/event-enricher.spec.ts`

Mock `@google/genai`. Cover:
- Enriches fields when detail page has better data
- Omits fields when LLM returns null (original is preserved by caller)
- Sets `dateTimeConfirmed = true` when LLM confirms match
- Sets `dateTimeConfirmed = false` when LLM reports mismatch
- Returns `success: false, dateTimeConfirmed: false` on API error
- Returns `success: false, dateTimeConfirmed: false` on parse error

#### Modify: `packages/api/tests/event-processor.spec.ts`

Mock new imports (`event-deduplicator`, `event-enricher`, `html-fetcher`). Add cases:
- Within-batch dedup removes exact-normalized duplicates, keeps first occurrence
- Semantic dedup: events flagged by LLM judge are skipped
- Semantic dedup: LLM failure → events pass through as inactive (fail-open)
- Semantic dedup: skipped when no existing DB events for a city+date (no LLM call)
- Enrichment: `event_url === source_url` → no enrichment, stored inactive
- Enrichment: fetch failure → original data stored inactive
- Enrichment: LLM confirms date+time → stored active
- Enrichment: LLM date+time mismatch → enriched non-datetime fields stored, inactive
- Enrichment: LLM failure → original data stored inactive
- `createMinedEventDb`: `active = true` stores event as active
- `createMinedEventDb`: `active = false` (default) stores event as inactive (existing behavior preserved)

#### Modify: `packages/api/tests/mining-utils.spec.ts`

Add cases for `mineUrlsDirectlyStreaming`:
- Single URL: same behavior as existing `mineUrlDirectlyStreaming` tests
- Multiple URLs, all succeed: events from all URLs merged and processed
- Multiple URLs: one fetch fails → that URL skipped, other URLs processed
- Multiple URLs: one extraction fails → that URL skipped, other URLs processed
- Multiple URLs: progress callback called with multi-URL message
- Verify `mineUrlDirectly` and `mineUrlDirectlyStreaming` still work as before (regression)

---

### Not in Scope

- No changes to `html-fetcher.ts`, `event-extractor.ts`, or `event-moderator.ts`.
- `data-sources.ts` calls `processExtractedEvents` with the same signature — no change needed.
- No DB schema changes.
- No new proxy routes or frontend changes.
- No new environment variables (`GOOGLE_API_KEY` already required).

---

### Execution Order

1. `event-deduplicator.ts` + `event-deduplicator.spec.ts` — self-contained
2. `event-enricher.ts` + `event-enricher.spec.ts` — self-contained
3. `event-processor.ts` (new helpers + modified `processExtractedEvents` + `createMinedEventDb`) + updated `event-processor.spec.ts`
4. `mining-utils.ts` (refactor + `mineUrlsDirectlyStreaming`) + updated `mining-utils.spec.ts`
5. `admin.ts` (multi-URL body parsing)
6. Full test suite (`pnpm --filter @que-hacer-en/api test`) — verify zero regressions

---

## Documents Read

### 1. `OVERVIEW.md` — Project Overview

**Project**: "Qué hacer en..." — a web app for discovering local events in Latin American cities.

**Architecture**: TypeScript monorepo with three packages:
- `/packages/api` — Node.js/Express REST API
- `/packages/web` — Next.js SSR frontend
- `/packages/app` — Expo (React Native) mobile app (Phase 7, not yet started)

**Tech Stack**:
- Language: TypeScript (strict mode)
- Package Manager: pnpm
- Frontend (Web): React, Next.js (SSR)
- Frontend (Mobile): React Native, Expo
- Backend: Node.js, Express.js
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth + Google OAuth
- Styling: Tailwind CSS
- Testing: Jest (unit), Playwright (E2E)
- CI/CD: GitHub Actions

**Current Status** (Phases 1–6 complete):
- Monorepo, API, web frontend, database, auth, user features, testing, and CI/CD are all done.
- Phase 7 (Mobile App) is next.

**Key Architecture Pattern — Three-Layer API**:
1. Express route (`packages/api/src/routes/*.ts`)
2. Next.js proxy (`packages/web/src/app/api/**/route.ts`) using `createProxyHandler()`
3. Client function (`packages/web/src/lib/api.ts`)

**Styling**:
- Primary: Purple 600 (#6A3DE8)
- Accent: Orange 400 (#FF6B35)
- Complementary: Teal 500 (#00A9A5)
- DESIGN.json is the canonical design system reference
- Tailwind utility-first, system fonts, 300ms animations

**Environment Variables** (key ones):
- Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `REVALIDATE_SECRET`
- API: `DATABASE_URL`, `CORS_ORIGINS`, `ENABLE_AUTH`, `REVALIDATE_SECRET`
- App: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

### 2. `.cursor/rules/rules.mdc` — Development Rules

**Critical rules to follow**:

1. **Context**: Always read `OVERVIEW.md` at conversation start; check `TASKS.md` before starting tasks.
2. **Package Manager**: Use `pnpm` exclusively; never npm or yarn.
3. **Code Structure**: Max 800 lines per file; max 200 lines per component.
4. **TypeScript**: Strict mode; use `function` keyword for pure functions; omit semicolons; early returns; no unnecessary else.
5. **File Naming**: `kebab-case.ts`, `PascalCase.tsx`, `camelCase` for vars/functions, `UPPER_CASE` for constants.
6. **Three-Layer API**: Never skip the proxy layer when adding endpoints.
7. **Design**: Always consult `DESIGN.json`; never use colors/shadows/animations outside the design system.
8. **Testing**: Unit + E2E tests for all new features; fix bugs found during testing immediately.
9. **Git**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`); never commit `.env` files.
10. **Task Tracking**: Update `TASKS.md` when starting and completing tasks.
11. **Platform**: Windows machine — use PowerShell syntax for all CLI commands.

---

## Status

Context fully loaded. Ready for development tasks.

No code changes are required for this preparation step — this plan serves as a reference summary of the project's rules and architecture.
