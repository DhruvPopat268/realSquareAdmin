import api from "@/lib/axiosInterceptor";
import type { SystemUserRole } from "./systemUsersRolesService";

export interface SystemUser {
  _id: string;
  profile: {
    name: string;
    email: string;
    phone?: string;
    profilePhoto?: string;
  };
  role: SystemUserRole | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
}

export const systemUsersService = {
  getAll:  (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: SystemUser[] }>("/admin/auth/system-users", { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: SystemUser }>(`/admin/auth/system-users/${id}`),
  create:  (payload: { profile: { name: string; email: string; password: string; phone?: string }; role?: string; isSuperAdmin?: boolean; isActive?: boolean }) =>
    api.post<{ success: boolean; data: SystemUser }>("/admin/auth/register", payload),
  update:  (id: string, payload: Partial<{ profile: { name: string; email: string; phone?: string }; role: string | null; isActive: boolean; isSuperAdmin: boolean }>) =>
    api.put<{ success: boolean; data: SystemUser }>(`/admin/auth/system-users/${id}`, payload),
  remove:  (id: string) =>
    api.delete(`/admin/auth/system-users/${id}`),
};
