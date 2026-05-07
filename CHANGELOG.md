# Changelog

## Unreleased

- Added benchmark gap analysis against five public HMS/HMIS repositories.
- Hardened authentication with stronger password policy, progressive failed-login delay, production JWT secret checks, and step-up token foundation.
- Prevented password hashes from being returned by user management APIs.
- Scoped facility-admin user management to the actor facility and blocked facility admins from creating or managing platform users.
- Added explicit billing, invoice, payment, and report permissions.
- Strengthened M-Pesa manual confirmation/failure scoping and duplicate receipt handling.
- Capped legacy large patient and invoice list responses and added frontend debounced patient search.
- Expanded security redaction in audit logging.
- Added repository security, contribution, support, roadmap, CI, and issue/PR templates.
