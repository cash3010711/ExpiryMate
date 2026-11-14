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
