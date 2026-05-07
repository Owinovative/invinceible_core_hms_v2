# Roadmap

## Near Term

- Enforce step-up verification for dangerous actions after frontend prompt UX is complete.
- Add more granular invoice permissions: invoice create, line edit, line remove, discount approve.
- Move large PDFs and reports fully into background jobs.
- Expand tests for auth, branch scoping, payments, M-Pesa callbacks, and stock transactions.
- Add virtualized tables to the largest frontend lists.

## Clinical Depth

- Radiology/imaging order and result workflow.
- Allergy and drug interaction engine.
- More complete diagnosis coding and clinical terminology search.
- Lab normal ranges, critical result escalation, and verification roles.
- IPD ward round and nursing chart improvements.

## Enterprise Integrations

- HL7/FHIR interoperability gateway.
- External laboratory integration.
- SHA claim submission integration when official APIs are available.
- SMS/WhatsApp provider adapters.
- Data warehouse and read replica architecture.

## Operations

- Production dashboards for health, queues, Redis, database, failed jobs, security events, and M-Pesa failures.
- Automated backup verification.
- Load testing at 1,000, 5,000, 10,000, and 30,000 concurrent user stages.
