import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "../lib/api/authApi";
import type { UserRole, AuthUser } from "../lib/api/authApi";

export type { UserRole, AuthUser };

export function useAuth() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("auth:login", refresh as EventListener);
    window.addEventListener("auth:logout", refresh as EventListener);
    window.addEventListener("auth:modules-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("auth:login", refresh as EventListener);
      window.removeEventListener("auth:logout", refresh as EventListener);
      window.removeEventListener("auth:modules-updated", refresh);
    };
  }, []);

  const user = getStoredUser();
  const role: UserRole = (user?.role as UserRole) ?? "employee";
  const allowedModules: string[] = user?.allowed_modules ?? [];
  const canAccess = useCallback(
    (module: string) => role === "admin" || role === "sub_admin" || allowedModules.includes(module),
    [allowedModules, role]
  );

  return {
    user,
    role,
    // Role convenience flags
    isMainAdmin: role === "admin",
    isSubAdmin: role === "sub_admin",
    isAdmin: role === "admin" || role === "sub_admin",   // backwards-compat
    isManager: role === "manager" || role === "team_lead",
    isEmployee: !["admin", "sub_admin", "manager", "team_lead"].includes(role),
    // Module access
    allowedModules,
    canAccess,
    mustChangePassword: user?.must_change_password ?? false,
  };
}
