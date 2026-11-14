# Spec Delta: smart-capture

## Purpose

Provides client-side optical character recognition (OCR) and barcode detection via camera or file upload to expedite item entry.

## ADDED Requirements

### Requirement: Expiration Date OCR Detection
The system SHALL extract date patterns from user-uploaded images or direct camera captures using client-side OCR.

#### Scenario: Recognizing standard date formats
- **WHEN** user captures a photo of a food packaging date stamp containing formats such as YYYY/MM/DD or YYYY.MM.DD
- **THEN** system extracts the parsed date and auto-populates the expiration date field in the item form

#### Scenario: No date detected
- **WHEN** user captures an image without recognizable date text
- **THEN** system alerts the user and keeps manual date selection active

### Requirement: Barcode and QR Code Scanning
The system SHALL scan 1D barcodes and 2D QR codes using device cameras.

#### Scenario: Scanning a coupon barcode
- **WHEN** user scans a coupon barcode or uploads a coupon screenshot
- **THEN** system stores the barcode image and provides an enlarged view for cashiers to scan upon redemption
