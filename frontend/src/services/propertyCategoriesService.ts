import api from "@/lib/axiosInterceptor";

export interface PropertyCategory {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const propertyCategoriesService = {
  getAll: (params?: Record<string, string>) => api.get<{ success: boolean; data: PropertyCategory[] }>("/admin/property-categories", { params }),
  create: (payload: { name: string; description?: string; isActive: boolean }) => api.post<{ success: boolean; data: PropertyCategory }>("/admin/property-categories", payload),
  update: (id: string, payload: Partial<{ name: string; description: string; isActive: boolean }>) => api.put<{ success: boolean; data: PropertyCategory }>(`/admin/property-categories/${id}`, payload),
  remove: (id: string) => api.delete(`/admin/property-categories/${id}`),
};
