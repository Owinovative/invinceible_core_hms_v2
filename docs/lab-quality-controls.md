# Lab Quality Controls

Lab results must be entered, reviewed, traceable, and visible to the right clinical team only.

## Required controls

- Lab technician enters result.
- Lab manager or verifier verifies result where facility workflow requires it.
- Critical and abnormal flags should be visible to the doctor.
- Result corrections must never be silent.
- Attachments should remain viewable from the doctor side.
- Doctor notification should be queued when a result is ready.

## Current foundation

Lab result files and values are stored against lab order items. Patient portal endpoints only return patient-owned lab orders with results. The next schema step should add explicit `verifiedBy`, `verifiedAt`, `isCritical`, `isAbnormal`, and `releasedToPatientAt` fields.
