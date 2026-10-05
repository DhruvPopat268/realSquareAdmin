import api from "@/lib/axiosInterceptor";

export interface EnquiryPurchasedPlan {
  _id: string;
  user: string;
  userDetails?: { name?: string; mobile?: string } | null;
  userType: "Owner" | "Broker" | "Builder";
  plan: {
    name: string;
    numberOfEnquiriesGiven: number;
    expiryInDays: number;
    coins?: number;
    amount?: number;
  };
  enquiriesUsed: number;
  paymentMethod: "Coins" | "Online" | "Free";
  amountPaid: number;
  coinsPaid: number;
  startDate: string;
  expiryDate: string;
  status: "Active" | "Expired" | "Consumed" | "Cancelled";
  createdAt: string;
}

export interface EnquiryPurchasedPlansResponse {
  success: boolean;
  data: EnquiryPurchasedPlan[];
  stats: { active: number; expired: number; consumed: number; cancelled: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export const enquiryPurchasedPlansService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<EnquiryPurchasedPlansResponse>("/admin/enquiry-purchased-plans", { params }),
};
