# Phase 02 - Data

## Summary
- Added shared database schema for entities, rankings, prompt versions, scripts, render jobs, render events, compliance flags, and evidence records.
- Added local JSON wisdom memory to support versioned prompts and memory updates when Supabase migrations are not yet applied.

## Files Changed
- /database/evics_evie_shared_schema.sql
- /data/evics-evie/wisdom-memory.json is created at runtime.

## Verification
- Schema file is present. Runtime validation verifies local wisdom read/write.

## Blockers
- Supabase SQL migration must be applied in Supabase before dedicated shared tables can persist remotely.
