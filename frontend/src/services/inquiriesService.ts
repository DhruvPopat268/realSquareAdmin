import api from "@/lib/axiosInterceptor";

export interface InquiryReference {
  _id: string;
  name: string;
}

export interface AdminInquiry {
  _id: string;
  createdBy: {
    id: string;
    name: string;
    mobile: string;
    role: { _id: string; name: string } | null;
  };
  isProperty: boolean;
  listingType: InquiryReference | null;
  propertyCategory?: InquiryReference | null;
  propertyType?: InquiryReference | null;
  preferredCity: string;
  preferredArea?: string;
  budget: { min: number; max: number };
  bhk?: number;
  builtUpArea?: { value?: number; unit?: string };
  plotArea?: { value?: number; unit?: string };
  furnishingType?: string;
  inquiryClassification: "hot" | "warm" | "cold";
  lastFollowUpDate: string;
  remarks?: string;
  preferredCommunication: string[];
  status: "active" | "expired" | "inactive" | "completed" | "rejected";
  totalAssigned: number;
  totalPurchased: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInquiriesResponse {
  success: boolean;
  data: AdminInquiry[];
  stats: { active: number; expired: number; inactive: number; completed: number; rejected: number; hot: number; warm: number; cold: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface AdminInquiryFilters {
  page?: number;
  limit?: number;
  status?: string;
  classification?: string;
  isProperty?: string;
  purposeId?: string;
  categoryId?: string;
  typeId?: string;
  roleId?: string;
  userId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AssignedInquiryRecord {
  _id: string;
  inquiry: string;
  assignedTo: {
    id: string;
    name: string;
    mobile: string;
    role: { _id: string; name: string } | null;
  };
  status: "active" | "purchased";
  assignmentSource: "automatic" | "cron";
  assignedAt: string;
  purchasedVia?: "coins" | "plan";
  coinsUsed?: number;
  purchasedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignedInquiriesByInquiryResponse {
  success: boolean;
  data: AssignedInquiryRecord[];
  count: number;
  stats: { totalAssigned: number; totalPurchased: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export const inquiriesService = {
  getAll: (params?: AdminInquiryFilters) =>
    api.get<AdminInquiriesResponse>("/admin/inquiries", { params }),
  updateStatus: (payload: { inquiryId: string; status: "inactive" | "completed" }) =>
    api.patch("/admin/inquiries/status", payload),
  getAssignmentsByInquiryId: (inquiryId: string, params?: { page?: number; limit?: number; status?: string }) =>
    api.get<AssignedInquiriesByInquiryResponse>(`/admin/inquiries/assigned/${inquiryId}`, { params }),
};
