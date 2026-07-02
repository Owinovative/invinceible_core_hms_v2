# Security

Security posture of the HMS across transport, application, data, and
operational layers, with a threat model and recommendations. Companion
checklists: [production-security-checklist.md](production-security-checklist.md),
[security-monitoring.md](security-monitoring.md),
[security-testing.md](security-testing.md).

## 1. Defense-in-depth summary

| Layer | Controls |
| --- | --- |
| Transport | HTTPS everywhere (Vercel/Render TLS); HSTS in production; CORS origin allow-list with credential support |
| HTTP hardening | `x-powered-by` disabled; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy: no-referrer`; restrictive `Permissions-Policy`; body-size limits (`BODY_LIMIT`) |
| Authentication | bcrypt password hashing; lockout + progressive jittered delays; single-active-session via session versions; JWT expiry; step-up re-auth for sensitive actions ([AUTHENTICATION.md](AUTHENTICATION.md)) |
| Authorization | Route guards (roles + permissions) and tenant scoping on every query ([AUTHORIZATION.md](AUTHORIZATION.md)) |
| Input | Global `ValidationPipe` (whitelist, forbid unknown values); Prisma parameterized queries (no raw SQL injection surface) |
| Rate limiting | Category-based limits (auth 10/min default, search, dashboards, PDFs, M-PESA prompts, public verification) via Redis or memory |
| Secrets | Environment-only; startup validation rejects weak/missing production secrets; `SafeLoggerService` redacts tokens/passwords/keys/DB URLs from all logs; integration API audit stores metadata only |
| Auditability | Immutable `audit_logs` with actor, facility, before/after; integration API log per external call with correlation IDs; user-location/session tracking |
| Supply chain | Locked dependencies (`npm ci`); CI `npm audit` (high+ on production deps) and gitleaks secret scan on every PR; Dependabot config |

## 2. Threat model (STRIDE-oriented)

| Threat | Vector | Mitigations |
| --- | --- | --- |
| Spoofing | Credential stuffing, token theft | Lockouts + delays + rate limits; short-lived JWTs; session versioning (stolen tokens die on next login); localStorage exposure accepted with XSS mitigations below — see recommendations |
| Tampering | Cross-tenant writes, payment forgery | `ScopeService` assertions on every mutation; M-PESA callbacks validated against stored `CheckoutRequestID`s and duplicate-receipt checks; fiscal documents immutable once ACCEPTED (reversal only via credit notes) |
| Repudiation | Disputed clinical/financial actions | Audit rows with actor + before/after on all sensitive mutations; receipts/claims carry generated numbers; eTIMS CU signatures |
| Information disclosure | PHI leaks via logs/errors | Secret-redacting logger; generic 500 envelopes; no stack traces to clients; response payloads scoped by tenancy; data-privacy guidance in [data-privacy-consent.md](data-privacy-consent.md) |
| Denial of service | Brute force, expensive endpoints | Rate-limit categories; request timeouts; body limits; queue-based heavy work; M-PESA prompt concurrency caps |
| Elevation of privilege | Role misuse, IDOR | Permission matrix enforced server-side; numeric IDs always filtered through facility scope (IDOR-safe by construction); step-up for the most sensitive operations |

## 3. Sensitive data handling

- **PHI** (demographics, diagnoses, results) — tenant-scoped, audited
  access; no PHI in logs or integration audit tables.
- **Credentials** — user password hashes only (bcrypt); facility M-PESA
  credentials stored per facility for multi-tenant Daraja; government
  credentials (eTIMS `cmcKey`, DHA client secret) live only in
  environment/secret managers.
- **Payment data** — no card data anywhere; M-PESA callbacks store
  compacted payloads with size caps.

## 4. Public endpoints (deliberate)

| Endpoint | Hardening |
| --- | --- |
| `POST /billing/payments/mpesa/callback`, PayHero callbacks | Matched to pending payments by provider request IDs; idempotent; audited; rate-limited |
| `GET /billing/public/verify/...` (invoice/receipt verification) | Requires invoice number + verification code pair; rate-limited (`PUBLIC_VERIFY_RATE_LIMIT_MAX`) |
| `/health/*` | No sensitive payloads |
| Password-reset request | Token-based, expiring, non-enumerating responses |

## 5. Security recommendations (prioritized)

1. **Token storage**: migrate the frontend token from `localStorage` to
   an httpOnly, SameSite cookie (with CSRF token) to harden against XSS
   exfiltration; alternatively add short-lived access + refresh rotation.
2. **Enable step-up in production** (`STEP_UP_ENFORCEMENT_ENABLED=true`)
   for payment confirmation, user management, and M-PESA settings.
3. **Content-Security-Policy**: add a strict CSP header on the frontend
   (currently relying on framework defaults).
4. **Decimal money migration** (integrity): move Float money columns to
   `Decimal` (also listed in [ROADMAP.md](ROADMAP.md)).
5. **Field-level encryption** for national IDs and signatures at rest if
   required by DPA/regulator guidance.
6. **Webhook signatures**: when Safaricom/PayHero offer callback signing
   in your tier, verify signatures in addition to request-ID matching.
7. **Regular restore drills** of database backups
   ([DEPLOYMENT.md](DEPLOYMENT.md) §Backups).

## 6. Vulnerability management

- CI fails on high-severity production-dependency advisories
  (`npm audit`) and on leaked secrets (gitleaks).
- Known remediations applied: transitive `multer` forced to 2.2.0
  (DoS advisories) via package override; `qs` bumped.
- Report vulnerabilities per [SECURITY.md policy](../SECURITY.md) at the
  repository root (responsible disclosure).
