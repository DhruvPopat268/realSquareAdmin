import api from "@/lib/axiosInterceptor";

export interface EnquiryPlan {
  _id: string;
  name: string;
  description?: string;
  numberOfEnquiriesGiven: number;
  expiryInDays?: number;
  roles: string[];
  coins?: number;
  amount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateEnquiryPlanPayload = {
  name: string;
  description?: string;
  numberOfEnquiriesGiven: number;
  roles?: string[];
  isActive?: boolean;
  expiryInDays: number;
  coins: number;
  amount: number;
};

export const enquiryPlansService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: EnquiryPlan[] }>("/admin/enquiry-plans", { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: EnquiryPlan }>(`/admin/enquiry-plans/${id}`),
  create: (payload: CreateEnquiryPlanPayload) =>
    api.post<{ success: boolean; data: EnquiryPlan }>("/admin/enquiry-plans", payload),
  update: (id: string, payload: CreateEnquiryPlanPayload) =>
    api.put<{ success: boolean; data: EnquiryPlan }>(`/admin/enquiry-plans/${id}`, payload),
  toggleActive: (id: string) =>
    api.patch<{ success: boolean; data: EnquiryPlan }>(`/admin/enquiry-plans/${id}/toggle`),
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/enquiry-plans/${id}`),
};
