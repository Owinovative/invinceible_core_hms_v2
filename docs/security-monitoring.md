# Security Monitoring

Monitor these events continuously in production:

- repeated failed logins from one account, IP, facility, or subnet;
- account lockouts;
- repeated 403 responses;
- super admin login and step-up verification;
- role changes, user creation, user activation, and user deactivation;
- M-Pesa settings changes;
- manual payment confirmation;
- invoice line removal or discount changes;
- report exports and PDF downloads;
- public invoice verification bursts;
- unusually high search traffic;
- Redis fallback or queue failures.

Logs must include request ID, actor user ID where available, facility ID, branch ID, action, result, duration, IP, and user agent. Logs must not include passwords, JWTs, cookies, reset tokens, M-Pesa passkeys, M-Pesa consumer secrets, database URLs, or AI provider keys.

Recommended alerts:

- five or more failed logins for one account in five minutes;
- ten or more failed logins from one IP in five minutes;
- any production JWT secret validation failure;
- Redis unavailable for more than five minutes;
- database readiness failure;
- M-Pesa failure rate above normal baseline;
- queue depth growing without worker progress;
- repeated public verification 429 responses;
- any manual payment confirmation outside working hours.
