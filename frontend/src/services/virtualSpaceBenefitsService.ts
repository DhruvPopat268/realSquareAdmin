import api from "@/lib/axiosInterceptor";

export interface VirtualSpaceBenefits {
  _id: string;
  title: string;
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const virtualSpaceBenefitsService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: VirtualSpaceBenefits[] }>(
      "/admin/virtual-space-benefits",
      { params },
    ),
  create: (payload: {
    title: string;
    benefits: string[];
    isActive: boolean;
  }) =>
    api.post<{ success: boolean; data: VirtualSpaceBenefits }>(
      "/admin/virtual-space-benefits",
      payload,
    ),
  update: (
    id: string,
    payload: Partial<{
      title: string;
      benefits: string[];
      isActive: boolean;
    }>,
  ) =>
    api.put<{ success: boolean; data: VirtualSpaceBenefits }>(
      `/admin/virtual-space-benefits/${id}`,
      payload,
    ),
  remove: (id: string) =>
    api.delete(`/admin/virtual-space-benefits/${id}`),
};
