# Design

## Context
See `proposal.md` for user motivation and high-level requirements.
Currently, `InventoryItem` has `is_opened: boolean` and `quantity: number`, but no opened timestamp. The item card only offers complete state transitions ("已食用", "丟棄"), requiring multi-tap modal editing to reduce quantities or record opened dates. Mobile PWA lacks a pull-to-refresh gesture, requiring full browser reload to refresh data.

## Goals / Non-Goals

**Goals:**
- Provide a frictionless, one-touch experience for kitchen workflows: marking an item as opened with a single tap, decrementing item quantity with a single tap.
- Provide a native-feeling pull-to-refresh gesture for mobile browsers and standalone PWA modes.
- Maintain full offline capability and optimistic UI updates for both local storage and Supabase cloud synchronization.

**Non-Goals:**
- Modifying the original printed `expiry_date` when an item is opened (agreed: pure informational tag).
- Color-coding or urgency escalation based on days opened (agreed: neutral informative tag).
- Automatically deleting or archiving an item via the `[-1]` button (agreed: `[-1]` button hides when quantity is 1; user uses "已食用" for final unit).

## Decisions

### 1. Data Model & Formatting for Opened State
- **Field**: Add optional `opened_date?: string | null` (`YYYY-MM-DD`) to `InventoryItem`, Supabase `items` schema, and types.
- **Card Action**: Unopened items display a compact "標記開封" action button. Clicking it sets `is_opened: true` and `opened_date: today` via optimistic update.
- **Badge Format**: Utility function `formatOpenedBadge(openedDate, refDate)` returns `已開封 (MM/DD, X天)` where `MM/DD` is the formatted opened date and `X` is the difference in calendar days.
- **Modal Editing**: Checkbox "已開封" in `ItemModal` reveals an optional date input for `opened_date`, defaulting to today.

### 2. Card-Level Quantity Stepper / Quick Decrement
- **Placement**: Located immediately adjacent to the `x{quantity}` badge on `ItemCard` (e.g. `x4  [-1]`).
- **Condition**: Only visible when `item.status === 'active'` and `item.quantity > 1`.
- **Handler**: `onUpdateQuantity(id, item.quantity - 1)` passed from `HomePage`, optimistically updating state and calling `updateItemInDb(id, { quantity: newQty })`.

### 3. Touch Pull-to-Refresh Mechanism
- **Architecture**: A lightweight wrapper component `PullToRefresh` that monitors touch events on mobile:
  - `onTouchStart`: Record initial Y position only if container `scrollTop === 0`.
  - `onTouchMove`: Calculate downward drag with logarithmic/cubic resistance curve (`diff * 0.45`), max height 80px.
  - `onTouchEnd`: If dragged distance >= threshold (65px), enter `refreshing` state, invoke `onRefresh()`, fire `navigator.vibrate?.(12)`, and hold indicator until the returned Promise resolves.
- **Feedback & States**:
  - `pulling`: "下拉刷新" with rotating icon.
  - `ready`: "放開立即更新" with highlighted icon.
  - `refreshing`: "正在同步..." with spinning loader.
- **Style**: Styled with Tailwind CSS, utilizing `overscroll-behavior-y: contain` to prevent browser duplicate pull gestures.

## Risks / Trade-offs

- **[Risk: Backward compatibility with existing Supabase records lacking `opened_date`]**
  → *Mitigation*: `opened_date` is nullable and optional in all types and queries. If `is_opened` is true but `opened_date` is null (legacy data), display `已開封` gracefully without breaking.
- **[Risk: Pull-to-refresh interfering with normal desktop or mobile scrolling]**
  → *Mitigation*: Pull gesture only activates when `window.scrollY === 0` and drag direction is strictly downwards (`deltaY > 0`). Cancel gesture immediately if user scrolls horizontally or upwards.
- **[Risk: Rapid multi-clicks on `[-1]` causing state desynchronization]**
  → *Mitigation*: React functional state update ensures local state remains atomic (`prev.map(...)`). Cloud synchronization debounces or propagates updated values reliably.
