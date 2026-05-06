# M-Pesa Reconciliation

The HMS must treat M-Pesa as eventually consistent. Safaricom may delay callbacks, retry callbacks, or return slow status responses.

## Safety Controls

- STK prompts are locked per invoice, branch, phone number, amount, and idempotency window.
- Phone, user, and facility prompt throttles reduce prompt storms.
- Safaricom calls are run behind controlled concurrency and timeouts.
- Callback handling is idempotent.
- Manual confirmation is permission-guarded, scope-checked, audited, and protected by the step-up foundation when enforcement is enabled.
- One M-Pesa receipt number must not be applied to more than one payment.
- M-Pesa credentials must never be returned to the frontend or written to logs.

## Daily Reconciliation

1. Review all pending M-Pesa payments older than the normal callback window.
2. Query Safaricom status for pending checkout request IDs.
3. Confirm completed payments once.
4. Mark failed or expired prompts as failed.
5. Compare completed HMS payments with M-Pesa statement receipts.
6. Investigate duplicate receipt warnings immediately.
7. Export the cashier close and M-Pesa reconciliation report.

## Operational Rules

- Never send repeated STK prompts for the same invoice unless the cashier explicitly resends.
- If the patient pays after an STK timeout, confirm by receipt number only after checking it is not already linked.
- Manual confirmation must include the actor, timestamp, facility, branch, invoice, checkout request, and receipt number.
- Reversed payments should be handled through a separate audited reversal workflow, not by deleting payment rows.
