# Tasks

## 1. Data Model & Engine Support

- [ ] 1.1 Add optional `opened_date` to `InventoryItem` in `lib/expiration/engine.ts` and `Database` in `lib/supabase/types.ts`.
- [ ] 1.2 Implement `calculateDaysOpened` and `formatOpenedBadge` in `lib/expiration/engine.ts` and verify with unit tests in `tests/expiration.test.ts`.
- [ ] 1.3 Add SQL migration `supabase/migrations/20261115000000_add_opened_date.sql` to add nullable `opened_date` to `public.items`.

## 2. Card-Level Quick Actions (Opened & Decrement)

- [ ] 2.1 Update `components/ItemCard.tsx` to support the `[-1]` quantity decrement button when `quantity > 1`, and the "標記開封" quick action button with `formatOpenedBadge` rendering.
- [ ] 2.2 Update `components/ItemModal.tsx` to allow selecting and editing `opened_date` when `is_opened` is toggled.
- [ ] 2.3 Connect quantity update and opened status handlers in `app/page.tsx` with optimistic state updates and cloud synchronization.

## 3. Mobile Pull-to-Refresh Component

- [ ] 3.1 Create `components/PullToRefresh.tsx` supporting touch gestures, pull-down resistance, status texts ("下拉刷新" / "放開立即更新" / "正在同步..."), spinner animation, and optional haptic vibration.
- [ ] 3.2 Wrap the main item feed in `app/page.tsx` with `PullToRefresh` bound to `syncWithCloud()`.

## 4. Verification

- [ ] 4.1 Run `npm test` to verify all Vitest test suites pass with new opened date engine tests.
- [ ] 4.2 Run `npm run build` to ensure clean Next.js 14 production compilation without TypeScript or lint errors.
