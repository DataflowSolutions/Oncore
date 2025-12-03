# Semantic Import: Section-Pass Plan

This plan aligns the pipeline with the desired strategy: chunk purely for size control, then extract facts per section across all chunks in one pass per section. After collecting all section facts, proceed with the existing global semantic resolution, application, flight reconstruction, and enrichment.

## Goals
- Chunk once per source to limit LLM context size and reduce hallucination.
- Run section-focused extraction passes over the same unified chunk set: general, deal, flights, hotels, food, activities, contacts, technical, documents.
- Make chunk size easy to tweak (env + orchestrator param).
- Use tailored prompts per section to constrain extraction and improve precision.
- Preserve the current Stage 2–3 flow (global resolution, flight reconstruction/enrichment, application + deterministic enrichment).

## Definitions
- Section: A data domain mapped to `ImportData` and `fact_type` prefixes (e.g., `general_*`, `flight_*`, `hotel_*`).
- Splitting/Chunking: Purely size-based word batching of raw text (e.g., 800 words per chunk) with minimal last-batch smoothing. No section slicing.
- Iteration: Build `allChunks = chunks(file1) + chunks(file2) + …` once; then for each section, iterate `allChunks` sequentially and extract ONLY that section’s facts.

## Implementation Strategy

1) Unified Chunk Builder (no section slicing)
- Add `buildAllChunksAcrossSources(sources, maxWords, minWords): TextChunk[]` in `semantic/stages.ts` to return a single, ordered `TextChunk[]` across all sources by `(sourceId, chunkIndex)`.
- Internally reuse `buildChunksForSection(sectionIgnored, sources, maxWords, minWords)` from `chunking.ts` (section arg is ignored) to keep chunk boundaries identical.

2) Easy Chunk Size Configuration
- Introduce `maxWordsPerChunk` (and optional `minWordsPerChunk`) sourced by:
  - Orchestrator param on `runSemanticImport` → threaded into `runFactExtraction`.
  - Env `SEMANTIC_IMPORT_MAX_WORDS` with fallback to 800; optional `SEMANTIC_IMPORT_MIN_WORDS` fallback to 300.
- Replace the hardcoded `const maxWordsPerChunk = 800` in `stages.ts` with the configured value.

3) Per-Section Extraction Passes
- In `runFactExtraction`, after building `allChunks`, iterate a fixed `SECTION_ORDER`:
  - For each `section`, loop `allChunks` and call `extractFactsFromChunk` with a section hint (`current_section`) to scope prompts and filter extraction to that domain.
  - Accumulate section facts across chunks into `allFacts`.
- Run existing post-processing (`postProcessAllFacts`) and insert all facts via RPC (`insertImportFacts`).

4) Tailored Prompts Per Section
- Extend `extractFactsFromChunk` request with `current_section`.
- In `semantic/fact-extraction/index.ts`, inject the section into the user prompt header: “Extract ONLY {section} facts from this chunk.”
- Create or reuse prompt helpers to vary instructions per section (e.g., `PROMPTS.factExtraction.user({ section, ... })`).

5) Preserve Stage 2–3 Flow
- No changes to `resolveImportFacts` (LLM-first, rules fallback, validation), `flight-reconstruction.ts`, `flight-enrichment.ts`, or `application.ts`.
- Flights remain ID-centric (flightNumber + date) with reconstruction and API enrichment.
- Deterministic enrichment (`enrichment.ts`) continues for deal/general.

## Files and Touch Points
- `semantic/stages.ts`:
  - Add `buildAllChunksAcrossSources`.
  - Update `runFactExtraction` to use per-section passes over `allChunks` and to accept configurable chunk sizes.
- `semantic/fact-extraction/index.ts`:
  - Add `current_section` to `FactExtractionRequest` usage and include it in prompts.
  - Optionally add section-specific prompt templates.
- `semantic/orchestrator.ts`:
  - Thread optional `maxWordsPerChunk` (and `minWordsPerChunk`) into `runFactExtraction`.
- `semantic/prompts/*`:
  - Add tailored section prompts or parameterize the existing ones.

## Configuration
- Env vars:
  - `SEMANTIC_IMPORT_MAX_WORDS` (default: 800)
  - `SEMANTIC_IMPORT_MIN_WORDS` (default: 300)
- Orchestrator params (optional overrides):
  - `maxWordsPerChunk?: number`
  - `minWordsPerChunk?: number`

## Progress & Diagnostics
- Reuse `SemanticProgressCallback` to report per-section pass progress (`current_section`, `chunks_total`, `chunks_completed`).
- Keep `IMPORT_DEBUG` diagnostics for fact dumps, post-processing, resolutions, and application.

## Rollout Notes
- Start by threading chunk size config and adding the section hint into prompts (lowest-risk).
- Then switch Stage 1 to per-section passes over `allChunks` while leaving Stage 2–3 intact.
- If LLM cost is high, consider skipping sections on low-text sources or early stopping when confidence saturates.
