import api from "@/lib/axiosInterceptor";

export interface ListingPurchasedPlan {
  _id: string;
  user: string;
  userDetails?: { name?: string; mobile?: string } | null;
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
  paymentMethod: "Coins" | "Online" | "Free";
  amountPaid: number;
  coinsPaid: number;
  startDate: string;
  expiryDate: string;
  status: "Active" | "Expired" | "Consumed" | "Cancelled";
  cancellationReason?: "User upgraded plan" | "User switched role";
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
