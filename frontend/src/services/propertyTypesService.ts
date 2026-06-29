import api from "@/lib/axiosInterceptor";
import type { PropertyCategory } from "./propertyCategoriesService";

export interface PropertyType {
  _id: string;
  name: string;
  propertyCategory: PropertyCategory;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const propertyTypesService = {
  getAll: (params?: Record<string, string>) => api.get<{ success: boolean; data: PropertyType[] }>("/admin/property-types", { params }),
  create: (payload: { name: string; propertyCategory: string; description?: string; isActive: boolean }) => api.post<{ success: boolean; data: PropertyType }>("/admin/property-types", payload),
  update: (id: string, payload: Partial<{ name: string; propertyCategory: string; description: string; isActive: boolean }>) => api.put<{ success: boolean; data: PropertyType }>(`/admin/property-types/${id}`, payload),
  remove: (id: string) => api.delete(`/admin/property-types/${id}`),
};
