# Safaricom Daraja on Railway

This backend supports M-PESA STK Push through Safaricom Daraja.

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
