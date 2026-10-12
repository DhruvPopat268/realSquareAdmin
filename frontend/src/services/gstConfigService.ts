import api from "@/lib/axiosInterceptor";

export interface GstConfig {
  _id?: string;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst?: number;
  updatedAt?: string;
}

export const gstConfigService = {
  get: () =>
    api.get<{ success: boolean; data: GstConfig | null }>("/admin/gst-config"),

  update: (payload: Partial<Pick<GstConfig, "cgst" | "sgst" | "igst">>) =>
    api.patch<{ success: boolean; data: GstConfig }>("/admin/gst-config", payload),
};
