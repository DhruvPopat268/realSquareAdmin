import api from "@/lib/axiosInterceptor";
import type { SystemUserRole } from "./systemUsersRolesService";

export interface SystemUser {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  profilePhoto?: string;
  profile?: {
    password?: string;
  };
  role: SystemUserRole | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveUser {
  _id: string;
  mobile: string;
  name: string | null;
  role: string;
  roleName: string | null;
}

export const systemUsersService = {
  getAll:  (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: SystemUser[] }>("/admin/auth/system-users", { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: SystemUser }>(`/admin/auth/system-users/${id}`),
  create:  (payload: { name: string; email: string; mobile: string; profile: { password: string }; role?: string; isSuperAdmin?: boolean; isActive?: boolean }) =>
    api.post<{ success: boolean; data: SystemUser }>("/admin/auth/register", payload),
  update:  (id: string, payload: Partial<{ name: string; email: string; mobile: string; role: string | null; isActive: boolean; isSuperAdmin: boolean }>) =>
    api.put<{ success: boolean; data: SystemUser }>(`/admin/auth/system-users/${id}`, payload),
  remove:  (id: string) =>
    api.delete(`/admin/auth/system-users/${id}`),
  getRolesForSystemUsers: () =>
    api.get<{ success: boolean; data: SystemUserRole[] }>("/admin/auth/system-users/roles"),
  getIncompleteProfiles: () =>
    api.get<{ success: boolean; data: Array<{ _id: string; name?: string; mobile: string; createdAt: string; updatedAt: string }> }>("/admin/auth/incomplete-profiles"),
  deleteIncompleteProfile: (id: string) =>
    api.delete(`/admin/auth/incomplete-profiles/${id}`),
  getActiveUsers: () =>
    api.get<{ success: boolean; data: ActiveUser[] }>("/system-users/active-users"),
};
