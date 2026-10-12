import api from "@/lib/axiosInterceptor";

export interface InvoiceConfig {
  _id?: string;
  companyLogo?: string;
  companyName?: string;
  companyMobile?: string;
  companyEmail?: string;
  companyAddress?: string;
}

export const invoiceConfigService = {
  get: () =>
    api.get<{ success: boolean; data: InvoiceConfig }>("/admin/invoice-config"),

  update: (data: FormData | Omit<InvoiceConfig, "_id">) =>
    api.patch<{ success: boolean; data: InvoiceConfig }>("/admin/invoice-config", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
    }),
};
