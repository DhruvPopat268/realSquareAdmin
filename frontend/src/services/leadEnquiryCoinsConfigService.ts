import api from "@/lib/axiosInterceptor";

export interface LeadEnquiryCoinsConfig {
  coinsPerLead: number;
  coinsPerEnquiry: number;
  updatedAt?: string;
}

export const leadEnquiryCoinsConfigService = {
  getConfig: () =>
    api.get<{ success: boolean; data: LeadEnquiryCoinsConfig }>("/admin/lead-enquiry-coins-config"),

  updateConfig: (payload: { coinsPerLead: number; coinsPerEnquiry: number }) =>
    api.put<{ success: boolean; data: LeadEnquiryCoinsConfig }>("/admin/lead-enquiry-coins-config", payload),
};
