import CRMModuleListPage from "../crm/CRMModuleListPage";
import { contactModuleConfig, contactsMockList } from "../../components/modules/contacts/contactsMockData";

export default function ContactsPage() {
  return (
    <CRMModuleListPage
      config={contactModuleConfig}
      rows={contactsMockList}
      showNotes={true}
      showActivity={false}
    />
  );
}
