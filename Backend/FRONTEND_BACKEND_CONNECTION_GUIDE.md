# Frontend-Backend Connection Guide

This document explains how the admin panel values are connected to the Django backend.

## 1. Start From The HTTP Client

The admin panel uses a shared Axios client in:

- `admin_panel/src/api/axios.ts`

Key points:

- `baseURL` is `http://localhost:8000/api/`
- every request automatically sends `Authorization: Bearer <token>` if `admin_token` exists in `localStorage`

That means this frontend call:

```ts
api.get(`admin/companies/${id}`)
```

actually hits:

```text
GET http://localhost:8000/api/admin/companies/{id}
```

## 2. How The URL Reaches Django

The route is registered in:

- `Backend/crm_backend/urls.py`
- `Backend/saas_admin/urls.py`

Flow:

1. `crm_backend/urls.py` includes `saas_admin.urls` under `/api/`
2. `saas_admin/urls.py` registers `CompanyViewSet`
3. DRF router resolves `GET /api/admin/companies/{id}` to the `retrieve()` action

## 3. How The Backend Builds The Response

The company detail response is assembled in:

- `Backend/saas_admin/views.py`
- `Backend/saas_admin/serializers.py`
- `Backend/saas_admin/services.py`

### Retrieve flow

1. `CompanyViewSet.retrieve()` fetches the `Company`
2. `CompanySerializer` provides the base company fields
3. `get_company_usage_stats(company)` calculates tenant usage values
4. the final JSON is returned to the frontend

Example response shape:

```json
{
  "id": 1,
  "company_name": "Kwik Kopy Printing",
  "company_email": "admin@kwikkopy.com",
  "contact_person": "James Merced",
  "phone": "1234567890",
  "subscription_plan": "Pro",
  "db_name": "tenant_kwik_kopy_printing",
  "status": "Active",
  "created_at": "2026-03-11T10:15:00Z",
  "usage_stats": {
    "total_crm_users": 7,
    "total_leads": 31,
    "storage_used_mb": 12.75
  }
}
```

## 4. Where The Values Come From

In `Backend/saas_admin/services.py`:

- `total_crm_users` is counted from the tenant database user table
- `total_leads` is counted from the tenant database `Lead` table
- `storage_used_mb` is read from PostgreSQL using `pg_database_size`

This is the important architecture idea:

- `Company` lives in the master database
- CRM data like `User` and `Lead` live inside each tenant database
- the admin backend uses the company `db_name` to read the correct tenant values

## 5. How The Frontend Uses The Response

The consuming page is:

- `admin_panel/src/pages/CompanyDetails.tsx`

The connection is:

1. `useEffect()` runs when the page loads
2. it calls `api.get(\`admin/companies/${id}\`)`
3. response data is stored in React state
4. JSX renders:
   - company identity fields
   - `usage_stats.total_crm_users`
   - `usage_stats.total_leads`
   - `usage_stats.storage_used_mb`

This means the cards are no longer hardcoded. They now reflect backend values.

## 6. Why This Pattern Is Correct

This separation is what you want in a scalable DRF app:

- views handle HTTP
- serializers define response shape
- services contain business logic and cross-database aggregation
- frontend only consumes typed JSON and does not invent business values

## 7. How To Add Another Value Later

Example: you want to show `total_deals`.

Do it in this order:

1. add the count logic in `get_company_usage_stats()`
2. expose it in the serializer response shape
3. add it to the TypeScript type in `CompanyDetails.tsx`
4. render it in the UI card list

If you follow this order, frontend and backend stay aligned.

## 8. How To Verify The Connection

Backend:

```bash
python manage.py runserver
```

Frontend:

```bash
npm run dev
```

Then:

1. log in to the admin panel
2. open the Companies page
3. click a company name
4. confirm the detail page values match the backend response in browser devtools

## 9. Common Failure Points

- Missing JWT token: backend returns `401`
- Wrong API base URL: frontend calls the wrong server
- Tenant DB missing: usage stats fall back to zeroes
- Response shape drift: frontend expects fields the backend does not return

When debugging, always inspect:

1. the network request URL
2. the JSON response body
3. the Django view that produced it
