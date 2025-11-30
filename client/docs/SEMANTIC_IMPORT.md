# Semantic Import Pipeline

This document describes the two-stage semantic import pipeline that replaces "last-value-wins" extraction with intelligent decision-making.

## Overview

The semantic import pipeline consists of two stages:

1. **Stage 1: Candidate Fact Extraction** - Extract ALL potential facts from source text, tracking negotiation status and speaker attribution
2. **Stage 2: Semantic Resolution** - Analyze all facts globally and select the canonical truth for each fact type/domain

## Why Semantic Import?

The previous import system had a critical flaw: it used "last-value-wins" logic for extraction. This caused incorrect overwrites when processing email threads or negotiations:

**Problem Example:**
```
Email 1: "We offer $2500 for the performance"
Email 2: "I don't like that price"
Email 3: "The venue costs $3000"
```

**Old System Result:** artist_fee = $3000 ❌ (wrong - confused venue cost with artist fee)

**Semantic System Result:**
- artist_fee = null (unagreed - offer was rejected)
- venue_cost = $3000 (informational) ✅

## Architecture

### Database Tables

#### `import_facts`
Stores candidate facts extracted during Stage 1:
- `fact_type`: What domain this value belongs to (artist_fee, venue_cost, hotel_name, etc.)
- `status`: Negotiation state (offer, counter_offer, accepted, rejected, info, etc.)
- `speaker_role`: Who made this statement (artist, promoter, venue, etc.)
- `direction`: For costs - who pays (we_pay, they_pay, included, etc.)
- `is_selected`: Whether this fact was chosen as canonical in Stage 2
- `raw_snippet`: Original text for auditability

#### `import_resolutions`
Stores resolution decisions from Stage 2:
- `fact_type`: What was resolved
- `selected_fact_id`: Which fact was chosen (null if unresolved)
- `resolution_state`: resolved, unagreed, conflicting, missing, informational
- `resolution_reason`: Human-readable explanation

### Key Rules

1. **Latest ≠ Correct** - Respects negotiation flow
2. **Accepted > Offered > Informational** - Priority by negotiation status
3. **Rejected facts can NEVER be selected** - Once rejected, always rejected
4. **Different cost domains never compete** - artist_fee ≠ venue_cost ≠ catering_cost
5. **Missing acceptance = Unresolved** - Don't guess at incomplete negotiations
6. **When uncertain → Leave unset** - Better to be empty than wrong

## Usage

### Running the Import Worker

```bash
# Development
npm run import:worker

# Or directly
npx tsx scripts/import-worker.ts
```

### Programmatic Usage

```typescript
import { runSemanticImportExtraction } from '@/lib/import/semantic';

const result = await runSemanticImportExtraction(
  supabase,
  jobId,
  sources,
  (progress) => {
    console.log(`Stage: ${progress.stage}, Facts: ${progress.facts_extracted}`);
  }
);

console.log(`Extracted: ${result.facts_extracted}`);
console.log(`Selected: ${result.facts_selected}`);
console.log(`Summary: ${result.summary}`);
```

## File Structure

```
lib/import/semantic/
├── types.ts           # Type definitions for facts, resolutions
├── fact-extraction.ts # Stage 1: LLM prompts and extraction
├── resolution.ts      # Stage 2: Semantic resolution logic
├── db.ts              # Database operations (insert, select, update)
├── orchestrator.ts    # Coordinates both stages
└── index.ts           # Public exports

lib/import/
├── worker.ts          # Background worker using semantic pipeline
└── ...

scripts/
└── import-worker.ts   # CLI script to run worker
```

## Migration

The migration file `20251130144954_semantic_import_facts.sql` creates:
- `import_fact_type` enum
- `import_fact_direction` enum
- `import_fact_status` enum
- `import_fact_speaker` enum
- `import_facts` table
- `import_resolutions` table
- New columns on `import_jobs`: `extraction_stage`, `facts_extracted_at`, `resolution_completed_at`
- RPCs: `app_insert_import_facts`, `app_get_import_facts`, `app_select_import_facts`, etc.

## Future Improvements

- [ ] Add UI to display facts and resolution decisions
- [ ] Allow manual override of resolution decisions
- [ ] Add confidence aggregation across multiple sources
- [ ] Implement entity linking (e.g., linking hotel mentions to same entity)
- [ ] Add support for streaming extraction progress
