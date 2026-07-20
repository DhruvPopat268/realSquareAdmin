import api from "@/lib/axiosInterceptor";

export interface PaymentTransaction {
  _id: string;
  user: { _id: string; mobile: string; ownerProfile?: { fullName: string }; brokerProfile?: { fullName: string }; builderProfile?: { name: string } };
  userType: "Owner" | "Broker" | "Builder";
  reason: "PlanPurchase" | "CoinsPurchase" | "Refund" | "AdminCredit" | "AdminDebit";
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
