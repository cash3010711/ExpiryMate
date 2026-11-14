# Tasks: ExpiryMate PWA

## 1. Project Setup & Database Schema

- [x] 1.1 Initialize Next.js 14 project with TypeScript, Tailwind CSS, Lucide React, and PWA configuration (`manifest.json` and icons), verifying local dev build runs.
- [x] 1.2 Create Supabase SQL schema definitions covering `households`, `household_members`, `items`, and `line_bindings` with Row-Level Security (RLS) policies.
- [x] 1.3 Create Supabase client and server-side helper modules with environment variable validation.

## 2. Core Inventory Management & Urgency Calculation

- [x] 2.1 Implement dual-tab interface for Food and Coupon inventories, verifying tab switching filters item lists accurately.
- [x] 2.2 Implement item creation and edit forms with specific fields (Food: storage location & opened status; Coupon: brand, notes, barcode upload).
- [x] 2.3 Implement expiration countdown engine with traffic-light badges (Red <= 0 days, Yellow <= 3 days, Green > 3 days) and priority sorting.
- [x] 2.4 Implement item lifecycle status transitions (Active, Consumed/Redeemed, Discarded) with history archive and restoration.

## 3. Household Sharing & Authentication

- [x] 3.1 Implement user authentication integration with Supabase Auth (LINE Login and Google OAuth).
- [x] 3.2 Implement household creation and 6-digit alphanumeric invite code generator.
- [x] 3.3 Implement household joining via invite code, verifying multi-user data isolation via RLS policies.

## 4. LINE Bot Integration & Scheduled Digest

- [x] 4.1 Implement LINE Messaging API webhook route (`/api/line/webhook`) to handle household binding codes (`#BIND-XXXX`).
- [x] 4.2 Implement scheduled expiration check route (`/api/cron/check-expirations`) assembling daily morning digests.
- [x] 4.3 Setup cron schedule configuration (Vercel Cron / GitHub Actions) and verify mock alert message format.

## 5. Smart Capture (OCR & Barcodes)

- [x] 5.1 Implement camera capture and file upload with client-side barcode/QR scanner for coupon barcodes.
- [x] 5.2 Implement expiration date text extraction (client-side OCR) with regex parser auto-filling date inputs.

## 6. PWA Offline & Final Verification

- [x] 6.1 Configure Service Worker caching strategy for offline item browsing.
- [x] 6.2 Execute end-to-end user journey verification (create item -> check status -> invite member -> bind LINE group).
