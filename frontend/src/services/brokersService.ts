import api from "@/lib/axiosInterceptor";

export interface Broker {
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
  brokerProfile: {
    yearsOfExperience?: number;
    agencyName?: string;
    bio?: string;
    reraVerification?: {
      reraId: string;
      verified: boolean;
      reason: string;
      projectDetails: {
        projectName?: string | null;
        developerName?: string | null;
        localityOrCity?: string | null;
        state?: string | null;
        projectType?: string | null;
        completionDate?: string | null;
        totalUnits?: string | null;
        status?: string | null;
        confidence?: "high" | "low" | "unknown";
      } | null;
      sources: string[];
    };
  } | null;
}

export const brokersService = {
  getAll: (params?: { isDeleted?: string; page?: number; limit?: number; search?: string }) =>
    api.get<{
      success: boolean;
      data: Broker[];
      stats: { total: number; active: number; inactive: number; deleted: number };
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>("/broker/admin", { params }),
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
