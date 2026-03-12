import CRMCreatePage, { type CRMCreateSection } from "../../components/crm/CRMCreatePage";
import { createContact } from "../../lib/api/contactsApi";
import { SALUTATION_OPTIONS } from "../../config/crm/createOptions";

type ContactCreateValues = {
  contactOwner: string;
  salutation: string;
  firstName: string;
  lastName: string;
  accountName: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  otherPhone: string;
  fax: string;
  assistant: string;
  assistantPhone: string;
  country: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
};

const initialValues: ContactCreateValues = {
  contactOwner: "",
  salutation: "",
  firstName: "",
  lastName: "",
  accountName: "",
  title: "",
  department: "",
  email: "",
  phone: "",
  mobile: "",
  otherPhone: "",
  fax: "",
  assistant: "",
  assistantPhone: "",
  country: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  description: "",
};

const sections: CRMCreateSection[] = [
  {
    title: "Contact Information",
    fields: [
      { name: "contactOwner", label: "Contact Owner", type: "owner" },
      {
        name: "salutation",
        label: "First Name",
        type: "name-composite",
        options: SALUTATION_OPTIONS,
        secondaryName: "firstName",
      },
      { name: "accountName", label: "Account Name", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "department", label: "Department", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },

      { name: "lastName", label: "Last Name", type: "text" },
      { name: "mobile", label: "Mobile", type: "text" },
      { name: "otherPhone", label: "Other Phone", type: "text" },
      { name: "fax", label: "Fax", type: "text" },
      { name: "assistant", label: "Assistant", type: "text" },
      { name: "assistantPhone", label: "Assistant Phone", type: "text" },
    ],
  },
  {
    title: "Address Information",
    cardStyle: "boxed",
    cardTitle: "Mailing Address",
    widthClassName: "w-[48%]",
    fields: [
      { name: "country", label: "Country / Region", type: "country" },
      { name: "street", label: "Street", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State / Province", type: "state" },
      { name: "zipCode", label: "Zip / Postal Code", type: "text" },
    ],
  },
  {
    title: "Description Information",
    fields: [{ name: "description", label: "Description", type: "textarea", rows: 5 }],
  },
];

export default function CreateContactPage() {
  const handleSubmit = async (values: ContactCreateValues) => {
    await createContact({
      contactOwner: values.contactOwner,
      salutation: values.salutation,
      firstName: values.firstName,
      lastName: values.lastName,
      accountName: values.accountName,
      title: values.title,
      department: values.department,
      email: values.email,
      phone: values.phone,
      mobile: values.mobile,
      otherPhone: values.otherPhone,
      fax: values.fax,
      assistant: values.assistant,
      assistantPhone: values.assistantPhone,
      country: values.country,
      street: values.street,
      city: values.city,
      state: values.state,
      zipCode: values.zipCode,
      description: values.description,
    });
  };

  return (
    <CRMCreatePage
      title="Create Contact"
      initialValues={initialValues}
      sections={sections}
      backPath="/contacts"
      onSubmit={handleSubmit}
    />
  );
}