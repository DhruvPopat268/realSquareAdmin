import api from "@/lib/axiosInterceptor";

export interface Owner {
  _id: string;
  mobile: string;
  isActive: boolean;
  autoApprovalProperties: boolean;
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
  ownerProfile: {
    fullName: string;
    email: string;
    mobile: string;
    profilePhoto?: string;
    businessDetails?: {
      logo?: string;
      name: string;
      type: string;
      gstNumber?: string;
      email: string;
      mobile: string;
      website?: string;
    };
  } | null;
}

export const ownersService = {
  getAll:       () => api.get<{ success: boolean; data: Owner[] }>("/owner/admin"),
  update: (id: string, payload: FormData) =>
    api.put<{ success: boolean; data: Owner }>(`/owner/admin/${id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateStatus: (id: string, payload: { isActive?: boolean; autoApprovalProperties?: boolean }) =>
    api.patch<{ success: boolean; data: Owner }>(`/owner/admin/${id}/status`, payload),
  remove:       (id: string) => api.delete(`/owner/admin/${id}`),
};
