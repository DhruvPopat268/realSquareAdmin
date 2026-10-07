import api from "@/lib/axiosInterceptor";

export interface PaymentTransaction {
  _id: string;
  user: string;
  userDetails?: { name?: string; mobile?: string } | null;
  userType: "Owner" | "Broker" | "Builder";
  reason: "ListingPlanPurchase" | "ListingPlanUpgrade" | "RequirementPlanPurchase" | "RequirementPlanUpgrade" | "CoinsPurchase" | "Refund" | "AdminCredit" | "AdminDebit";
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  status: "Pending" | "Success" | "Failed";
  failureReason?: string;
  createdAt: string;
}

export interface WalletTransactionsResponse {
  success: boolean;
  stats: { currentBalance: number; totalCredited: number; totalDebited: number };
  data: PaymentTransaction[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export const walletManagementService = {
  getTransactions: (params?: Record<string, string | number>) =>
    api.get<WalletTransactionsResponse>("/admin/wallet/transactions", { params }),
};
