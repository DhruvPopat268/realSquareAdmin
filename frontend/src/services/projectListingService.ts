import api from "@/lib/axiosInterceptor";

export interface ProjectListingRecord {
  _id: string;
  category?: { id?: string; name?: string };
  idealFor?: Array<{ id?: string; name?: string; image?: string }>;
  projectName: string;
  developerName?: string;
  projectDescription?: string;
  projectStatus?: string;
  launchDate?: string;
  possessionDate?: string;
  totalUnits?: number;
  availableUnits?: number;
  towerCount?: number;
  minPrice?: number;
  maxPrice?: number;
  cityName?: string;
  locality?: { address?: string; latitude?: number; longitude?: number };
  listedBy?: { id?: string; name?: string; mobile?: string; email?: string; profilePhoto?: string; role?: { id?: string; name?: string } };
  residentialDetails?: { areaUnit?: string; configurations?: Array<ProjectConfiguration> };
  commercialDetails?: { zoneType?: string; locationHub?: string; areaUnit?: string; configurations?: Array<ProjectConfiguration> };
  configurationGroups?: {
    residential?: Array<{ bhk: string; carpetAreas: Array<{ carpetArea?: number | null; configurations: ProjectConfiguration[] }> }>;
    commercial?: Array<{ carpetArea?: number | null; configurations: ProjectConfiguration[] }>;
  };
  furnishings?: Array<{ name?: string; count?: number; icon?: string }>;
  amenities?: Array<{ name?: string; count?: number; icon?: string }>;
  media?: { images?: string[]; videos?: { videoUrl?: string; ytVideoUrl?: string }; reelVideo?: { reelUrl?: string; ytReelUrl?: string } };
  brochureUrl?: string;
  rera?: { reraId?: string; reraStatus?: string; reraAdminApproved?: boolean; verifiedAt?: string; projectDetails?: Record<string, unknown>; sources?: string[] };
  status: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectedReasons?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectConfiguration = {
  bhk?: string | number;
  carpetArea?: number;
  furnishingOptions?: string[];
  price?: number;
  image2DUrl?: string;
  model3DUrl?: string;
};

export interface ProjectListingFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  city?: string;
  roleId?: string;
  userId?: string;
  status?: string;
}

export const projectListingService = {
  getAll: (filters: ProjectListingFilters = {}) =>
    api.get<{ success: boolean; data: { projects: ProjectListingRecord[]; stats: Record<string, number> }; pagination: { page: number; limit: number; total: number; totalPages: number } }>("/admin/project-listings", { params: filters }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: ProjectListingRecord }>(`/admin/project-listings/${id}`),
  approve: (id: string) =>
    api.patch<{ success: boolean; message: string; data: { status: string; approvedAt: string } }>(`/admin/project-listings/${id}/approve`),
  reject: (id: string, reasons: string[]) =>
    api.patch<{ success: boolean; message: string; data: { status: string; rejectedAt: string; rejectedReasons: string[] } }>(`/admin/project-listings/${id}/reject`, { reasons }),
  updateStatus: (id: string, status: string) =>
    api.patch<{ success: boolean; message: string; data: { status: string } }>(`/admin/project-listings/${id}/status`, { status }),
};
