# AGENTS.md: ExpiryMate Architectural Memory

## Overview
ExpiryMate is a mobile-first Progressive Web App (PWA) designed to track expiration dates for food items and promotional coupons, with multi-user household sharing, client-side OCR & barcode scanning, and automated daily expiration digests sent to family LINE groups via LINE Messaging API.

## Core Capabilities & Directory Structure
- **`lib/anti-replay/`**:
  - `nonce-store.ts`: Sliding-window deduplication store with TTL auto-purge.
  - `validator.ts`: Drift window validation (past/future <= 5 mins), HMAC-SHA256 signature verification (`crypto.timingSafeEqual`), and Bearer CRON_SECRET authorization with anti-replay defenses.
- **`lib/expiration/engine.ts`**:
  - Accurate calendar-day remaining calculations (pure UTC date splitting preventing local timezone drift).
  - Traffic-light urgency states: Red (<=0 days), Yellow (1-3 days), Green (>3 days).
  - Status lifecycle: `active`, `consumed`, `discarded`, and restoration.
- **`lib/household/`**:
  - `invite-code.ts`: Cryptographically secure 6-character uppercase alphanumeric code generation and normalization.
  - `binding-code.ts`: Temporary household LINE group binding code `#BIND-XXXX` generation and regex extraction.
- **`lib/line/digest.ts`**:
  - Daily morning digest formatter grouping expired and near-expiry items. Automatically suppresses sending when no items require attention.
- **`lib/ocr/date-parser.ts`**:
  - Robust client-side regex engine supporting Taiwan ROC (Minguo, e.g. `113.12.31`), ISO (`2024-12-31`), European (`31/12/2024`), and compact numeric formats.
- **`supabase/migrations/`**:
  - `20261114000000_initial_schema.sql`: Tables `households`, `household_members`, `items`, `line_bindings`, with Row-Level Security (RLS) policies and B-tree indexes.
- **`app/api/`**:
  - `/api/line/webhook`: Processes incoming LINE events, enforces anti-replay, and handles `#BIND-XXXX` household group association.
  - `/api/cron/check-expirations`: Triggered daily (08:30) via Vercel Cron or GitHub Actions with Bearer `CRON_SECRET` and anti-replay header validation.
- **PWA Manifest & Service Worker**:
  - `public/manifest.json`: Web app manifest configured for standalone homescreen installation.
  - `public/sw.js`: Service worker caching static assets and API routes for offline accessibility.

## Verification Commands
- `npm test`: Runs Vitest across 6 test suites covering anti-replay, date calculations, OCR, household logic, and API routes.
- `npm run build`: Generates optimized Next.js 14 production bundle.
