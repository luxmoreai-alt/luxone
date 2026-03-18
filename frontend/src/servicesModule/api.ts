import { apiRequest } from "../api/client";
import type {
  AppointmentFormData,
  AppointmentRecord,
  BusinessHours,
  BusinessHoursDetails,
  CompanyDetails,
  DomainMapping,
  FiscalYearSettings,
  Holiday,
  JobSheetFormData,
  JobSheetRecord,
  LookupOption,
  ServiceFormData,
  ServiceMember,
  ServiceRecord,
  ServiceSettings,
  TeamMember,
} from "./types";
import { businessHoursPayloadFromForm, formatDuration, normalizeBusinessHoursDays } from "./utils";

type Paginated<T> = { results: T[] };

function toList<T>(payload: T[] | Paginated<T>) {
  return Array.isArray(payload) ? payload : payload.results;
}

function asString(value: unknown) {
  return value == null ? "" : String(value);
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapServiceSettings(item: any): ServiceSettings {
  return {
    id: asString(item.id),
    isServicesEnabled: Boolean(item.is_services_enabled),
    defaultTimezone: asString(item.default_timezone),
    hidePromo: Boolean(item.hide_promo),
    businessHoursConfigured: Boolean(item.business_hours_configured),
    fiscalYearConfigured: Boolean(item.fiscal_year_configured),
    domainMappingConfigured: Boolean(item.domain_mapping_configured),
    companyDetails: item.company_details
      ? {
          id: "summary",
          companyName: asString(item.company_details.company_name),
          companyEmail: asString(item.company_details.company_email),
          contactPerson: asString(item.company_details.contact_person),
          phone: asString(item.company_details.phone),
          address: asString(item.company_details.address),
        }
      : null,
  };
}

function mapBusinessHours(item: any): BusinessHours {
  return {
    id: asString(item.id),
    name: asString(item.name),
    timezone: asString(item.timezone),
    isDefault: Boolean(item.is_default),
    createdAt: asString(item.created_at),
    updatedAt: asString(item.updated_at),
    days: normalizeBusinessHoursDays(item),
  };
}

function mapBusinessHoursDetails(item: any): BusinessHoursDetails | null {
  if (!item) return null;
  const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
  return {
    id: asString(item.id),
    name: asString(item.name),
    timezone: asString(item.timezone),
    isDefault: Boolean(item.is_default),
    days: dayKeys.reduce((acc, day) => {
      const payload = item.days?.[day];
      acc[day] = {
        enabled: Boolean(payload?.enabled),
        slots: Array.isArray(payload?.slots)
          ? payload.slots.map((slot: any) => ({
              start: asString(slot.start),
              end: asString(slot.end),
            }))
          : [],
      };
      return acc;
    }, {} as BusinessHoursDetails["days"]),
  };
}

function mapServiceMember(item: any): ServiceMember {
  return {
    id: asString(item.id),
    serviceId: asString(item.service),
    memberId: asString(item.member),
    memberEmail: asString(item.member_email),
    isPrimary: Boolean(item.is_primary),
  };
}

function mapService(item: any): ServiceRecord {
  return {
    id: asString(item.id),
    serviceCode: asString(item.service_code),
    serviceName: asString(item.service_name),
    description: asString(item.description),
    price: asNumber(item.price),
    durationMinutes: asNumber(item.duration_minutes),
    durationLabel: formatDuration(asNumber(item.duration_minutes)),
    locationType: asString(item.location_type),
    location: asString(item.location),
    status: asString(item.status),
    availableDaysMode: asString(item.available_days_mode),
    availableTimeMode: asString(item.available_time_mode),
    businessHours: asString(item.business_hours),
    businessHoursName: asString(item.business_hours_name),
    businessHoursTimezone: asString(item.business_hours_timezone),
    businessHoursDetails: mapBusinessHoursDetails(item.business_hours_details),
    membersCount: asNumber(item.members_count),
    locationBehavior: asString(item.location_behavior),
    publicBookingUrl: asString(item.public_booking_url),
    members: Array.isArray(item.members) ? item.members.map(mapServiceMember) : undefined,
    createdAt: asString(item.created_at),
    updatedAt: asString(item.updated_at),
  } as ServiceRecord;
}

function mapAppointment(item: any): AppointmentRecord {
  return {
    id: asString(item.id),
    appointmentNumber: asString(item.appointment_number),
    serviceId: asString(item.service),
    serviceName: asString(item.service_name),
    serviceDurationMinutes: asNumber(item.service_duration_minutes),
    businessHoursName: asString(item.business_hours_name),
    businessHoursTimezone: asString(item.business_hours_timezone),
    businessHoursDetails: mapBusinessHoursDetails(item.business_hours_details),
    locationType: asString(item.location_type),
    appointmentForType: item.appointment_for_type || "other",
    appointmentForId: asString(item.appointment_for_id),
    appointmentForDisplay: asString(item.appointment_for_display),
    appointmentDate: asString(item.appointment_date),
    appointmentStartTime: asString(item.appointment_start_time),
    appointmentEndTime: asString(item.appointment_end_time),
    assignedMemberId: asString(item.assigned_member),
    assignedMemberEmail: asString(item.assigned_member_email),
    location: asString(item.location),
    status: asString(item.status),
    notes: asString(item.notes),
    publicBookingUrl: asString(item.public_booking_url),
    createdAt: asString(item.created_at),
    updatedAt: asString(item.updated_at),
  } as AppointmentRecord;
}

function mapJobSheet(item: any): JobSheetRecord {
  return {
    id: asString(item.id),
    appointmentId: asString(item.appointment),
    serviceId: asString(item.service),
    serviceName: asString(item.service_name),
    customerType: asString(item.customer_type),
    customerId: asString(item.customer_id),
    title: asString(item.title),
    status: asString(item.status),
    fields: Array.isArray(item.fields)
      ? item.fields.map((field: any) => ({
          id: asString(field.id),
          fieldName: asString(field.field_name),
          fieldLabel: asString(field.field_label),
          fieldType: field.field_type || "text",
          fieldValue: asString(field.field_value),
        }))
      : [],
    createdAt: asString(item.created_at),
    updatedAt: asString(item.updated_at),
  };
}

function mapCompanyDetails(item: any): CompanyDetails {
  return {
    id: asString(item.id),
    companyName: asString(item.company_name),
    companyEmail: asString(item.company_email),
    contactPerson: asString(item.contact_person),
    phone: asString(item.phone),
    address: asString(item.address),
    publicBookingBaseUrl: asString(item.public_booking_base_url),
    serviceContactName: asString(item.service_contact_name),
    serviceContactEmail: asString(item.service_contact_email),
    defaultTimezone: asString(item.default_timezone),
  };
}

function mapDomainMapping(item: any): DomainMapping {
  return {
    id: asString(item.id),
    accountType: item.account_type,
    domain: asString(item.domain),
    cnameTarget: asString(item.cname_target),
    verificationStatus: item.verification_status,
    publicBookingBaseUrl: asString(item.public_booking_base_url),
    createdAt: asString(item.created_at),
    updatedAt: asString(item.updated_at),
  };
}

function mapFiscalYear(item: any): FiscalYearSettings {
  return {
    id: asString(item.id),
    fiscalYearType: item.fiscal_year_type,
    startsInMonth: asNumber(item.starts_in_month),
    currentPeriodStart: asString(item.current_period_start),
    currentPeriodEnd: asString(item.current_period_end),
    fiscalYearLabel: asString(item.fiscal_year_label),
  };
}

function mapHoliday(item: any): Holiday {
  return {
    id: asString(item.id),
    name: asString(item.name),
    date: asString(item.date),
    description: asString(item.description),
  };
}

function buildServicePayload(values: ServiceFormData) {
  return {
    service_name: values.serviceName,
    description: values.description || undefined,
    price: values.price,
    duration_minutes: values.durationMinutes,
    location_type: values.locationType,
    location: values.location || undefined,
    status: values.status,
    available_days_mode: values.availableDaysMode,
    available_time_mode: values.availableTimeMode,
    business_hours: values.businessHoursId || undefined,
  };
}

function buildAppointmentPayload(values: AppointmentFormData) {
  return {
    service: Number(values.serviceId),
    appointment_for_type: values.appointmentForType,
    appointment_for_id: values.appointmentForId ? Number(values.appointmentForId) : undefined,
    appointment_for_label: values.appointmentForType === "other" ? values.appointmentForLabel || undefined : undefined,
    appointment_date: values.appointmentDate,
    appointment_start_time: values.appointmentStartTime,
    appointment_end_time: values.appointmentEndTime || undefined,
    assigned_member: values.assignedMemberId ? Number(values.assignedMemberId) : undefined,
    location: values.location || undefined,
    status: values.status,
    notes: values.notes || undefined,
  };
}

function buildJobSheetPayload(values: JobSheetFormData) {
  return {
    appointment: values.appointmentId ? Number(values.appointmentId) : undefined,
    service: Number(values.serviceId),
    customer_type: values.customerType || undefined,
    customer_id: values.customerId ? Number(values.customerId) : undefined,
    title: values.title,
    status: values.status,
    fields: values.fields.map((field) => ({
      field_name: field.fieldName,
      field_label: field.fieldLabel,
      field_type: field.fieldType,
      field_value: field.fieldValue,
    })),
  };
}

export async function getServicesSetupStatus() {
  return mapServiceSettings(await apiRequest<any>("/services/setup-status/"));
}

export async function updateServicesSetupStatus(payload: Partial<{ hidePromo: boolean; defaultTimezone: string }>) {
  return mapServiceSettings(
    await apiRequest<any>("/services/setup-status/", {
      method: "PATCH",
      body: JSON.stringify({
        hide_promo: payload.hidePromo,
        default_timezone: payload.defaultTimezone,
      }),
    })
  );
}

export async function enableServices() {
  return mapServiceSettings(await apiRequest<any>("/services/enable/", { method: "POST" }));
}

export async function listBusinessHours() {
  return toList(await apiRequest<any[] | Paginated<any>>("/services/business-hours/")).map(mapBusinessHours);
}

export async function createBusinessHours(values: BusinessHours) {
  return mapBusinessHours(
    await apiRequest<any>("/services/business-hours/", {
      method: "POST",
      body: JSON.stringify({
        name: values.name,
        timezone: values.timezone,
        is_default: values.isDefault,
        ...businessHoursPayloadFromForm(values.days),
      }),
    })
  );
}

export async function updateBusinessHours(id: string, values: BusinessHours) {
  return mapBusinessHours(
    await apiRequest<any>(`/services/business-hours/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        name: values.name,
        timezone: values.timezone,
        is_default: values.isDefault,
        ...businessHoursPayloadFromForm(values.days),
      }),
    })
  );
}

export async function deleteBusinessHours(id: string) {
  await apiRequest(`/services/business-hours/${id}/`, { method: "DELETE" });
}

export async function setDefaultBusinessHours(id: string) {
  return mapBusinessHours(await apiRequest<any>(`/services/business-hours/${id}/set-default/`, { method: "POST" }));
}

export async function listTeamMembers(query = "") {
  return toList(await apiRequest<any[] | Paginated<any>>("/services/team-members/", { query: { q: query } })).map(
    (item) =>
      ({
        id: asString(item.id),
        email: asString(item.email),
        label: asString(item.label || item.email),
      }) as TeamMember
  );
}

export async function listServices(query?: Record<string, string | number>) {
  return toList(await apiRequest<any[] | Paginated<any>>("/services/", { query })).map(mapService);
}

export async function getService(id: string) {
  return mapService(await apiRequest<any>(`/services/${id}/`));
}

export async function createService(values: ServiceFormData) {
  return mapService(await apiRequest<any>("/services/", { method: "POST", body: JSON.stringify(buildServicePayload(values)) }));
}

export async function updateService(id: string, values: ServiceFormData) {
  return mapService(
    await apiRequest<any>(`/services/${id}/`, { method: "PATCH", body: JSON.stringify(buildServicePayload(values)) })
  );
}

export async function deleteService(id: string) {
  await apiRequest(`/services/${id}/`, { method: "DELETE" });
}

export async function setServiceMembers(id: string, memberIds: string[], primaryMemberId?: string) {
  const payload = await apiRequest<any[]>(`/services/${id}/members/`, {
    method: "POST",
    body: JSON.stringify({
      member_ids: memberIds.map(Number),
      primary_member_id: primaryMemberId ? Number(primaryMemberId) : undefined,
    }),
  });
  return payload.map(mapServiceMember);
}

export async function listServiceMembers(id: string) {
  return toList(await apiRequest<any[] | Paginated<any>>(`/services/${id}/members/`)).map(mapServiceMember);
}

export async function listAppointments(query?: Record<string, string | number>) {
  return toList(await apiRequest<any[] | Paginated<any>>("/services/appointments/", { query })).map(mapAppointment);
}

export async function getAppointment(id: string) {
  return mapAppointment(await apiRequest<any>(`/services/appointments/${id}/`));
}

export async function createAppointment(values: AppointmentFormData) {
  return mapAppointment(
    await apiRequest<any>("/services/appointments/", { method: "POST", body: JSON.stringify(buildAppointmentPayload(values)) })
  );
}

export async function updateAppointment(id: string, values: AppointmentFormData) {
  return mapAppointment(
    await apiRequest<any>(`/services/appointments/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(buildAppointmentPayload(values)),
    })
  );
}

export async function cancelAppointment(id: string) {
  return mapAppointment(await apiRequest<any>(`/services/appointments/${id}/cancel/`, { method: "POST" }));
}

export async function listJobSheets(query?: Record<string, string | number>) {
  return toList(await apiRequest<any[] | Paginated<any>>("/services/job-sheets/", { query })).map(mapJobSheet);
}

export async function getJobSheet(id: string) {
  return mapJobSheet(await apiRequest<any>(`/services/job-sheets/${id}/`));
}

export async function createJobSheet(values: JobSheetFormData) {
  return mapJobSheet(
    await apiRequest<any>("/services/job-sheets/", { method: "POST", body: JSON.stringify(buildJobSheetPayload(values)) })
  );
}

export async function updateJobSheet(id: string, values: JobSheetFormData) {
  return mapJobSheet(
    await apiRequest<any>(`/services/job-sheets/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(buildJobSheetPayload(values)),
    })
  );
}

export async function getCompanyDetails() {
  return mapCompanyDetails(await apiRequest<any>("/settings/company-details/"));
}

export async function updateCompanyDetails(values: CompanyDetails) {
  return mapCompanyDetails(
    await apiRequest<any>("/settings/company-details/", {
      method: "PATCH",
      body: JSON.stringify({
        company_name: values.companyName,
        company_email: values.companyEmail,
        contact_person: values.contactPerson,
        phone: values.phone,
        address: values.address,
      }),
    })
  );
}

export async function listDomainMappings() {
  return toList(await apiRequest<any[] | Paginated<any>>("/settings/domain-mapping/")).map(mapDomainMapping);
}

export async function createDomainMapping(accountType: string, domain: string) {
  return mapDomainMapping(
    await apiRequest<any>("/settings/domain-mapping/", {
      method: "POST",
      body: JSON.stringify({ account_type: accountType, domain }),
    })
  );
}

export async function verifyDomainMapping(id: string) {
  return mapDomainMapping(
    await apiRequest<any>("/settings/domain-mapping/verify/", { method: "POST", body: JSON.stringify({ id: Number(id) }) })
  );
}

export async function getFiscalYearSettings() {
  return mapFiscalYear(await apiRequest<any>("/settings/fiscal-year/"));
}

export async function updateFiscalYearSettings(values: FiscalYearSettings) {
  return mapFiscalYear(
    await apiRequest<any>("/settings/fiscal-year/", {
      method: "PATCH",
      body: JSON.stringify({
        fiscal_year_type: values.fiscalYearType,
        starts_in_month: values.startsInMonth,
      }),
    })
  );
}

export async function listHolidays() {
  return toList(await apiRequest<any[] | Paginated<any>>("/settings/holidays/")).map(mapHoliday);
}

export async function createHoliday(values: Omit<Holiday, "id">) {
  return mapHoliday(
    await apiRequest<any>("/settings/holidays/", {
      method: "POST",
      body: JSON.stringify({ name: values.name, date: values.date, description: values.description }),
    })
  );
}

export async function updateHoliday(id: string, values: Omit<Holiday, "id">) {
  return mapHoliday(
    await apiRequest<any>(`/settings/holidays/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name: values.name, date: values.date, description: values.description }),
    })
  );
}

export async function deleteHoliday(id: string) {
  await apiRequest(`/settings/holidays/${id}/`, { method: "DELETE" });
}

export async function listLookupOptions(type: "contact" | "account" | "lead" | "deal" | "case" | "product", q = "") {
  if (type === "product" || type === "contact" || type === "account" || type === "deal" || type === "case") {
    const endpointMap = {
      product: "/support/lookups/products",
      contact: "/support/lookups/contacts",
      account: "/support/lookups/accounts",
      deal: "/support/lookups/deals",
      case: "/support/lookups/cases",
    } as const;
    const payload = await apiRequest<any[]>(endpointMap[type], { query: { q } });
    return payload.map(
      (item) =>
        ({
          id: asString(item.id),
          label: asString(item.label || item.name),
          subtitle: asString(item.email || item.account_name || item.product_code || ""),
          email: asString(item.email),
          phone: asString(item.phone),
        }) as LookupOption
    );
  }

  const payload = await apiRequest<any[] | Paginated<any>>("/leads", { query: { search: q } });
  return toList(payload).map(
    (item: any) =>
      ({
        id: asString(item.id),
        label: `${asString(item.first_name)} ${asString(item.last_name)}`.trim() || asString(item.email),
        subtitle: asString(item.email || item.company),
        email: asString(item.email),
        phone: asString(item.phone),
      }) as LookupOption
  );
}
