export type UserRole = "admin" | "manager" | "employee";

export type AuthUser = {
  id?: number | string;
  email?: string;
  role?: UserRole;
  is_admin?: boolean;
};

export function useAuth() {
  let user: AuthUser | null = null;
  try {
    const raw = localStorage.getItem("loggedInUser");
    if (raw) user = JSON.parse(raw) as AuthUser;
  } catch {
    user = null;
  }

  const role: UserRole = (user?.role as UserRole) ?? "employee";

  return {
    user,
    role,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isEmployee: role === "employee",
  };
}
