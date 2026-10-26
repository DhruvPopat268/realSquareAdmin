import api from "@/lib/axiosInterceptor";

export interface IdealForOption {
  _id: string;
  name: string;
  image: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toFormData(payload: { name?: string; isActive?: boolean; image?: File | null }) {
  const formData = new FormData();
  if (payload.name !== undefined) formData.append("name", payload.name);
  if (payload.isActive !== undefined) formData.append("isActive", String(payload.isActive));
  if (payload.image) formData.append("image", payload.image);
  return formData;
}

export const idealForService = {
  getAll: (search?: string) => api.get<{ success: boolean; data: IdealForOption[] }>("/admin/ideal-for", { params: search ? { search } : {} }),
  create: (payload: { name: string; isActive: boolean; image: File }) =>
    api.post<{ success: boolean; data: IdealForOption }>("/admin/ideal-for", toFormData(payload), { headers: { "Content-Type": "multipart/form-data" } }),
  update: (id: string, payload: { name?: string; isActive?: boolean; image?: File | null }) =>
    api.put<{ success: boolean; data: IdealForOption }>(`/admin/ideal-for/${id}`, toFormData(payload), { headers: { "Content-Type": "multipart/form-data" } }),
  remove: (id: string) => api.delete(`/admin/ideal-for/${id}`),
  reorder: (id: string, direction: "up" | "down") =>
    api.patch<{ success: boolean; data: IdealForOption[] }>(`/admin/ideal-for/${id}/reorder`, { direction }),
};
