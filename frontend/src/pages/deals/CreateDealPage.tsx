import CRMCreatePage, { type CRMCreateSection } from "../../components/crm/CRMCreatePage";
import {
  DEAL_STAGE_OPTIONS,
  DEAL_TYPE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
} from "../../config/crm/createOptions";

type DealCreateValues = {
  dealOwner: string;
  dealName: string;
  accountName: string;
  contactName: string;
  amount: string;
  closingDate: string;
  stage: string;
  probability: string;
  type: string;
  leadSource: string;
  nextStep: string;
  description: string;
};

const initialValues: DealCreateValues = {
  dealOwner: "",
  dealName: "",
  accountName: "",
  contactName: "",
  amount: "",
  closingDate: "",
  stage: "",
  probability: "",
  type: "",
  leadSource: "",
  nextStep: "",
  description: "",
};

const sections: CRMCreateSection[] = [
  {
    title: "Deal Information",
    fields: [
      { name: "dealOwner", label: "Deal Owner", type: "owner" },
      { name: "dealName", label: "Deal Name", type: "text" },
      { name: "accountName", label: "Account Name", type: "text" },
      { name: "contactName", label: "Contact Name", type: "text" },
      { name: "amount", label: "Amount", type: "currency" },
      { name: "closingDate", label: "Closing Date", type: "text", placeholder: "YYYY-MM-DD" },
      { name: "stage", label: "Stage", type: "select", options: DEAL_STAGE_OPTIONS },
      { name: "probability", label: "Probability (%)", type: "number" },
      { name: "type", label: "Type", type: "select", options: DEAL_TYPE_OPTIONS },
      { name: "leadSource", label: "Lead Source", type: "select", options: LEAD_SOURCE_OPTIONS },
      { name: "nextStep", label: "Next Step", type: "text" },
    ],
  },
  {
    title: "Description Information",
    fields: [{ name: "description", label: "Description", type: "textarea", rows: 5 }],
  },
];

export default function CreateDealPage() {
  const handleSubmit = async (values: DealCreateValues) => {
    const payload = {
      dealOwner: values.dealOwner,
      dealName: values.dealName,
      accountName: values.accountName,
      contactName: values.contactName,
      amount: values.amount,
      closingDate: values.closingDate,
      stage: values.stage,
      probability: values.probability,
      type: values.type,
      leadSource: values.leadSource,
      nextStep: values.nextStep,
      description: values.description,
    };

    console.log("Deal payload:", payload);

    // TODO: Replace with your real API call
    // POST API URL:
    // /api/deals

    await Promise.resolve();
  };

  return (
    <CRMCreatePage
      title="Create Deal"
      initialValues={initialValues}
      sections={sections}
      backPath="/deals"
      onSubmit={handleSubmit}
    />
  );
}