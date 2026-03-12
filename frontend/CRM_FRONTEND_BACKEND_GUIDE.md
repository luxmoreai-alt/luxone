# CRM Frontend-Backend Connection Guide

This guide explains how the CRM frontend in `frontend/` is now connected to the Django backend.

## 1. The Most Important Concept: Tenant-Aware Requests

This CRM is multi-tenant.

That means:

- login happens against the master backend
- CRM records live inside a tenant database
- after login, the frontend must send the tenant identifier on every CRM request

Without that header, Django will read from the wrong database.

## 2. Login Flow

Files involved:

- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/OtpLoginPage.tsx`
- `Backend/authentication/views.py`

### What happens

1. The frontend sends email/password or OTP login to `/api/auth/login` or `/api/auth/verify-otp`
2. Django finds the tenant database for that email
3. Django now returns:
   - `access_token`
   - `refresh_token`
   - `tenant_db`
   - `user`
4. The frontend stores those values in `localStorage`

Stored keys:

- `accessToken`
- `refreshToken`
- `tenantDb`
- `loggedInUser`

## 3. Shared API Client

File:

- `frontend/src/api/client.ts`

This file is the transport layer for the CRM frontend.

It automatically sends:

- `Authorization: Bearer <accessToken>`
- `X-Tenant-DB: <tenantDb>`

That is the connection between the logged-in frontend session and the correct tenant database in Django.

## 4. CRM Data API Layer

File:

- `frontend/src/api/crm.ts`

This file contains the actual API calls:

- `fetchLeads()`
- `fetchLead()`
- `fetchLeadNotes()`
- `fetchLeadTimeline()`
- `fetchAccounts()`
- `fetchAccount()`
- `fetchContacts()`
- `fetchContact()`
- `fetchDeals()`

It isolates raw backend DTOs from the UI.

## 5. Mapping Backend JSON Into UI Records

File:

- `frontend/src/lib/shared/crmMappers.ts`

Your UI components were designed around custom frontend record shapes like:

- `LeadRecord`
- `ContactRecord`
- `AccountRecord`

The backend returns Django-style fields like:

- `first_name`
- `lead_status`
- `annual_revenue`

The mapper file converts backend JSON into the record shape expected by the table/detail UI.

Example:

- backend: `first_name`, `last_name`
- frontend UI: `leadName`, `firstName`, `lastName`

This is a standard adapter pattern. It keeps the UI stable even if backend naming stays Django-native.

## 6. Connected Pages

These pages now use live backend data:

- `frontend/src/pages/leads/LeadsPage.tsx`
- `frontend/src/pages/leads/LeadDetailPage.tsx`
- `frontend/src/pages/contacts/ContactsPage.tsx`
- `frontend/src/pages/contacts/ContactDetailPage.tsx`
- `frontend/src/pages/accounts/AccountsPage.tsx`
- `frontend/src/pages/accounts/AccountDetailPage.tsx`
- `frontend/src/pages/DealsPage.tsx`

## 7. Backend Endpoints Used

These endpoints are now part of the CRM frontend flow:

- `POST /api/auth/check-email`
- `POST /api/auth/login`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/leads`
- `GET /api/leads/{id}`
- `GET /api/leads/{id}/notes`
- `GET /api/leads/{id}/timeline`
- `GET /api/accounts`
- `GET /api/accounts/{id}`
- `GET /api/contacts`
- `GET /api/contacts/{id}`
- `GET /api/deals`

## 8. Backend Changes Made For Frontend Friendliness

To reduce extra lookup calls, serializers now expose readable helper fields such as:

- `owner_email`
- `account_name`
- `contact_name`
- `lead_name`

Those are additive fields, so existing APIs are not broken.

## 9. What Is Fully Live vs Partially Live

Fully live now:

- lead list
- lead detail basic data
- lead notes
- lead timeline
- contact list
- contact detail basic data
- account list
- account detail basic data
- deals list

Partially live:

- many related sections in the generic detail UI still show empty state because the backend does not yet expose those domains
- examples: attachments, meetings, products, quotes, invoices, cases

That is acceptable for now because the UI is connected to real records and degrades cleanly to empty states.

## 10. How To Extend This Correctly

If you want to make another related tab live, use this order:

1. add the backend endpoint
2. add a DTO function in `frontend/src/api/crm.ts`
3. add a mapper in `frontend/src/lib/shared/crmMappers.ts`
4. pass the mapped data into the page component
5. let the generic UI render it

Do not mix raw backend field names directly into UI components. Keep the adapter layer.

## 11. How To Test

Backend:

```bash
python manage.py runserver
```

Frontend:

```bash
npm run dev
```

Then:

1. log in with a tenant admin account
2. open Leads, Contacts, Accounts, and Deals
3. inspect browser Network tab
4. confirm requests include:
   - `Authorization`
   - `X-Tenant-DB`
5. confirm data rendered in UI matches backend responses

## 12. Debugging Checklist

If data is not showing:

1. check whether `tenantDb` exists in `localStorage`
2. check whether `X-Tenant-DB` is being sent in request headers
3. check whether the JWT token exists
4. check whether the backend endpoint is under `/api/...`
5. check whether the mapper expects fields not present in the response

## 13. Architectural Lesson

The full connection path is:

1. login response returns tenant context
2. frontend stores auth + tenant state
3. shared API client sends tenant-aware headers
4. Django middleware/router picks the correct database
5. serializer returns backend JSON
6. mapper converts JSON into UI record shape
7. reusable CRM page components render the data

That is the correct separation for a scalable multi-tenant React + Django CRM.
