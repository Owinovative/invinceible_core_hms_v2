# Security Testing

Run these checks before major releases.

## Auth Tests

- Login succeeds with valid credentials.
- Login returns the same safe error for wrong password and unknown user.
- Repeated failures increase delay and eventually lock the account.
- Inactive users cannot log in.
- Weak production `JWT_SECRET` fails startup.
- Password reset tokens are stored hashed and single-use.
- Step-up endpoint requires the current account password.

## Authorization Tests

- Facility admin cannot view another facility's users.
- Facility admin cannot create `SUPER_ADMIN` or `ADMIN`.
- Branch user cannot read another branch invoice.
- Cashier can collect payment but cannot change M-Pesa settings.
- Doctor cannot manually confirm payments.
- Lab technician cannot edit billing.
- Pharmacist cannot edit lab results.

## Payment Tests

- Duplicate STK prompts for the same invoice/phone/amount are blocked.
- Repeated Safaricom callbacks do not create duplicate payments.
- One `mpesaReceiptNumber` cannot be applied to two payments.
- Manual confirmation is audited with actor user and staff IDs.
- Failed payment update is scoped by facility/branch for authenticated users.

## API Abuse Tests

- Login endpoint returns 429 when the auth limit is exceeded.
- Search endpoints return 429 when flooded.
- PDF/report endpoints return 429 under repeated requests.
- Public invoice verification is rate-limited.
- Large bodies are rejected.

## Data Privacy Tests

- `passwordHash` never appears in user API responses.
- M-Pesa passkey and consumer secret never appear in API responses.
- Patient data from another facility is not visible.
- Report exports are audit logged.
