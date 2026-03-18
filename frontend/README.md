# CRM Frontend

This frontend talks to the Django backend through the `/api` base path.

## Run locally

Start the backend from `Backend/`:

```bash
python manage.py runserver
```

Start the frontend from `frontend/`:

```bash
npm run dev
```

## Connection details

- `frontend/.env` sets `VITE_API_BASE_URL=/api`
- `frontend/vite.config.ts` proxies `/api` to `http://127.0.0.1:8000`
- after login, the app stores `accessToken`, `refreshToken`, and `tenantDb`
- `frontend/src/api/client.ts` sends `Authorization` and `X-Tenant-DB` automatically

## Quick checks

- make sure Django is running on `http://127.0.0.1:8000`
- make sure Vite is running, not just the built HTML
- make sure login succeeds and `tenantDb` exists in `localStorage`
- make sure frontend requests are going to `/api/...`
