# PDF and Printout Audit

This audit covers official server-generated PDF documents in Invinceible Core HMS.

## Server PDF endpoints

- `GET /billing/invoices/:id/pdf` - official invoice PDF.
- `GET /billing/invoices/verify.pdf` - authenticated invoice verification PDF.
- `GET /billing/invoices/verify/public.pdf` - public-safe verified invoice PDF.
- `GET /billing/payments/:id/receipt.pdf` - official payment receipt PDF.
- `GET /reports/medical/consultations/:id.pdf` - official consultation medical report PDF.
- `GET /ipd-clinical/documents/admissions/:admissionId/medical-summary.pdf` - IPD medical summary PDF.
- `GET /ipd-clinical/documents/admissions/:admissionId/discharge-summary.pdf` - discharge summary PDF.
- `GET /ipd-clinical/documents/admissions/:admissionId/treatment-chart.pdf` - inpatient treatment chart PDF.
- `GET /sha-claims/:id/pdf` - SHA claim PDF.

## Shared design system

Official PDFs use `backend/src/common/pdf/hospital-pdf.ts` for:

- Letter-size pages.
- Compact margins.
- Premium hospital letterhead with logo frame, document title block, verification QR, and official footer rail.
- Compact information lists instead of metric cards.
- Compact clinical paragraphs with readable section framing.
- Compact tables with strong headers, alternating rows, and printer-safe contrast.
- Shared totals and signature blocks for official financial and clinical documents.
- Footer/page numbering on actual content pages.
- QR payload generation for exact document routes where available.

Set `PUBLIC_API_BASE_URL` or `BACKEND_PUBLIC_URL` in production so QR codes embedded in protected PDFs open the real backend document endpoint. If Railway exposes `RAILWAY_PUBLIC_DOMAIN`, the helper can use it as a fallback.

## Browser print audit

Some frontend pages still include optional browser print previews for on-screen convenience. Official document downloads must use backend PDF endpoints and `application/pdf` responses. Browser print is not treated as the official PDF generation path.

## Current limitations

- Prescription, lab result, cashier close, stock, audit activity, branch performance, and doctor workload report PDFs need dedicated backend endpoints if they are to become official downloadable documents. They should reuse the shared helper instead of creating browser-print-only layouts.
- SHA claims are now generated with the shared compact Letter-size design, not the older A4 manual layout.
