import api from "@/lib/axiosInterceptor";

export interface Customer {
  _id: string;
  name: string;
  email: string;
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
  getAll: (params?: { isDeleted?: string }) => api.get<{ success: boolean; data: Customer[] }>("/customer/admin", { params }),
  update: (id: string, payload: {
    name?: string;
    email?: string;
    bio?: string;
    mobile?: string;
    location?: { name: string; latitude: number; longitude: number };
  }) => api.put<{ success: boolean; data: Customer }>(`/customer/admin/${id}`, payload),
  updateStatus: (id: string, isActive: boolean) =>
    api.patch<{ success: boolean; data: Customer }>(`/customer/admin/${id}/status`, { isActive }),
  remove: (id: string) => api.delete(`/customer/admin/${id}`),
};
