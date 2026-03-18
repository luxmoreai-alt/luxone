export type ProjectStatus =
  | "Planning"
  | "Active"
  | "On Hold"
  | "Delayed"
  | "Completed"
  | "Cancelled";

export type ProjectPriority = "Low" | "Medium" | "High" | "Critical";

export type ProjectTaskStatus =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "Completed";

export type ProjectIssueSeverity = "Low" | "Medium" | "High" | "Critical";

export interface ProjectTask {
  id: string | number;
  title: string;
  owner: string;
  due_date: string;
  status: ProjectTaskStatus;
  priority: ProjectPriority;
}

export interface ProjectIssue {
  id: string | number;
  title: string;
  severity: ProjectIssueSeverity;
  owner: string;
  status: "Open" | "Resolved" | "Closed";
  due_date: string;
}

export interface ProjectPhase {
  id: string | number;
  name: string;
  status: "Pending" | "In Progress" | "Completed";
  due_date: string;
}

export interface ProjectMember {
  id: string | number;
  name: string;
  role: string;
  email: string;
}

export interface ProjectFile {
  id: string | number;
  name: string;
  type: string;
  uploaded_by: string;
  uploaded_at: string;
  file_url?: string;
}

export interface ProjectNote {
  id: string | number;
  content: string;
  created_by: string;
  created_at: string;
}

export interface ProjectTimeLog {
  id: string | number;
  member: string;
  task: string;
  date: string;
  hours: number;
}

export interface Project {
  id: string | number;
  project_code: string;
  name: string;
  account_name: string;
  contact_name: string;
  deal_name: string;
  owner: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  description: string;
  team_count: number;
  estimated_hours: number | null;
  logged_hours: number;
  tasks: ProjectTask[];
  phases: ProjectPhase[];
  issues: ProjectIssue[];
  members: ProjectMember[];
  files: ProjectFile[];
  notes: ProjectNote[];
  time_logs: ProjectTimeLog[];
}

export interface CreateProjectPayload {
  project_code: string;
  name: string;
  account_name: string;
  contact_name: string;
  deal_name: string;
  owner: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string;
  due_date: string;
  estimated_hours: number | "";
  description: string;
}