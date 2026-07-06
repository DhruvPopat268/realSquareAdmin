import api from "@/lib/axiosInterceptor";

export interface Builder {
  _id: string;
  mobile: string;
  isActive: boolean;
  autoApprovalProperties: boolean;
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
  builderProfile: {
    name: string;
    email: string;
    mobile: string;
    profilePhoto?: string;
    gstNumber?: string;
    cinNumber?: string;
    foundedYear?: number;
    totalProjectsDelivered?: number;
  } | null;
}

export const buildersService = {
  getAll: () => api.get<{ success: boolean; data: Builder[] }>("/builder/admin"),
  create: (payload: FormData) =>
    api.post<{ success: boolean; data: Builder }>("/builder/admin", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, payload: FormData) =>
    api.put<{ success: boolean; data: Builder }>(`/builder/admin/${id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateStatus: (id: string, payload: { isActive?: boolean; autoApprovalProperties?: boolean }) =>
    api.patch<{ success: boolean; data: Builder }>(`/builder/admin/${id}/status`, payload),
  remove: (id: string) => api.delete(`/builder/admin/${id}`),
};
