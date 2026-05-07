# Security Policy

Invinceible Core HMS handles sensitive hospital, patient, staff, billing, and payment workflows. Report security issues privately.

## Report A Vulnerability

Do not open a public GitHub issue for security problems. Share:

- affected route or workflow,
- reproduction steps,
- expected and actual behavior,
- potential impact,
- logs or screenshots with secrets and patient data removed.

## Security Baseline

- Production secrets must live only in Railway, Vercel, database, Redis, or provider secret stores.
- `.env` files, database dumps, M-Pesa secrets, JWT secrets, and private keys must never be committed.
- Password hashes, reset tokens, JWTs, cookies, M-Pesa passkeys, consumer secrets, and database URLs must never be returned by APIs or logged.
- Facility and branch access must be preserved in every clinical, billing, pharmacy, lab, report, and admin workflow.
- Security changes should include tests or a clear manual verification note.

## Supported Branches

Security fixes should target the current production branch and any active release branch that is still deployed.
