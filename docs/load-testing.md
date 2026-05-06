# Load Testing Guide

Use this guide to test the HMS safely before exposing it to large traffic.

Do not run 30,000-user tests against production during hospital operating hours.

## Tool Options

Install k6:

```bash
choco install k6
```

or use autocannon for single endpoint tests:

```bash
npx autocannon -c 100 -d 60 http://localhost:3000/health/live
```

## Stages

Run staged tests in this order:

- 100 users
- 500 users
- 1,000 users
- 5,000 users
- 10,000 users
- 30,000 users

Stop immediately if error rate rises or database CPU is saturated.

## Metrics To Watch

- p50 latency
- p95 latency
- p99 latency
- error rate
- backend CPU
- backend memory
- database CPU
- database connections
- Redis hit rate
- Redis memory
- queue length
- failed jobs
- M-Pesa duplicate lock count

## Required Environment

```bash
set BASE_URL=https://your-backend.example.com
set HMS_TOKEN=optional-auth-token
set PUBLIC_VERIFY_CODE=optional-invoice-verification-code
set RUN_MPESA=false
```

Keep `RUN_MPESA=false` unless testing in Safaricom sandbox or a controlled production payment window.

## Endpoint Coverage

Test these flows:

- `/health/live`
- `/health/ready`
- dashboard endpoint
- billing dashboard endpoint
- patient search suggestions
- invoice list
- facility list
- login rate limit
- public invoice verification
- M-Pesa STK duplicate protection

## k6 Example

Create a scenario file or use `load-tests/k6-critical-hms.js` if present.

```bash
k6 run load-tests/k6-critical-hms.js
```

## Autocannon Examples

Dashboard:

```bash
npx autocannon -c 500 -d 120 -H "Authorization=Bearer %HMS_TOKEN%" "%BASE_URL%/dashboard/system-health"
```

Patient search:

```bash
npx autocannon -c 500 -d 120 -H "Authorization=Bearer %HMS_TOKEN%" "%BASE_URL%/patients/search/suggestions?search=a"
```

Login rate limit:

```bash
npx autocannon -c 50 -d 60 -m POST -H "Content-Type=application/json" -b "{\"usernameOrEmail\":\"bad\",\"password\":\"bad\"}" "%BASE_URL%/auth/login"
```

## Pass Criteria

Initial target:

- p95 under 800 ms for cached dashboards
- p99 under 2 seconds for common list endpoints
- error rate under 1 percent during steady state
- no backend crash
- no Redis outage crash
- no duplicate M-Pesa prompt for the same invoice lock window

Hard 30,000-user tests require multiple backend replicas, Redis, a tuned database pool, and worker separation.
