import api from "@/lib/axiosInterceptor";

export interface ListingPurchasedPlan {
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

export interface ListingPurchasedPlansResponse {
  success: boolean;
  data: ListingPurchasedPlan[];
  stats: { active: number; expired: number; consumed: number; cancelled: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export const purchasedPlansService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<ListingPurchasedPlansResponse>("/admin/purchased-plans", { params }),
};
