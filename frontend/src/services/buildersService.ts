import api from "@/lib/axiosInterceptor";

export interface Builder {
  _id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  mobile: string;
  profilePhoto?: string;
  isActive: boolean;
  isDeleted: boolean;
  autoApprovalProperties: boolean;
  enquiryCities: string[];
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
  builderProfile: {
    gstNumber?: string;
    cinNumber?: string;
    foundedYear?: number;
    totalProjectsDelivered?: number;
    location?: { name: string; latitude: number; longitude: number };
  } | null;
}

export const buildersService = {
  getAll: (params?: { isDeleted?: string; page?: number; limit?: number; search?: string }) =>
    api.get<{
      success: boolean;
      data: Builder[];
      stats: { total: number; active: number; inactive: number; deleted: number };
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>("/builder/admin", { params }),
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
