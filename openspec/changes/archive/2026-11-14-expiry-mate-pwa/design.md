# Technical Design: ExpiryMate PWA

## Context

See `proposal.md` for overall motivations and business goals. This design specifies how the application will be architected using a serverless BaaS (Backend-as-a-Service) pattern with Next.js 14 App Router, Supabase PostgreSQL, and LINE Messaging API integration.

## Goals / Non-Goals

**Goals:**
- Zero app-store friction: Deliver a fully responsive, installable Progressive Web App (PWA) with offline cache capabilities.
- Zero server maintenance: Leverage Supabase for authentication, real-time database, object storage, and Row Level Security (RLS).
- Low-friction family sharing: Simple 6-digit alphanumeric invite codes with group-level isolation.
- Frictionless family notification: Deliver consolidated morning expiration digests via LINE Bot into household LINE groups.
- Fast item entry: Client-side optical character recognition (OCR) and barcode recognition to minimize manual typing.

**Non-Goals:**
- Native iOS/Android app store packaging (React Native / Flutter / Swift / Kotlin) is explicitly excluded.
- Payment gateway or e-commerce purchasing integrations.
- Commercial multi-tenant enterprise billing or complex role hierarchy (roles are straightforward: Owner and Member).

## Decisions

### 1. Frontend Architecture: Next.js 14 (App Router) + Tailwind CSS + PWA
- **Rationale**: Next.js App Router provides server-side rendering for snappy initial load, combined with client components for interactive UI, API routes for LINE webhooks, and easy PWA configuration via `next-pwa`/Serwist.
- **Alternatives Considered**:
  - *Vite + React SPA*: Lightweight, but lacks native API routes for handling secure LINE webhooks and OAuth callbacks in a unified project structure.

### 2. Backend & Database: Supabase (PostgreSQL, Storage, RLS)
- **Rationale**:
  - Provides PostgreSQL with JSONB and relational capabilities.
  - Row Level Security (RLS) guarantees data isolation across households without needing complex middleware.
  - Supabase Storage handles coupon barcode images with built-in CDN and access policies.
- **Data Model**:
  - `households`: `id (uuid)`, `name`, `invite_code (varchar)`, `created_at`.
  - `household_members`: `id`, `household_id`, `user_id`, `role (owner|member)`.
  - `items`: `id`, `household_id`, `created_by`, `type (food|coupon)`, `title`, `category_or_location`, `expiry_date (date)`, `quantity`, `is_opened (boolean)`, `barcode_image_url`, `notes`, `status (active|consumed|discarded)`, `created_at`, `updated_at`.
  - `line_bindings`: `id`, `household_id`, `line_group_id`, `bound_at`, `temp_bind_code`.

### 3. LINE Bot & Daily Notification Schedule
- **Rationale**: LINE Messaging API requires a webhook for bidirectional communication and Push Message API for broadcast/group push.
- **Group Binding**:
  1. User requests a temporary binding code (e.g., `#BIND-8899`) in the PWA.
  2. User invites the LINE Bot into the family group and sends the code.
  3. The Next.js API route (`/api/line/webhook`) validates the code against `line_bindings`, persists the `line_group_id`, and replies with confirmation.
- **Schedule Engine**: A lightweight daily Cron trigger (Vercel Cron / GitHub Actions / Supabase pg_cron) executes at 08:30 local time calling `/api/cron/check-expirations` with a secure bearer token.

### 4. Client-side OCR & Barcode Scanning
- **Rationale**: Use browser-native `BarcodeDetector` API (with ZXing/Tesseract.js fallback) to process images locally on device before sending to the server, preserving privacy and keeping serverless compute free.

## Risks / Trade-offs

- **[Risk] LINE Messaging API free tier limits (200 free push messages/month)**
  - *Mitigation*: Consolidate all expiring items for a household into a single daily digest message rather than sending per-item individual alerts.
- **[Risk] Camera capture quality & date parsing accuracy on crumpled food packages**
  - *Mitigation*: Client-side regex parsing populates input form fields as suggestions, allowing users one-tap manual verification before saving.
- **[Risk] Safari iOS PWA push notification nuances**
  - *Mitigation*: Emphasizing LINE Bot push alerts eliminates reliance on mobile OS browser push notification permissions.

## Migration & Deployment Plan

1. **Phase 1**: Database schema creation and RLS setup in Supabase.
2. **Phase 2**: Core PWA setup (Next.js, Tailwind, PWA manifest, dual-tab UI, local item state).
3. **Phase 3**: Supabase Auth integration & Household invite code flow.
4. **Phase 4**: LINE Messaging API webhook & scheduled cron digest.
5. **Phase 5**: OCR & barcode scanning enhancement.
