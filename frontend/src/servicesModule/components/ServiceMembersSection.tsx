import CRMSectionCard from "../../components/crm/CRMSectionCard";
import type { ServiceMember, TeamMember } from "../types";

type Props = {
  members: ServiceMember[];
  teamMembers?: TeamMember[];
};

export default function ServiceMembersSection({ members, teamMembers = [] }: Props) {
  return (
    <CRMSectionCard title="Assigned Members">
      <div className="space-y-2">
        {members.length ? (
          members.map((member) => {
            const teamMember = teamMembers.find((item) => item.id === member.memberId);
            return (
              <div key={member.id} className="rounded-lg border border-slate-200 p-3">
                <div className="break-all text-sm font-medium text-slate-800">{teamMember?.label || member.memberEmail}</div>
                <div className="mt-1 text-xs text-slate-500">{member.isPrimary ? "Primary Member" : "Service Member"}</div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-slate-500">No members assigned yet.</div>
        )}
      </div>
    </CRMSectionCard>
  );
}
