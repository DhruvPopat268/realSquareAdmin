import api from "@/lib/axiosInterceptor";

export interface SystemUserRole {
  _id: string;
  name: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const systemUsersRolesService = {
  getAll:  (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: SystemUserRole[] }>("/admin/system-users-roles", { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: SystemUserRole }>(`/admin/system-users-roles/${id}`),
  create:  (payload: { name: string; permissions?: string[]; isActive: boolean }) =>
    api.post<{ success: boolean; data: SystemUserRole }>("/admin/system-users-roles", payload),
  update:  (id: string, payload: Partial<{ name: string; permissions: string[]; isActive: boolean }>) =>
    api.put<{ success: boolean; data: SystemUserRole }>(`/admin/system-users-roles/${id}`, payload),
  remove:  (id: string) =>
    api.delete(`/admin/system-users-roles/${id}`),
};
