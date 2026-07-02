# Integration Layer Testing Guide

## Running the tests

```bash
cd backend

# Full integration-layer suite (169 tests, 19 suites)
npm run test:integration

# With coverage + enforced thresholds (90% stmts/lines/functions, 80% branches)
npm run test:integration:cov

# Lint the integration layer
npm run lint:integration
```

The suite needs no database, no network, and no credentials: it runs the
real services, queue, worker, and builders over an in-memory Prisma stub
(`src/integration/testing/in-memory-prisma.ts`) with the mock adapters —
the same object graph production uses with `*_MODE=mock`.

## What is covered

**Unit tests**
- `etims-invoice.builder.spec.ts` — HMS invoice → eTIMS payload mapping,
  credit/debit notes, validation failures
- `etims-tax.util.spec.ts` — VAT-exempt medical services, per-code
  breakdowns, VAT-inclusive extraction, rounding
- `http/retry-policy.spec.ts` — exponential backoff, jitter bounds,
  retryable status classification
- `http/integration-http.client.spec.ts` — success, retry, timeout,
  network failure, header/secret hygiene, audit rows per attempt
- `queue/integration-queue.service.spec.ts` — idempotent enqueue, atomic
  claims, backoff scheduling, dead-lettering, stuck-request recovery,
  requeue
- `queue/integration-queue.worker.spec.ts` — handler dispatch, missing
  handlers, retry vs permanent failures
- `token/token-manager.spec.ts` — caching, single-flight refresh, expiry,
  invalidation
- `dha/fhir-mapper.spec.ts` — all FHIR resource mappings
- adapter and controller specs for both integrations

**Integration tests**
- `billing-flow.integration.spec.ts` — the complete workflow:
  bill finalized → validation → durable queue → mock eTIMS → CU number +
  QR stored → SHA claim → mock DHA → response stored → transaction
  complete
- `etims.service.spec.ts` / `dha.service.spec.ts` — service flows against
  the mock APIs, including manual sync

**Failure tests**
- API unavailable (network error / KRA 999 / DHA 504) → queued retry with
  backoff, then automatic recovery
- Invalid token → 401 triggers one token refresh + retry; persistent 401
  fails the call
- Timeout → classified `TIMEOUT`, audited, retried
- Network interruption mid-flow → request survives in the durable queue
- Duplicate invoice → local one-active-SALE guard *and* KRA result `801`
  (document `REJECTED`, request dead-lettered)
- Queue recovery → crashed `PROCESSING` rows recovered, dead letters
  requeued with a fresh budget

## Coverage

Enforced by `test/jest-integration.json` (used locally and in CI):

| Metric | Threshold | Current |
| --- | --- | --- |
| Statements | 90% | ~97% |
| Lines | 90% | ~98% |
| Functions | 90% | ~96% |
| Branches | 80% | ~84% |

Test infrastructure (`src/integration/testing/`) is excluded from
coverage. CI uploads the HTML report as the `integration-coverage`
artifact.

## Writing new tests

Use the shared helpers:

```ts
import { InMemoryPrisma, seedBillingScenario } from './testing/in-memory-prisma';
import { makeConfig, makeAudit, makeLogger, installFetchMock } from './testing/test-support';
```

- `makeConfig({ ETIMS_MODE: 'sandbox' })` — typed config over fake env
- `seedBillingScenario(prisma)` — facility + patient + invoice with items
- `installFetchMock([...])` — scripted `fetch` responses for HTTP-client
  level tests (JSON, text, errors, aborts)
