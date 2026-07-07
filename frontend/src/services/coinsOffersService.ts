import api from "@/lib/axiosInterceptor";

export interface CoinsOffer {
  _id: string;
  name: string;
  description?: string;
  coins: number;
  amount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CoinsOfferPayload = {
  name: string;
  description?: string;
  coins: number;
  amount: number;
  isActive?: boolean;
};

export const coinsOffersService = {
  getAll:       (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: CoinsOffer[] }>("/admin/coins-offers", { params }),
  getById:      (id: string) =>
    api.get<{ success: boolean; data: CoinsOffer }>(`/admin/coins-offers/${id}`),
  create:       (payload: CoinsOfferPayload) =>
    api.post<{ success: boolean; data: CoinsOffer }>("/admin/coins-offers", payload),
  update:       (id: string, payload: CoinsOfferPayload) =>
    api.put<{ success: boolean; data: CoinsOffer }>(`/admin/coins-offers/${id}`, payload),
  toggleActive: (id: string) =>
    api.patch<{ success: boolean; data: CoinsOffer }>(`/admin/coins-offers/${id}/toggle`),
  remove:       (id: string) =>
    api.delete(`/admin/coins-offers/${id}`),
};
