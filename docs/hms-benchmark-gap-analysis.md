# HMS Benchmark Gap Analysis

This benchmark inspected five public HMS/HMIS repositories for architecture and workflow ideas only. No benchmark code was copied into this repository.

## Repositories Inspected

| Repository | Main observation | Useful ideas applied or documented |
| --- | --- | --- |
| `hmislk/hmis` | Mature Java HMIS with broad hospital modules, pharmacy depth, inward/IPD navigation, billing reconciliation docs, backup docs, privilege docs, and FHIR/API notes. | Strengthen billing/payment audit, pharmacy safety, performance docs, backup/security docs, and benchmark-driven roadmap. |
| `soulogic-mali/openclinic-ga` | Large Java clinical system with authentication, lab resources, HL7/sync utilities, many PDF generators, insurance invoices, patient cards, pharmacy reports, and queues. | Keep PDF/printouts official, add queue/backpressure foundations, improve lab/result and insurance/SHA documentation, avoid synchronous heavy report work. |
| `OpenHIMS2/OpenHIMS2-core` | Laravel HMS with multi-clinic setup, queues, dynamic clinical pages, drug defaults, duplicate detection, allergies, pharmacy stock, and local UI. | Keep duplicate patient foundation, drug defaults/stock intelligence, doctor queue improvements, allergy/clinical safety roadmap, and reference-data caching. |
| `INVIII/QuroCare` | Lightweight Node/EJS HMS with patient routes and auth pages. | Use as a reminder that basic HMS projects often lack enterprise controls; this HMS now adds stronger auth, scoped access, payment safety, and docs. |
| `UCDS/health4all_v3` | PHP/CodeIgniter HMS with patient visits, OP/IP reports, duplicate visit tools, inventory, blood bank, diagnostics, document uploads, login reports, and many operational reports. | Improve reporting roadmap, document upload/report foundations, duplicate prevention, and operational module coverage. |

## Gap Analysis By Area

| Area | Benchmark strength | Current HMS status | Action in this PR |
| --- | --- | --- | --- |
| Auth and login safety | Mature systems keep login reports and privilege docs. | Login audit, lockout, session tracking already existed but needed stronger password policy and step-up foundation. | Added strong password enforcement, progressive failed-login delay, production JWT secret hardening, step-up token foundation, and broader redaction. |
| Facility/branch isolation | Multi-institution systems separate clinics and roles. | Clinical and billing scoping existed, but user management could expose too much to facility admins. | Scoped user listing/lookup/mutation by actor facility and blocked facility admins from managing platform users. |
| Billing and payments | Mature HMIS systems emphasize cashier reconciliation and payment cancellation controls. | Invoices, cash, M-Pesa, SHA and cashier close existed. | Added explicit billing/payment permissions, scoped patient-billing lookup, manual M-Pesa confirmation scoping, receipt duplicate checks, and audit actor IDs. |
| M-Pesa/Daraja | Benchmarks generally lack Kenya-specific STK behavior. | This HMS already has facility-level Daraja and prompt locks. | Strengthened manual confirmation/failure scoping and duplicate M-Pesa receipt protection. |
| Performance | Large HMS repos document indexes and report optimization. | Cache, rate limiting, coalescing, health checks, and many indexes existed. | Capped legacy large invoice/patient list responses, kept paginated endpoints, added frontend debounced patient search, documented load strategy. |
| Reports | Health4All and CareCode have broad reports. | Reports and dashboards exist but should keep moving toward queued exports. | Added benchmark report and repo docs; existing queue/report foundations remain the safe path for heavy exports. |
| Lab and pharmacy | Benchmarks show lab PDFs, result docs, stock, expiry, structured prescribing, and pharmacy report depth. | Lab, pharmacy, branch stock, and stock-aware prescribing foundations exist. | Structured prescription items now include route, stock snapshot, accepted alternatives, and pharmacy partial-dispense quantities. |
| Printouts/PDFs | OpenClinic has many PDF generator classes. | Invoice, receipt, summaries and SHA printouts exist. | Consultation medical reports now have a guarded server-side PDF endpoint with facility letterhead, QR payload, prescriptions, lab results, and audit logging. |
| Integrations | OpenClinic has HL7 utilities; CareCode has FHIR docs. | M-Pesa, AI, SHA and outbox foundations exist. | Added interoperability gap to roadmap; no copied integration code. |
| Repository polish | Mature repos include contribution/security docs. | Root README was outdated and encoding-corrupted. | Rebuilt README and added security, support, contribution, changelog, roadmap, CI, and templates. |

## Features This HMS Already Does Better Than Many Benchmarks

- Facility-level M-Pesa/Daraja STK push, prompt locks, callback handling, and SHA payment coverage.
- Modern NestJS/Next.js structure with Prisma typing.
- Redis-backed cache/rate-limit/queue foundation with in-memory fallback.
- Request IDs, health checks, safe production errors, and structured redacted logs.
- Patient portal, AI assistant, feature flags, and data outbox foundations.
- Super-admin platform administration with user location and subscription/compliance controls.

## Safe Benchmark-Inspired Improvements Added Now

- Password policy and progressive login delay.
- Step-up token endpoint for dangerous actions.
- Explicit permission checks on billing, invoice, payment, and report endpoints.
- User management facility scoping.
- Manual M-Pesa confirmation/failure scoping and duplicate receipt protection.
- Capped legacy large list responses and frontend debounced patient search.
- Structured prescription builder with branch stock visibility and safe out-of-stock continuation.
- Pharmacy partial dispensing for structured prescription items.
- Server-side consultation medical report PDF export.
- Repository-level operational documentation and CI foundation.

## Deferred High-Value Work

- HL7/FHIR interoperability gateway.
- Full radiology/imaging workflow.
- Advanced allergies/drug interaction engine.
- More queued PDF/report exports.
- More granular invoice permissions separate from general billing write.
- Patient branch assignment migration if the product decision is to make patient demographics branch-owned instead of facility-owned.
