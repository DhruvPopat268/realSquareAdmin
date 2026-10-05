import api from "@/lib/axiosInterceptor";

export interface Owner {
  _id: string;
  name: string;
  email: string;
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
  ownerProfile: {
    businessDetails?: {
      logo?: string;
      name?: string;
      type?: string;
      gstNumber?: string;
      email?: string;
      mobile?: string;
      website?: string;
    };
  } | null;
}

export const ownersService = {
  getAll: (params?: { isDeleted?: string }) => api.get<{ success: boolean; data: Owner[] }>("/owner/admin", { params }),
  update: (id: string, payload: FormData) =>
    api.put<{ success: boolean; data: Owner }>(`/owner/admin/${id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateStatus: (id: string, payload: { isActive?: boolean; autoApprovalProperties?: boolean }) =>
    api.patch<{ success: boolean; data: Owner }>(`/owner/admin/${id}/status`, payload),
  remove: (id: string) => api.delete(`/owner/admin/${id}`),
};
