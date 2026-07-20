import api from "@/lib/axiosInterceptor";

export interface PurchasedPlan {
  _id: string;
  user: { _id: string; mobile: string; ownerProfile?: { fullName: string }; brokerProfile?: { fullName: string }; builderProfile?: { name: string } };
  userType: "Owner" | "Broker" | "Builder";
  plan: {
    name: string;
    planType: "Free" | "Paid";
    numberOfPropertiesGiven: number;
    expiryType?: string;
    leadsPerDay: number;
    coins?: number;
    amount?: number;
  };
  propertiesUsed: number;
  paymentMethod: "Coins" | "Online";
  amountPaid: number;
  coinsPaid: number;
  startDate: string;
  expiryDate: string;
  status: "Active" | "Expired" | "Consumed";
  createdAt: string;
}

export interface PurchasedPlansResponse {
  success: boolean;
  data: PurchasedPlan[];
  stats: { active: number; expired: number; consumed: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export const purchasedPlansService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PurchasedPlansResponse>("/admin/purchased-plans", { params }),
};
