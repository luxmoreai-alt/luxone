import CRMModuleListPage from "../crm/CRMModuleListPage";
import { leadModuleConfig, leadsMockList } from "../../components/modules/leads/leadsMockData";

export default function LeadsPage() {
  return (
    <CRMModuleListPage
      config={leadModuleConfig}
      rows={leadsMockList}
      showNotes={true}
      showActivity={true}
    />
  );
}
