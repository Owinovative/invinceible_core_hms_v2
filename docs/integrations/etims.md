# KRA eTIMS Integration

Fiscalizes every finalized patient bill with KRA's electronic Tax Invoice
Management System. Implemented in `backend/src/integration/etims/`.

## When fiscalization triggers

`BillingService` calls `EtimsService.onBillingFinalized(invoiceId)` after:

- a cash payment is recorded,
- an M-PESA payment is confirmed (manual, callback, or status query),
- SHA coverage is applied to an invoice,
- an invoice is closed.

The call is **idempotent** (one active SALE document per invoice, enforced
locally before KRA ever sees a duplicate) and **non-blocking**: the
document is created locally, queued durably, and submitted by the
background worker. eTIMS downtime never fails or delays billing.

## Document lifecycle

```
PENDING -> QUEUED -> ACCEPTED   (CU number, receipt signature, QR stored)
                  -> REJECTED   (KRA refused; non-retryable, audited)
                  -> CANCELLED  (reversed by a full credit note)
```

Retryable failures keep the document `QUEUED` while the durable queue
retries with exponential backoff; exhausted requests land in the
dead-letter list (`GET /integrations/etims/queue/dead-letters`) and can be
requeued after the cause is fixed.

## What is stored per fiscalized document (`etims_invoices`)

- `cuInvoiceNumber`, `cuReceiptNumber` — control-unit identifiers from KRA
- `receiptSignature`, `internalData`, `sdcId`, `mrcNumber`, `sdcDateTime`
- `qrCodeUrl` — the KRA receipt verification URL
  (`.../indexEtimsReceiptData?Data={tin}{bhfId}{rcptSign}`)
- `qrCodeData` — pre-rendered QR PNG (data URL) for receipts
- tax totals and the per-code `taxBreakdown`
- full `requestPayload` / `responsePayload` for audit and replay analysis
- `attemptCount`, `lastAttemptAt`, `errorMessage`, `correlationId`

## VAT handling for medical services

Kenyan medical services are VAT-exempt, so every invoice line defaults to
KRA tax type **A (exempt)** — configurable via `ETIMS_DEFAULT_TAX_CODE`.
The tax utilities also support `B` (16%), `C` (zero-rated), `D` (non-VAT)
and `E` (8%) for vatable pharmacy/consumable lines; amounts are treated as
VAT-inclusive and the tax is extracted per line.

## Credit notes, debit notes, cancellation

- **Credit note** — `POST /integrations/etims/invoices/:id/credit-note`
  with `{ reason, itemIds? }`. Sent with `rcptTyCd=R` referencing the
  original CU invoice number (`orgInvcNo`). `itemIds` produces a partial
  credit note.
- **Debit note** — `.../debit-note`. Additional charge referencing the
  original sale (`rcptTyCd=S`, `orgInvcNo` set).
- **Cancellation** — `.../cancel` issues a **full credit note** and marks
  the local sale `CANCELLED`. This mirrors KRA practice: an accepted fiscal
  document cannot be deleted, only reversed.

Trader document numbers are derived from the HMS invoice number
(`INV-000001`, `INV-000001-CN1`, `INV-000001-DN1`); the numeric `invcNo`
sent to KRA is the immutable `etims_invoices.id`.

## Adapters

- **`EtimsMockClient`** (`ETIMS_MODE=mock`, default) — deterministic
  in-memory implementation mirroring KRA semantics (result `000` success,
  `801` duplicate). Used in development, tests, and CI.
- **`EtimsHttpClient`** (`sandbox`/`production`) — OSCU-style HTTP adapter.
  Authentication uses the device credentials (`tin`, `bhfId`, `cmcKey`)
  issued during device initialization (`/selectInitOsdcInfo`); sales go to
  `/saveTrnsSalesOsdc`; status lookups to `/selectTrnsSalesStatus`.
  Transient KRA result codes are retried; permanent ones dead-letter.

## Assumptions (pending official confirmation)

- Endpoint paths follow the published OSCU specification; a VSCU
  deployment only needs a different `ETIMS_BASE_URL`.
- Item classification uses a healthcare UNSPSC-style default
  (`85121800`) until a full KRA item-catalog sync is implemented.
- Patients rarely present a KRA PIN at the point of care, so `custTin` is
  null (walk-in sale) unless a PIN is later captured on the patient record.
