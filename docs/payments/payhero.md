# PayHero Payment Integration

This integration adds PayHero as an additional payment provider for HMS invoice payments. It does not replace the existing Cash or Safaricom Daraja M-Pesa flows.

## Backend endpoints

- `POST /billing/payments/payhero/request` — starts a PayHero STK push for an invoice.
- `GET /billing/payments/payhero/status/:paymentId` — checks the local HMS payment status.
- `POST /billing/payments/payhero/callback` — PayHero callback/webhook endpoint.

## Required backend environment variables

Set these only on the backend service, for example in Render backend environment variables:

```text
PAYHERO_ENABLED=true
PAYHERO_BASE_URL=https://backend.payhero.co.ke
PAYHERO_STK_PUSH_URL=https://backend.payhero.co.ke/api/v2/payments
PAYHERO_AUTH_MODE=basic
PAYHERO_API_KEY=<from PayHero>
PAYHERO_API_SECRET=<from PayHero>
PAYHERO_CHANNEL_ID=<from PayHero>
PAYHERO_PROVIDER=m-pesa
PAYHERO_CALLBACK_URL=https://your-backend-domain.example/billing/payments/payhero/callback
PAYHERO_REQUEST_TIMEOUT_MS=15000
PAYHERO_PROMPT_LOCK_SECONDS=90
```

If PayHero gives a bearer token instead of Basic auth, set `PAYHERO_AUTH_MODE=bearer` and use `PAYHERO_BEARER_TOKEN`.

## Security rules

- Do not put PayHero credentials in frontend environment variables.
- Do not commit real PayHero credentials to GitHub.
- Do not log authorization headers, API keys, tokens, or secrets.
- Use HTTPS callback URLs in production.
- Keep the callback route public but idempotent and safe.

## Render callback URL

For the current Render backend, the callback URL should look like:

```text
https://your-render-backend.onrender.com/billing/payments/payhero/callback
```

After adding or changing backend environment variables, redeploy the backend.

## Notes

The implementation keeps PayHero as `paymentMethod = PAYHERO` in the existing payments table. Provider responses and callbacks are stored compactly and redacted/capped through the existing compact payload helpers.
