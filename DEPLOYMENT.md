# CRM Deployment Guide

This document covers the remaining non-code setup needed to run the CRM in a production-like environment.

## 1. Backend Environment

Create `Backend/.env` from `Backend/.env.example` and set real values:

- `DJANGO_SECRET_KEY`
- `DEBUG=false`
- `ALLOWED_HOSTS`
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- database credentials
- SMTP credentials

Important:

- do not use the default `django-insecure-...` secret key in production
- set `SECURE_SSL_REDIRECT=true` when HTTPS termination is ready

## 2. Frontend Environment

Create `frontend/.env` from `frontend/.env.example`.

Use one of these:

- `VITE_API_BASE_URL=/api` when frontend and backend are served behind the same domain/reverse proxy
- `VITE_API_BASE_URL=https://api.your-domain.com/api` when backend is hosted separately

## 3. Backend Setup

From `Backend/`:

```powershell
.\env\Scripts\python.exe -m pip install -r requirements.txt
.\env\Scripts\python.exe manage.py migrate
.\env\Scripts\python.exe manage.py collectstatic --noinput
```

Optional verification:

```powershell
.\env\Scripts\python.exe manage.py check --deploy
.\env\Scripts\python.exe manage.py test leads inventory services support integrations authentication deals --keepdb --noinput
```

## 4. Frontend Build

From `frontend/`:

```powershell
npm install
npm run build
```

Deploy the `frontend/dist/` output through Nginx, Apache, IIS, or a static hosting service.

## 5. Docker Deployment

The repository now includes:

- `Backend/Dockerfile`
- `Backend/entrypoint.sh`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `docker-compose.yml`
- `deploy/nginx/default.conf`
- `deploy/nginx/crm.example.conf`
- `deploy/systemd/crm-backend.service`
- `deploy/env/Backend.production.env.example`
- `deploy/scripts/generate-django-secret.ps1`

Quick start:

```powershell
copy Backend\.env.example Backend\.env
copy frontend\.env.example frontend\.env
docker compose up --build -d
```

After that:

- frontend: `http://localhost/`
- backend health: `http://localhost/health/`
- API: `http://localhost/api/`
- smoke check: `.\deploy\scripts\smoke-check.ps1`

## 6. Reverse Proxy

Recommended setup:

- serve frontend from `/`
- proxy backend API through `/api/`
- expose backend health endpoint at `/health/`
- serve uploaded files from `/media/`

## 7. Production Checklist

- HTTPS enabled
- strong secret key configured
- `DEBUG=false`
- real allowed hosts configured
- CORS restricted to known frontend domains
- CSRF trusted origins configured
- PostgreSQL backups scheduled
- error logs collected
- health check monitored
- SMTP credentials tested

## 8. Backup And Restore Helpers

PowerShell helper scripts are included for Docker-based deployments:

```powershell
.\deploy\scripts\backup-db.ps1
.\deploy\scripts\restore-db.ps1 -BackupFile .\deploy\backups\crm-backup-YYYYMMDD-HHMMSS.sql
```

These use the running `db` container and create SQL dump files under `deploy/backups/`.

## 9. Smoke Test Helper

After deployment, run:

```powershell
.\deploy\scripts\smoke-check.ps1
```

Optional custom URL:

```powershell
.\deploy\scripts\smoke-check.ps1 -BaseUrl https://crm.your-domain.com
```

## 10. Non-Docker VPS Setup Helpers

If you deploy directly on a Linux VPS instead of Docker:

- copy `deploy/nginx/crm.example.conf` and replace `crm.example.com`
- copy `deploy/systemd/crm-backend.service` and adjust paths if needed
- use `deploy/env/Backend.production.env.example` as your production backend env template

To generate a strong Django secret locally:

```powershell
.\deploy\scripts\generate-django-secret.ps1
```

## 11. What Is Still Manual

These items cannot be completed from the local codebase alone:

- buying or assigning production domains
- server provisioning
- SSL certificate setup
- Nginx / IIS / Apache installation
- database backup scheduling
- monitoring and alerting setup
- production `.env` secret values
- Docker installation on the target server if you use the compose setup

## 12. Health Endpoint

Backend health URL:

```text
/health/
```

It returns a simple JSON response to confirm the backend is reachable.
