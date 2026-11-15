# Proposal

## Why
While ExpiryMate currently tracks food and coupons with expiration dates and quantities, real-world everyday kitchen workflows require higher ergonomics:
1. Food items frequently spoil quickly once opened (regardless of the original printed expiration date), so households need to know exactly when an item was opened and how many days it has been opened.
2. Items purchased in packs (e.g., a pack of 4 yogurts or puddings) are eaten one by one. Currently, marking an item "Consumed" consumes the entire item, forcing users into tedious modal editing to change 4 to 3.
3. On mobile devices and installed PWAs without native browser navigation bars, users have no fluid touch gesture to refresh their inventory from cloud storage.

## What Changes
- **Opened Date Tracking & Informative Badge**:
  - Add `opened_date` field to inventory item data models.
  - Provide a one-click "標記開封" action directly on active un-opened item cards, automatically timestamping today's date.
  - Enable setting or editing `opened_date` within the item modal.
  - Display a clean informative badge: `已開封 (MM/DD, X天)` without modifying the printed expiration date.
- **Quick Quantity Decrement (-1)**:
  - When an active item has `quantity > 1`, display a quick `[-1]` action button directly beside the quantity indicator on the card.
  - Tapping `[-1]` optimistically decrements the item's quantity by 1 and persists it to Supabase/local storage.
  - Automatically hide the `[-1]` button when `quantity` reaches 1, leaving the primary "已食用" button to archive the last unit.
- **Mobile Touch Pull-to-Refresh**:
  - Implement a mobile-optimized touch pull-to-refresh container at the top of the inventory screen.
  - Dynamic visual indicator with progress ring and contextual status messages: "下拉刷新" → "放開立即更新" → "正在同步...".
  - Haptic feedback vibration (`navigator.vibrate`) upon reaching the activation threshold.
  - Triggers cloud synchronization (`syncWithCloud()`) and smoothly animates closed.

## Capabilities

### Modified Capabilities
- `inventory-management`: Adds requirements for opened item tracking with opened date and day count, quick card-level quantity decrement (-1), and mobile touch pull-to-refresh cloud synchronization.

## Impact
- **Database Schema**: Add optional `opened_date` column to Supabase `items` table schema.
- **Frontend Components**:
  - `components/ItemCard.tsx`: Add quick "標記開封" button, opened date badge, and quantity decrement `[-1]` button.
  - `components/ItemModal.tsx`: Add `opened_date` input linked to the `is_opened` checkbox.
  - `components/PullToRefresh.tsx` (new) or embedded in `app/page.tsx`: Touch gesture listener with threshold detection, haptic trigger, and sync orchestration.
- **Engines & Utilities**:
  - `lib/expiration/engine.ts`: Helper to calculate elapsed opened days and format `已開封 (MM/DD, X天)`.
  - `lib/supabase/types.ts` & `lib/supabase/db.ts`: Support `opened_date` in item models.
