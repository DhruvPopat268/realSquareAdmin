import api from "@/lib/axiosInterceptor";

export interface PropertyPurpose {
  _id: string;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const propertyPurposesService = {
  getAll: (params?: Record<string, string>) => api.get<{ success: boolean; data: PropertyPurpose[] }>("/admin/property-purposes", { params }),
  create: (payload: { name: string; description?: string; order?: number; isActive: boolean }) => api.post<{ success: boolean; data: PropertyPurpose }>("/admin/property-purposes", payload),
  update: (id: string, payload: Partial<{ name: string; description: string; order: number; isActive: boolean }>) => api.put<{ success: boolean; data: PropertyPurpose }>(`/admin/property-purposes/${id}`, payload),
  remove: (id: string) => api.delete(`/admin/property-purposes/${id}`),
  reorder: (id: string, direction: "up" | "down") => api.patch<{ success: boolean; data: PropertyPurpose[] }>(`/admin/property-purposes/${id}/reorder`, { direction }),
};
