import api from "@/lib/axiosInterceptor";

export interface CoinsTransaction {
  _id: string;
  user: string;
  userDetails?: { name?: string; mobile?: string } | null;
  userType: "Owner" | "Broker" | "Builder";
  type: "Credit" | "Debit";
  coins: number;
  reason: string;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

export interface CoinsTransactionsResponse {
  success: boolean;
  data: CoinsTransaction[];
  stats: { totalCredited: number; totalDebited: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export const coinsTransactionsService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<CoinsTransactionsResponse>("/admin/coins-transactions", { params }),
};
