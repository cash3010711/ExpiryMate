# Spec Delta

## ADDED Requirements

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
