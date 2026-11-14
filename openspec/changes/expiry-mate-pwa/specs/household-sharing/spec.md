# Spec Delta: household-sharing

## Purpose

Provides family group creation, invitation code management, and shared inventory access across authorized family members.

## ADDED Requirements

### Requirement: Household Creation and Membership
The system SHALL allow authenticated users to create a household and become its owner/administrator.

#### Scenario: New user creates a household
- **WHEN** user finishes registration and submits household creation form
- **THEN** system creates the household, generates a unique 6-character alphanumeric invite code, and assigns user as owner

### Requirement: Joining a Household via Invite Code
The system SHALL allow family members to join an existing household using an invitation code or direct link.

#### Scenario: Member joins with valid invite code
- **WHEN** user inputs a valid 6-character household invite code
- **THEN** system associates the user with the household and grants immediate read/write access to shared items

#### Scenario: Member attempts to join with invalid code
- **WHEN** user submits an invalid or non-existent invite code
- **THEN** system rejects the request and displays an explanatory error message

### Requirement: Shared Inventory Access and Isolation
The system SHALL isolate household inventory using Row-Level Security so members can only view and manage items belonging to their household.

#### Scenario: Viewing household items
- **WHEN** any verified member of a household opens the inventory
- **THEN** system returns all active items belonging to that household
