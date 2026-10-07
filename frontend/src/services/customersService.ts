import api from "@/lib/axiosInterceptor";

export interface Customer {
  _id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  mobile: string;
  profilePhoto?: string;
  isActive: boolean;
  isDeleted: boolean;
  enquiryCities: string[];
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
  customerProfile: {
    bio?: string;
    location?: { name: string; latitude: number; longitude: number };
    verified: boolean;
  } | null;
}

export const customersService = {
  getAll: (params?: { isDeleted?: string; page?: number; limit?: number; search?: string }) =>
    api.get<{
      success: boolean;
      data: Customer[];
      stats: { total: number; active: number; inactive: number; deleted: number };
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>("/customer/admin", { params }),
  create: (payload: FormData) =>
    api.post<{ success: boolean; data: Customer }>("/customer/admin", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, payload: FormData) =>
    api.put<{ success: boolean; data: Customer }>(`/customer/admin/${id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateStatus: (id: string, isActive: boolean) =>
    api.patch<{ success: boolean; data: Customer }>(`/customer/admin/${id}/status`, { isActive }),
  remove: (id: string) => api.delete(`/customer/admin/${id}`),
};
