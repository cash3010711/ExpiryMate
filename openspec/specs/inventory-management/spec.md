# inventory-management Specification

## Purpose
Enables households to track food items and promotional coupons with expiration dates, real-time urgency indicators, and lifecycle state management.

## Requirements

### Requirement: Dual-Tab Item Classification
The system SHALL separate inventory into two dedicated views: Food Items and Coupons, with specialized attributes for each category.

#### Scenario: Switching between Food and Coupons
- **WHEN** user selects the "Coupons" tab on the main dashboard
- **THEN** system displays only coupon items with brand/store name and discount details

#### Scenario: Displaying Food specialized fields
- **WHEN** user views a food item detail
- **THEN** system displays storage location (Freezer, Refrigerator, Pantry), quantity, and opened state

### Requirement: Expiration Urgency Calculation
The system SHALL dynamically compute remaining days until expiration and assign a visual urgency status to each active item.

#### Scenario: Item is expired
- **WHEN** an item's expiration date is before the current local date
- **THEN** system displays remaining days as 0 or negative and highlights the item in Red (Expired)

#### Scenario: Item expiring within warning window
- **WHEN** an item expires within 3 days of the current local date
- **THEN** system highlights the item in Yellow (Expiring Soon) and sorts it to the top of the active list

#### Scenario: Item has ample shelf life
- **WHEN** an item expires more than 3 days from the current local date
- **THEN** system displays the item with a Green (Safe) indicator

### Requirement: Item Lifecycle Management
The system SHALL support transition of items between Active, Consumed/Redeemed, and Discarded states without permanently deleting data.

#### Scenario: Marking a food item as consumed
- **WHEN** user taps "Mark as Consumed" on an active food item
- **THEN** system updates the item status to Consumed, removes it from the active dashboard, and archives it in history

#### Scenario: Restoring an archived item
- **WHEN** user selects an item in history and taps "Restore"
- **THEN** system reverts the item status to Active and displays it on the main dashboard

### Requirement: Opened Date Tracking and Display
The system SHALL track when an item is marked as opened with an opened date and display elapsed days on the item without modifying the item's original expiration date.

#### Scenario: User marks an item as opened from the item card
- **WHEN** user clicks "標記開封" on an active unopened food item card
- **THEN** system sets `is_opened` to true, records the current calendar date as `opened_date`, and immediately displays the opened tag

#### Scenario: User sets opened state and date from the edit modal
- **WHEN** user checks "已開封" in the item creation or edit modal and selects an opened date
- **THEN** system saves the item with `is_opened: true` and the specified `opened_date`

#### Scenario: Displaying opened date and day count badge
- **WHEN** user views an active item where `is_opened` is true and `opened_date` is set
- **THEN** system calculates elapsed days between `opened_date` and today and displays `已開封 (MM/DD, X天)`

### Requirement: Quick Quantity Decrement
The system SHALL allow users to quickly decrement an item's quantity by 1 directly on the card when quantity is greater than 1.

#### Scenario: Decrementing quantity when quantity is greater than 1
- **WHEN** an active item has a quantity greater than 1 (e.g., 4) and user clicks the `[-1]` quick action button
- **THEN** system immediately decrements the quantity by 1 (e.g., to 3) and synchronizes the updated quantity to the store

#### Scenario: Hiding quick decrement when quantity reaches 1
- **WHEN** an item's quantity is exactly 1
- **THEN** system hides the `[-1]` quick action button, and completing the item requires clicking "已食用"

### Requirement: Mobile Pull-to-Refresh Synchronization
The system SHALL provide a touch gesture pull-to-refresh mechanism for mobile users to trigger manual synchronization with cloud storage.

#### Scenario: User pulls down from top of item list
- **WHEN** user drags down from the top scroll position on a touch device
- **THEN** system displays an expandable header showing a progress indicator with the text "下拉刷新"

#### Scenario: User reaches threshold and releases
- **WHEN** user pulls past the activation threshold and releases
- **THEN** system provides a subtle haptic vibration, changes status text to "正在同步...", triggers `syncWithCloud()`, and collapses back after sync completes
