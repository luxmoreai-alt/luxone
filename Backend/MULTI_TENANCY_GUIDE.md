# Multi-Tenant SaaS PostgreSQL Setup Guide

Welcome to the Multi-Tenant mode for CRMS2! Here is how the infrastructure works behind the scenes so you can understand the database provisioning magic.

## 1. Master Database Setup
To handle tenant database definitions and super admin operations, `settings.py` now routes by default into a master database named `crms2_master` running on **PostgreSQL**.

> **Manual Action Required:**
> Please ensure your local PostgreSQL server is running and create the master database:
> ```sql
> CREATE DATABASE crms2_master;
> ```

You can configure your PostgreSQL credentials via `.env`:
```env
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
```

## 2. Dynamic Database Provisioning
When a Super Admin creates a new client company via the `saas_admin` application, the system fires off a raw `CREATE DATABASE company_db_name;` SQL query using `psycopg2` via the master connection.
Immediately after, it dynamically triggers Django's `call_command('migrate', database=db_name)` to build the CRM schema tables on that fresh database.

## 3. Dynamic Database Routing
We hooked into Django's core with two files:
- **`crm_backend/middleware.py`**: Intercepts requests. If it identifies the user's tenant (e.g. from `/api/auth/login` payload domain mapping), it creates a Python `Threading.Local()` context holding the tenant's DB name.
- **`crm_backend/routers.py`**: The `TenantRouter` forces Django's ORM queries to read from and write to whatever database name is set in the `ThreadLocal` context, effectively isolating all data by tenant seamlessly!
