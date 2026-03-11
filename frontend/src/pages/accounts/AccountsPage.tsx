import CRMModuleListPage from "../crm/CRMModuleListPage";
import { accountModuleConfig, accountsMockList } from "../../components/modules/accounts/accountsMockData";

export default function AccountsPage() {
  return (
    <CRMModuleListPage
      config={accountModuleConfig}
      rows={accountsMockList}
      showNotes={true}
      showActivity={false}
    />
  );
}
