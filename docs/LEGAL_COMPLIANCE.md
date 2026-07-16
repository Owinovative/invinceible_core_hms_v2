# Legal & Compliance Module Architecture

## Overview
The Legal & Compliance Module ensures that Invinceible Core HMS meets the stringent data protection and privacy requirements of operating a healthcare system in Kenya. This includes compliance with the **Data Protection Act, 2019** and the **Digital Health Act, 2023**, particularly regarding user consent, audit trails, and data minimization.

## Architecture & Workflow

### 1. Database Schema
Two new models have been introduced to manage legal documents and their acceptances:
- `LegalDocument`: Stores versioned, server-sanitized HTML for Terms of Use, Privacy Policy, and Cookie Policies. Includes states: `DRAFT`, `PUBLISHED`, and `ARCHIVED`.
- `LegalAcceptance`: Records the exact version of the document a user accepted, along with timestamp, IP address, and User-Agent, providing an irrefutable audit trail.

### 2. Mandatory Consent Flow (First Login)
Upon successful authentication, the system checks if the user has accepted all currently `PUBLISHED` legal documents:
- If a new version has been published (or if it is their first login), `requiresLegalConsent` is set to `true` in the API response.
- The frontend login interceptor redirects the user to `/consent`.
- The user cannot bypass this screen and access the dashboard without explicitly accepting the policies.

### 3. Public Legal Pages
Beautifully crafted, SEO-friendly, and print-ready pages are accessible without login:
- `/terms`
- `/privacy`
These pages feature a sticky Table of Contents, scroll progress indicators, and premium typography suitable for an enterprise SaaS product.

### 4. Admin Management Console
Accessible at `Settings > Legal Documents` by Super Admins.
- Every administration API requires the explicit `legal.manage` permission.
- Draft and published content is sanitized server-side using a strict tag,
  attribute, and URL-scheme allowlist. The consent screen renders an escaped
  text representation rather than injecting HTML into the DOM.
- Enables the drafting of new versions.
- Publishing a new version automatically archives the previous one.
- Publishing instantly forces all users to re-consent on their next login or session refresh.

## APIs
- `GET /legal/documents/published`: Publicly retrieves current published versions.
- `POST /legal/accept`: Authenticated endpoint to record consent.
- `GET /legal/admin/documents`: Retrieves version history (`legal.manage`).
- `POST /legal/admin/documents`: Creates or edits a sanitized draft (`legal.manage`).
- `POST /legal/admin/documents/:id/publish`: Promotes a sanitized draft to published status (`legal.manage`).

## Future Enhancements
- **Patient Portal Consent**: Extend the `LegalAcceptance` model to cover patients logging into the patient portal, explicitly capturing their consent for processing sensitive health data under the DPA.
- **KRA eTIMS Consent**: Add specific clauses and potentially a separate consent check when the facility enables the KRA eTIMS integration, authorizing the system to transmit financial data to the Kenya Revenue Authority.
- **SHA Claims Authorization**: Document patient authorization for claims processing with the Social Health Authority directly within the triage/admission workflow.
