import CRMCreatePage, { type CRMCreateSection } from "../../components/crm/CRMCreatePage";
import { createLead } from "../../lib/api/leadsApi";
import {
  INDUSTRY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  RATING_OPTIONS,
  SALUTATION_OPTIONS,
} from "../../config/crm/createOptions";

type LeadCreateValues = {
  leadOwner: string;
  salutation: string;
  firstName: string;
  company: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  fax: string;
  mobile: string;
  website: string;
  leadSource: string;
  leadStatus: string;
  industry: string;
  noOfEmployees: string;
  annualRevenue: string;
  rating: string;
  emailOptOut: boolean;
  skypeId: string;
  secondaryEmail: string;
  twitter: string;
  country: string;
  flatNo: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  description: string;
};

const initialValues: LeadCreateValues = {
  leadOwner: "",
  salutation: "",
  firstName: "",
  company: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  fax: "",
  mobile: "",
  website: "",
  leadSource: "",
  leadStatus: "",
  industry: "",
  noOfEmployees: "",
  annualRevenue: "",
  rating: "",
  emailOptOut: false,
  skypeId: "",
  secondaryEmail: "",
  twitter: "@",
  country: "",
  flatNo: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  latitude: "",
  longitude: "",
  description: "",
};

const sections: CRMCreateSection[] = [
  {
    title: "Lead Information",
    fields: [
      { name: "leadOwner", label: "Lead Owner", type: "owner" },
      {
        name: "salutation",
        label: "First Name",
        type: "name-composite",
        options: SALUTATION_OPTIONS,
        secondaryName: "firstName",
      },
      { name: "title", label: "Title", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "mobile", label: "Mobile", type: "text" },
      { name: "leadSource", label: "Lead Source", type: "select", options: LEAD_SOURCE_OPTIONS },
      { name: "industry", label: "Industry", type: "select", options: INDUSTRY_OPTIONS },
      { name: "annualRevenue", label: "Annual Revenue", type: "currency" },
      { name: "emailOptOut", label: "Email Opt Out", type: "checkbox" },

      { name: "company", label: "Company", type: "text" },
      { name: "lastName", label: "Last Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "fax", label: "Fax", type: "text" },
      { name: "website", label: "Website", type: "text" },
      { name: "leadStatus", label: "Lead Status", type: "select", options: LEAD_STATUS_OPTIONS },
      { name: "noOfEmployees", label: "No. of Employees", type: "number" },
      { name: "rating", label: "Rating", type: "select", options: RATING_OPTIONS },
      { name: "skypeId", label: "Skype ID", type: "text" },
      { name: "secondaryEmail", label: "Secondary Email", type: "email" },
      { name: "twitter", label: "Twitter", type: "text" },
    ],
  },
  {
    title: "Address Information",
    cardStyle: "boxed",
    cardTitle: "Address",
    widthClassName: "w-[48%]",
    fields: [
      { name: "country", label: "Country / Region", type: "country" },
      { name: "flatNo", label: "Flat / House No./ Building / Apartment Name", type: "text" },
      { name: "street", label: "Street Address", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State / Province", type: "state" },
      { name: "zipCode", label: "Zip / Postal Code", type: "text" },
      { name: "latitude", label: "Latitude", type: "text" },
      { name: "longitude", label: "Longitude", type: "text" },
    ],
  },
  {
    title: "Description Information",
    fields: [{ name: "description", label: "Description", type: "textarea", rows: 5 }],
  },
];

export default function CreateLeadPage() {
  const handleSubmit = async (values: LeadCreateValues) => {
    await createLead({
      leadOwner: values.leadOwner,
      salutation: values.salutation,
      firstName: values.firstName,
      lastName: values.lastName,
      company: values.company,
      title: values.title,
      email: values.email,
      phone: values.phone,
      fax: values.fax,
      mobile: values.mobile,
      website: values.website,
      leadSource: values.leadSource,
      leadStatus: values.leadStatus,
      industry: values.industry,
      noOfEmployees: values.noOfEmployees,
      annualRevenue: values.annualRevenue,
      rating: values.rating,
      secondaryEmail: values.secondaryEmail,
      skypeId: values.skypeId,
      twitter: values.twitter,
      country: values.country,
      flatNo: values.flatNo,
      street: values.street,
      city: values.city,
      state: values.state,
      zipCode: values.zipCode,
      latitude: values.latitude,
      longitude: values.longitude,
      description: values.description,
    });
  };

  return (
    <CRMCreatePage
      title="Create Lead"
      initialValues={initialValues}
      sections={sections}
      backPath="/leads"
      onSubmit={handleSubmit}
    />
  );
}