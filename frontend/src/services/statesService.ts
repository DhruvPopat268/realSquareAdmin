import api from "@/lib/axiosInterceptor";

export interface State {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const statesService = {
  getAll: (params?: Record<string, string>) => api.get<{ success: boolean; data: State[] }>("/admin/states", { params }),
  create: (payload: { name: string; isActive: boolean }) => api.post<{ success: boolean; data: State }>("/admin/states", payload),
  update: (id: string, payload: Partial<{ name: string; isActive: boolean }>) => api.put<{ success: boolean; data: State }>(`/admin/states/${id}`, payload),
  remove: (id: string)                            => api.delete(`/admin/states/${id}`),
};
