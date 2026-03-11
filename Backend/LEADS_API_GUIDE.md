# Leads API Documentation

This backend now supports the full Lead Detail Page workflow while preserving the original lead CRUD routes.

## Active Endpoints

Existing endpoints retained:

- `GET /api/leads`
- `POST /api/leads`
- `POST /api/leads/bulk-delete`
- `GET /api/leads/{id}`
- `PUT /api/leads/{id}`
- `PATCH /api/leads/{id}`
- `DELETE /api/leads/{id}`

New lead-detail endpoints:

- `POST /api/leads/{id}/clone`
- `GET /api/leads/{id}/timeline`
- `GET /api/leads/{id}/notes`
- `POST /api/leads/{id}/notes`
- `POST /api/leads/{id}/convert`

## Architecture

The implementation is split into domain apps so each module owns its own data model and helper services:

- `leads`: lead CRUD, lead-detail orchestration, clone/conversion endpoints
- `activities`: lead timeline records
- `notes`: lead note records
- `accounts`: account records created from lead conversion
- `contacts`: contact records created from lead conversion
- `deals`: optional deal records created from lead conversion

Lead-facing business flows are coordinated from `leads/services.py`, while each supporting app exposes focused creation helpers in its own `services.py`.

## Lead Detail Response

`GET /api/leads/{id}` returns:

- `id`
- `first_name`
- `last_name`
- `company`
- `title`
- `email`
- `phone`
- `mobile`
- `website`
- `lead_source`
- `lead_status`
- `industry`
- `annual_revenue`
- `employee_count`
- `rating`
- `owner`
- `street`
- `city`
- `state`
- `country`
- `zip_code`
- `skype_id`
- `secondary_email`
- `description`
- `created_at`
- `updated_at`

## Activity Timeline

The system auto-creates timeline entries when a lead is:

- created
- updated
- cloned
- converted
- annotated with a new note

Each timeline item includes `action`, `description`, `user`, and `timestamp`.

## Conversion Flow

`POST /api/leads/{id}/convert`

Request body:

```json
{
  "create_deal": true,
  "deal_name": "Kwik Kopy Expansion",
  "deal_value": "50000.00"
}
```

Response:

```json
{
  "message": "Lead converted successfully",
  "account_id": 1,
  "contact_id": 1,
  "deal_id": 1
}
```

## Learning Guide

Use this sequence when extending DRF modules safely:

1. Start with the data model. Add only fields and tables required by the UI flow, and add indexes for common filters/searches.
2. Keep orchestration in `services.py`. Views should only validate input, call services, and shape HTTP responses.
3. Use `ModelViewSet` actions for detail-page behaviors that belong to one resource, such as `/clone`, `/timeline`, `/notes`, and `/convert`.
4. Add serializer classes per use case instead of forcing one serializer to handle every response shape.
5. Log important state changes in a dedicated activity model rather than burying history in audit text fields.
6. Add tests for each custom action before relying on the frontend integration.

## Swagger

Open Swagger at:

- `http://localhost:8000/swagger/`

Authorize with:

`Bearer <access_token>`
