import api from "@/lib/axiosInterceptor";
import type { State } from "./statesService";

export interface City {
  _id: string;
  name: string;
  state: State;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const citiesService = {
  getAll: (params?: Record<string, string>) => api.get<{ success: boolean; data: City[] }>("/admin/cities", { params }),
  create: (payload: { name: string; state: string; isActive: boolean }) => api.post<{ success: boolean; data: City }>("/admin/cities", payload),
  update: (id: string, payload: Partial<{ name: string; state: string; isActive: boolean }>) => api.put<{ success: boolean; data: City }>(`/admin/cities/${id}`, payload),
  remove: (id: string) => api.delete(`/admin/cities/${id}`),
};
