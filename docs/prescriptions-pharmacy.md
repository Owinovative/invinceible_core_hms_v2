# Prescriptions And Pharmacy Workflow

## Doctor Prescribing

Doctors and clinicians should prescribe structured medicine items, not free-text notes only.

Each prescription item stores:

- medicine ID
- medicine name snapshot
- dosage
- route
- frequency
- duration
- quantity prescribed
- instructions
- branch stock status at the time of prescribing
- accepted alternative reference when the doctor chooses an in-stock alternative

Stock is checked against the current branch. Prescribing does not reduce stock; stock is reduced only when pharmacy dispenses.

## Out-Of-Stock Handling

When a selected drug is out of stock:

- the doctor sees an out-of-stock warning
- the system lists deterministic in-stock alternatives using generic name, category, form, strength, and branch stock where available
- the recommendation is labelled as support, not an automatic clinical decision
- the doctor must choose whether to use the alternative or continue/cancel
- accepted alternatives are recorded for auditability

## Pharmacy Dispensing

Pharmacy receives structured prescription items with patient, doctor, date, dosage, route, frequency, duration, instructions, and quantity.

The pharmacist can:

- dispense full quantity
- dispense partial quantity
- leave remaining quantity for later
- avoid negative stock
- trigger billing lines where the existing billing integration supports it

Stock deduction runs in a database transaction. A failed stock movement must fail the dispense operation safely.

## Safety Rules

- Doctors prescribe; pharmacists dispense.
- Branch users only see stock for their allowed branch unless their permissions allow wider access.
- Pharmacy dispensing must not expose another branch's stock.
- Manual corrections should be audited with actor, facility, branch, prescription, and item information.
