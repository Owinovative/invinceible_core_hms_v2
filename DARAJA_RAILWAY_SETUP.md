# Safaricom Daraja on Railway

This backend supports M-PESA STK Push through Safaricom Daraja.

Render migration note: Railway remains supported while Render is being
validated. When the backend is moved to Render, set the same `MPESA_*`
variables on the Render backend service and update `MPESA_CALLBACK_URL` in
Safaricom and facility settings to the Render backend URL.

## Required Railway variables

Set these on the Railway backend service:

```env
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_PASSKEY=your_lipa_na_mpesa_passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://your-railway-domain.up.railway.app/billing/payments/mpesa/callback
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
```

Use `CustomerPayBillOnline` for Paybill and `CustomerBuyGoodsOnline` for Till or Buy Goods.

## Facility-level setup

Each facility can now carry its own Daraja configuration from Platform > Facilities:

- M-PESA shortcode/paybill/till/account number
- Daraja environment: `sandbox` or `production`
- Consumer key, consumer secret, and Lipa na M-PESA passkey
- Callback URL
- Transaction type

If a facility field is empty, the backend falls back to the Railway variables above. This lets one deployed backend support a default merchant account and also support facilities that have their own Safaricom app.

## How the backend applies this as a developer flow

The STK Push request is resolved from the invoice, not from the frontend form alone:

1. The cashier opens an invoice and enters the phone number and amount.
2. The backend loads the invoice, patient, facility, and branch.
3. The backend selects Daraja credentials in this order:
   - facility-specific Daraja credentials when the facility has them enabled;
   - Railway environment variables when facility credentials are empty.
4. The backend selects the payment shortcode/transaction type from the facility settings first, then Railway defaults.
5. The backend creates one pending payment request with the invoice id, phone, amount, checkout request id, and merchant request id.
6. Safaricom calls the Railway callback URL.
7. The callback updates the pending payment, records the receipt/reference, and recalculates the invoice balance.

Do not put Daraja secrets in Vercel, Render frontend, or any frontend `.env` file. Only the backend deployment environment should know consumer keys, consumer secrets, and passkeys.

## App flow

1. Open an invoice.
2. Enter amount and patient M-PESA phone number.
3. Click `Create M-PESA Request`.
4. The backend sends one STK Push and saves it as a pending payment.
5. Safaricom calls `/billing/payments/mpesa/callback`.
6. The backend confirms or fails the payment and recalculates the invoice.
7. If a callback is delayed, use `Check Status` on the pending payment.
8. If the patient did not receive the prompt, use `Resend STK Push`.

Duplicate sends for the same invoice, amount, and phone number are blocked while a recent request is pending.

## Duplicate protection

The backend blocks accidental double STK Pushes for the same invoice, phone number, and amount while a recent request is still pending. If the patient did not receive the prompt, use the explicit `Resend STK Push` action instead of pressing create repeatedly.

## Railway deployment checklist

1. Open the Railway backend service.
2. Add the `MPESA_*` variables listed above.
3. Deploy the backend.
4. Run database migrations if Railway did not run them automatically:

```bash
npx prisma migrate deploy
```

5. In the Safaricom Daraja portal, set the callback URL to the public Railway backend URL.
6. In Platform > Facilities, configure facility-specific payment settings where a facility has its own paybill, till, shortcode, or Daraja app.
7. Test with one small sandbox invoice first, then move to production credentials.

## Production notes

For production:

```env
MPESA_ENV=production
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
```

Use `CustomerPayBillOnline` for paybill payments and `CustomerBuyGoodsOnline` for till or buy-goods payments. The shortcode, passkey, callback URL, and transaction type must match the Safaricom app that owns the payment channel.

If a facility has its own Daraja app, enter that facility's consumer key, consumer secret, passkey, shortcode, transaction type, and callback URL in the facility record. If it does not, leave those fields blank and the Railway defaults will handle the payment.

## Callback URL to set in Daraja

Use the public Railway backend URL:

```text
https://your-railway-domain.up.railway.app/billing/payments/mpesa/callback
```

The same path is used for global Railway variables and facility-specific callback URLs.

## Render callback URL

After Render backend validation, use the public Render backend URL:

```text
https://your-render-backend.onrender.com/billing/payments/mpesa/callback
```

Keep the Railway callback active until production traffic and Daraja callbacks
are confirmed on Render.
 