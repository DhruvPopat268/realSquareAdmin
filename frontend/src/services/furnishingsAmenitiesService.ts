import api from "@/lib/axiosInterceptor";

export interface FurnishingAmenity {
  _id: string;
  name: string;
  type: "Furnishing" | "Amenity";
  hasCount: boolean;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toFormData(payload: Record<string, any>, file?: File | null): FormData {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)); });
  if (file) fd.append("icon", file);
  return fd;
}

export const furnishingsAmenitiesService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: FurnishingAmenity[] }>("/admin/furnishings-amenities", { params }),
  create: (payload: { name: string; type: string; hasCount?: boolean; isActive?: boolean }, file?: File | null) =>
    api.post<{ success: boolean; data: FurnishingAmenity }>("/admin/furnishings-amenities", toFormData(payload, file), { headers: { "Content-Type": "multipart/form-data" } }),
  update: (id: string, payload: Partial<Omit<FurnishingAmenity, "icon">>, file?: File | null) =>
    api.put<{ success: boolean; data: FurnishingAmenity }>(`/admin/furnishings-amenities/${id}`, toFormData(payload as Record<string, any>, file), { headers: { "Content-Type": "multipart/form-data" } }),
  remove: (id: string) => api.delete(`/admin/furnishings-amenities/${id}`),
  reorder: (id: string, direction: "up" | "down") =>
    api.patch<{ success: boolean; data: FurnishingAmenity[] }>(`/admin/furnishings-amenities/${id}/reorder`, { direction }),
};
