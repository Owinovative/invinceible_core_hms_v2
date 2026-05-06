# Multi-Tenant Facility Isolation

Facility isolation is mandatory. A normal user only sees data for the assigned facility, and branch-scoped users only see assigned branches unless `canAccessAllBranchesInFacility` is enabled.

## Implemented helpers

- `ScopeService.getUserScope(user)`
- `ScopeService.buildFacilityScopeWhere(user)`
- `ScopeService.buildBranchScopeWhere(user)`
- `ScopeService.assertFacilityAccess(user, facilityId)`
- `ScopeService.assertBranchAccess(user, facilityId, branchId)`

## Rules

- Super admins can see all facilities.
- Facility admins remain limited to their facility.
- Branch users remain limited to their branch access set.
- Patient portal users only see the `Patient` record linked to their own `portalUserId`.
- Reports, payments, invoices, lab, pharmacy, IPD, and appointments must always include facility scope.
- M-Pesa credentials are facility-scoped and must never be returned in frontend payloads.

## Test focus

Cross-facility access must be denied for patients, invoices, payments, lab orders, prescriptions, appointments, staff, facility settings, reports, and audit logs.
