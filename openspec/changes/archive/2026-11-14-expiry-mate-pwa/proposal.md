# Proposal: ExpiryMate PWA

## Why

Household food waste and expired unused coupons are widespread problems caused by lack of visibility into expiration dates and poor synchronization among family members. Existing native apps require cumbersome App Store downloads, individual manual tracking, and lack direct integration into family communication channels. ExpiryMate provides a lightweight, zero-install PWA with family sharing and daily LINE group alerts to ensure items are consumed before they expire.

## What Changes

- Introduce a mobile-first Progressive Web App (PWA) with installable homescreen support and offline caching.
- Introduce dual-category inventory tracking for Food (storage locations, opened state) and Coupons (store/brand, barcode/QR screenshots, discount details).
- Implement dynamic expiration date tracking with countdown days and traffic-light urgency indicators (Red: Expired, Yellow: Expiring within 3 days, Green: Safe).
- Implement family household sharing using invite codes and join links, powered by Supabase PostgreSQL and Row-Level Security.
- Implement LINE Bot integration and scheduled notifications to broadcast daily expiration summaries directly into household LINE groups.
- Introduce client-side camera capture with OCR for expiration dates and barcode recognition for swift item entry.
- Implement item lifecycle states: active, consumed, and discarded with recoverable history.

## Capabilities

### New Capabilities
- `inventory-management`: Dual-mode tracking for food and coupons, expiration date calculations, urgency status, and item lifecycle states.
- `household-sharing`: Household group creation, 6-digit invitation codes, member joining, and synchronized inventory access.
- `line-notification`: LINE Messaging API integration, group binding via `#BIND-xxxx` code, and automated daily expiration reminders.
- `smart-capture`: Mobile camera integration for optical character recognition (OCR) of dates and barcode scanning.

### Modified Capabilities
*(None - this is a greenfield project)*

## Impact

- **Frontend**: Next.js 14 App Router, Tailwind CSS, TypeScript, Lucide React, and PWA manifest (`manifest.json` + Service Worker).
- **Backend / Database**: Supabase (PostgreSQL schema, Row Level Security policies, Supabase Storage for coupon images).
- **External APIs**: LINE Messaging API (Webhook & Push Messages), LINE Login OAuth.
- **Scheduled Jobs**: Supabase pg_cron + Edge Functions or GitHub Actions Cron for daily 08:30 notifications.
