# line-notification Specification

## Purpose
Enables automated daily expiration reminders and alerts sent directly into a household's LINE group via LINE Messaging API.

## Requirements

### Requirement: LINE Group Binding via Verification Code
The system SHALL bind a household to a LINE chat group using a temporary binding code provided in the application.

#### Scenario: Successful group binding
- **WHEN** user adds the LINE Bot to a family group and sends `#BIND-XXXX` matching an active household code
- **THEN** system associates the group ID with the household and sends a confirmation reply in the group

#### Scenario: Unrecognized binding code
- **WHEN** user sends an expired or invalid `#BIND-XXXX` command in a LINE group
- **THEN** system replies with an error notice indicating the code was invalid

### Requirement: Daily Scheduled Expiration Digest
The system SHALL assemble and broadcast a daily summary message of expiring and expired items to bound LINE groups.

#### Scenario: Scheduled trigger finds expiring items
- **WHEN** daily cron job triggers at 08:30 local time
- **THEN** system queries all items expiring within 3 days or already expired for each bound household and pushes a formatted summary message to the respective LINE group

#### Scenario: No items expiring
- **WHEN** daily cron job triggers and a household has zero items expiring within 3 days
- **THEN** system skips sending alerts for that household to prevent notification fatigue
