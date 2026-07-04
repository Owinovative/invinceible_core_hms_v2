# SHA Operations Guide

## Overview
This guide provides standard operating procedures for interacting with the Social Health Authority (SHA) and Digital Health Agency (DHA) through the Invinceible Core HMS V2.

## 1. Patient Registration & Eligibility Verification
### Workflow
1. Navigate to the **New Patient** screen via the main dashboard.
2. Enter the patient's **SHA Member Number** in the provided field.
3. Click the **Verify** button. The system securely connects to the DHA Client Registry.
4. The patient's demographic data and SHA eligibility status are populated.
5. Complete registration. The background queue automatically syncs this patient record with the DHA Hub.

### Handling Issues
- **Patient Not Found:** Ensure the SHA number is entered exactly as shown on the member card. If the issue persists, the patient may need to update their DHA record.
- **Network Error:** The system utilizes an offline-first queue. The record is saved locally and will auto-sync once the connection is restored.

## 2. Practitioner & Facility Verification
Before any consultation can commence, the system verifies:
- **Facility Code (KMHFL):** Checked against the DHA Facility Registry.
- **Practitioner License:** Checked against the DHA Practitioner Registry.
*Note: Consultations cannot be initiated by unlicensed practitioners or within unverified facilities. This prevents rejected claims downstream.*

## 3. Claim Submission
### Process
1. Complete clinical encounter and add billable items (procedures, medicines).
2. Generate the invoice.
3. Once marked as finalized, the billing module submits the claim to the `DhaService`.
4. The claim is encapsulated in a FHIR `Claim` bundle and placed in the integration queue.
5. The queue safely transmits the claim using a secure token-refreshed connection.

### Checking Claim Status
- The background `SyncJobsModule` polls the DHA Hub for updates on submitted claims.
- Status changes (ACCEPTED, REJECTED, SETTLED) are updated on the invoice and the Integration Command Center in real-time.

## 4. The Integration Command Center
Access the command center via `/integration` on the dashboard.
- **Queue Health:** Monitor pending and dead-letter queue items.
- **Recent Claims:** View real-time status of recent SHA claims.
- **System Status:** View connection status for DHA registries.

## Support
For technical errors, view the `Dead Letter` queue on the Integration Command Center to diagnose payload issues or contact the technical admin team.
