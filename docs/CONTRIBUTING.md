# Contributing

This document adapts the root [CONTRIBUTING.md](../CONTRIBUTING.md) for
day-to-day engineering. Invinceible Core HMS is healthcare
infrastructure: changes must protect **patient safety, facility
isolation, payment integrity, and uptime**.

## Ground rules

- Never weaken authentication, authorization, branch scoping, or audit
  logging; never log secrets or patient data.
- Typed DTOs on every route; guards + permissions on every controller;
  scope checks in services; pagination + Prisma `select` on lists.
- Queue heavy work (PDFs, exports, imports, external APIs).
- Schema changes ship with **both** MySQL and PostgreSQL migrations and a
  regenerated PostgreSQL schema.
- Feature flags for anything not production-ready; default off.

## Workflow

1. Branch from `main`: `feature/<slug>`, `fix/<slug>`, `docs/<slug>`.
2. Small, logical commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:` …).
3. Before opening a PR:
   ```bash
   cd backend && npm run lint:integration && npm run build && npm test
   cd ../frontend && npm run build
   ```
4. PR description must cover: summary, security/privacy impact,
   facility-scoping impact, migration notes, commands run, limitations.
5. CI must pass (lint, builds, unit + integration tests with coverage
   gate, npm audit, secret scan). Reviews required before merge; no
   self-merges to `main`.

## Quality gates for new code

| Area | Expectation |
| --- | --- |
| New backend modules | Service tests; integration-layer-style coverage for external connectors |
| New endpoints | Guarded, validated, scoped, paginated; regenerate [API_REFERENCE.md](API_REFERENCE.md) |
| New env vars | Validated in `env.validation.ts`, documented in [CONFIGURATION.md](CONFIGURATION.md), added to `.env.example` |
| UI | Loading/empty/error states; permission-gated actions; mobile check |
| Docs | Update the relevant file in `/docs` in the same PR |

## Reporting issues & vulnerabilities

Bugs/features: GitHub issues with the provided templates.
Security reports: follow [SECURITY.md](../SECURITY.md) (private
disclosure) — never open public issues for vulnerabilities.
