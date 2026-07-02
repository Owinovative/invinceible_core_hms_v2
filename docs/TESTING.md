# Testing

## 1. Test landscape

| Suite | Location | Status |
| --- | --- | --- |
| Auth unit tests | `backend/src/auth/password-policy.spec.ts`, `permissions.spec.ts` | ✅ Run in CI |
| Integration layer (eTIMS/DHA/queue/billing-flow) | `backend/src/integration/**/*.spec.ts` — 19 suites, 169 tests | ✅ Run in CI with coverage gate (90% stmts/lines/functions, 80% branches; currently ~97/98/96/84) |
| Legacy module specs | `*.controller.spec.ts` / `*.service.spec.ts` across modules | ⚠️ Placeholder stubs; need provider wiring (tracked in [CHANGELOG.md](CHANGELOG.md) known limitations) |
| Frontend | — | ⚠️ No automated tests yet; build + lint enforced |
| Load tests | `load-tests/k6-critical-hms.js` | Manual, against staging |
| E2E | `backend/test/jest-e2e.json` scaffold | Not yet populated |

## 2. Running tests

```bash
cd backend
npm test                                   # full Jest (expect legacy stubs)
npx jest src/auth --runInBand              # CI unit subset
npm run test:integration                   # 169-test integration suite
npm run test:integration:cov               # + enforced coverage thresholds
```

The integration suite needs **no DB, network, or credentials**: real
services + durable queue + worker run over an in-memory Prisma stub with
mock government adapters — the exact object graph production uses in
mock mode. Helpers in `backend/src/integration/testing/`
(`InMemoryPrisma`, `seedBillingScenario`, `installFetchMock`,
`makeConfig`). Full guide: [integrations/testing.md](integrations/testing.md).

## 3. What the integration suite proves

- **Unit**: invoice builder & VAT-exempt tax math, retry/backoff policy,
  HTTP client (timeouts, retries, secret hygiene, audit rows), durable
  queue semantics (idempotency, atomic claims, dead-letter, crash
  recovery), token manager, FHIR mapper, adapters, controllers.
- **Flow**: bill finalized → validate → queue → mock eTIMS → CU/QR
  stored → SHA claim → mock DHA → response stored → complete.
- **Failure**: API down, invalid token (401 refresh), timeout, network
  interruption, duplicate invoice (local guard + KRA 801), rejection,
  dead-letter requeue, stuck-request recovery.

## 4. Mocking strategy

| Dependency | Test double |
| --- | --- |
| Database | `InMemoryPrisma` (query-shape-compatible stub) |
| KRA eTIMS / DHA | `EtimsMockClient` / `DhaMockClient` (same adapters usable in dev/staging) |
| HTTP transport | Scripted `fetch` mock |
| Config | `makeConfig()` env-backed fake |
| Audit log | Jest spies |

## 5. Strategy & priorities to raise coverage

1. Convert placeholder specs to service tests for **billing** first
   (payments, recalculation, M-PESA callbacks) — highest financial risk.
2. Auth flows: lockout, session-version invalidation, step-up.
3. Scope enforcement regression suite (cross-tenant denial).
4. E2E happy path via `jest-e2e` scaffold with a disposable DB.
5. Frontend: component tests for billing + consultation workspaces.

CI reference: [.github/workflows/ci.yml](../.github/workflows/ci.yml) —
any failing required check fails the PR.
