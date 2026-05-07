# Contributing

Invinceible Core HMS is healthcare infrastructure. Changes must protect patient safety, facility isolation, payment integrity, and operational uptime.

## Engineering Rules

- Keep changes scoped and reviewable.
- Do not weaken authentication, authorization, branch scoping, or audit logging.
- Do not expose secrets or patient data in logs.
- Prefer typed DTOs, guarded controllers, service-level scope checks, and Prisma `select` for list responses.
- Add pagination for large lists.
- Queue heavy exports, reports, imports, and PDFs where practical.
- Run backend and frontend builds before opening a PR.

## Pull Requests

Every PR should include:

- summary of changes,
- security and privacy impact,
- facility/branch scoping impact,
- migration notes,
- commands run,
- known limitations.

## Local Checks

```bash
cd backend
npm run build
npm run test

cd ../frontend
npm run build
```
