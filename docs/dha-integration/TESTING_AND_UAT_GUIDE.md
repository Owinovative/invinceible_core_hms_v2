# Testing & UAT Guide: DHA/SHA Integration

## Overview
This guide provides the necessary steps to validate the Invinceible Core HMS V2 against the DHA AfyaLink testing environment (Sandbox).

## Test Cases

### 1. Patient Eligibility Verification
**Goal:** Verify a patient's SHA status via the Client Registry.
1. Log into the system and navigate to `Patients > New`.
2. Enter a valid sandbox test `SHA Member Number`.
3. Click `Verify`.
4. **Expected Result:** Patient details auto-fill and an `ELIGIBLE` status is displayed.
5. **Negative Test:** Enter an invalid number; expect `NOT_FOUND`.

### 2. Practitioner & Facility Validation
**Goal:** Ensure consultations are blocked for unverified facilities/practitioners.
1. Initiate a consultation using a mock practitioner ID.
2. **Expected Result:** The system throws an exception blocking the consultation creation until a valid DHA Practitioner Registration Number is used.

### 3. Claim Submission & Queue Resilience
**Goal:** Ensure claims are successfully transmitted and retried upon failure.
1. Finalize an invoice for an eligible SHA patient.
2. Navigate to the `Integration Command Center`.
3. **Expected Result:** The claim appears in the "Recent Claims Activity" feed.
4. **Resilience Test:** Temporarily disconnect the network and finalize a claim. Reconnect the network.
5. **Expected Result:** The claim remains in `Pending Jobs` and automatically succeeds on the next retry cycle.

### 4. Automated Background Polling
**Goal:** Ensure the system fetches updated claim statuses.
1. Submit a claim.
2. Wait for the `SyncJobsModule` cron schedule to run (or trigger manually).
3. **Expected Result:** The local invoice status transitions from `PENDING` to `ACCEPTED` or `REJECTED`.
