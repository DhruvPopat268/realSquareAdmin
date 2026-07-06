import api from "@/lib/axiosInterceptor";

export interface Broker {
  _id: string;
  mobile: string;
  isActive: boolean;
  autoApprovalProperties: boolean;
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
  brokerProfile: {
    fullName: string;
    email: string;
    mobile: string;
    profilePhoto?: string;
    yearsOfExperience?: number;
    agencyName?: string;
    bio?: string;
  } | null;
}

export const brokersService = {
  getAll: () => api.get<{ success: boolean; data: Broker[] }>("/broker/admin"),
  create: (payload: FormData) =>
    api.post<{ success: boolean; data: Broker }>("/broker/admin", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, payload: FormData) =>
    api.put<{ success: boolean; data: Broker }>(`/broker/admin/${id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateStatus: (id: string, payload: { isActive?: boolean; autoApprovalProperties?: boolean }) =>
    api.patch<{ success: boolean; data: Broker }>(`/broker/admin/${id}/status`, payload),
  remove: (id: string) => api.delete(`/broker/admin/${id}`),
};
