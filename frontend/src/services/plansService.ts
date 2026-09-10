import api from "@/lib/axiosInterceptor";

export interface Plan {
  _id: string;
  name: string;
  description?: string;
  numberOfPropertiesGiven: number;
  expiryInDays?: number;
  roles: string[];
  coins?: number;
  amount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreatePlanPayload = {
  name: string;
  description?: string;
  numberOfPropertiesGiven: number;
  roles?: string[];
  isActive?: boolean;
  expiryInDays: number;
  coins: number;
  amount: number;
};

export const plansService = {
  getAll:  (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: Plan[] }>("/admin/plans", { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: Plan }>(`/admin/plans/${id}`),
  create:  (payload: CreatePlanPayload) =>
    api.post<{ success: boolean; data: Plan }>("/admin/plans", payload),
  update:  (id: string, payload: CreatePlanPayload) =>
    api.put<{ success: boolean; data: Plan }>(`/admin/plans/${id}`, payload),
  toggleActive: (id: string) =>
    api.patch<{ success: boolean; data: Plan }>(`/admin/plans/${id}/toggle`),
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/plans/${id}`),
};
