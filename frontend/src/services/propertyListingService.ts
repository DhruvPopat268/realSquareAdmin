import api from "@/lib/axiosInterceptor";

// ─── Sub-types matching the Mongoose model ────────────────────────────────────

export interface AreaValue {
  value: number;
  unit: "sqft" | "sqyd" | "sqmt";
}

export interface FurnishingItem {
  id: string;
  name: string;
  icon?: string;
  count?: number;
}

export interface ResidentialDetails {
  societyName?: string;
  bhk?: number;
  builtUpArea?: AreaValue;
  furnishType?: "Unfurnished" | "Semi-Furnished" | "Fully-Furnished";
  furnishings?: FurnishingItem[];
  amenities?: FurnishingItem[];
}

export interface PlotDetails {
  societyName?: string;
  plotArea?: AreaValue;
  length?: number;
  width?: number;
}

export interface PGRoom {
  roomType: string;
  bedsAvailable: number;
  rent?: number;
  securityDeposit?: number;
}

export interface PGDetails {
  pgName?: string;
  totalBedsAvailable?: number;
  pgFor?: "Girls" | "Boys" | "Both";
  bestSuitedFor?: string[];
  mealsAvailable?: boolean;
  meals?: string[];
  noticePeriod?: number;
  lockInPeriod?: number;
  commonAreas?: string[];
  rooms?: PGRoom[];
}

export interface CommercialDetails {
  societyName?: string;
  propertyType?: string;
  zoneType?: string;
  locationHub?: string;
  builtUpArea?: AreaValue;
  carpetArea?: AreaValue;
  plotArea?: AreaValue;
  length?: number;
  width?: number;
  ownership?: string;
  totalFloors?: number;
  yourFloor?: string;
  minSeats?: number;
  minCabins?: number;
  minMeetingRooms?: number;
}

export interface SellInfo {
  price?: number;
  constructionStatus?: "UnderConstruction" | "ReadyToMove";
  ageOfProperty?: number;
  availableFrom?: string;
}

export interface RentInfo {
  monthlyRent?: number;
  availableFrom?: string;
  securityDeposit?: {
    type: "None" | "1Month" | "2Month" | "Custom";
    amount?: number;
  };
}

export interface ReraProjectDetails {
  projectName?: string | null;
  developerName?: string | null;
  localityOrCity?: string | null;
  state?: string | null;
  projectType?: string | null;
  completionDate?: string | null;
  totalUnits?: string | null;
  status?: string | null;
  confidence?: "high" | "low" | "unknown";
}

export interface ReraDetails {
  reraId?: string;
  reraStatus?: "verified" | "unverified";
  reraAdminApproved?: boolean;
  verifiedAt?: string | null;
  projectDetails?: ReraProjectDetails;
  sources?: string[];
}

export interface PropertyListing {
  _id: string;
  category: { id: string; name: string };
  listingType: { id: string; name: string };
  propertyType?: { id: string; name: string };
  cityName?: string;
  locality?: { address?: string; latitude?: number; longitude?: number };
  listedBy: {
    id: string;
    name?: string;
    mobile?: string;
    email?: string;
    profilePhoto?: string;
    role?: { id: string; name: string };
  };
  media?: { images: string[] };
  residentialDetails?: ResidentialDetails;
  plotDetails?: PlotDetails;
  pgDetails?: PGDetails;
  commercialDetails?: CommercialDetails;
  sellInfo?: SellInfo;
  rentInfo?: RentInfo;
  rera?: ReraDetails;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface MapPin {
  _id: string;
  listingType: { id: string; name: string };
  category: { id: string; name: string };
  propertyType?: { id: string; name: string };
  cityName?: string;
  locality?: { address?: string; latitude?: number; longitude?: number };
  media?: { images: string[] };
  residentialDetails?: { bhk?: number };
  listedBy?: { name?: string; role?: { name?: string } };
  status: string;
  price: string | null;
}

export const propertyListingService = {
  getById: (id: string) =>
    api.get<{ success: boolean; data: PropertyListing }>(`/admin/property-listings/${id}`),
  approve: (id: string) =>
    api.patch<{ success: boolean; message: string; data: { status: string; approvedAt: string } }>(`/admin/property-listings/${id}/approve`),
  reject: (id: string, reasons: string[]) =>
    api.patch<{ success: boolean; message: string; data: { status: string; rejectedAt: string; rejectedReasons: string[] } }>(`/admin/property-listings/${id}/reject`, { reasons }),
  markInactive: (id: string) =>
    api.patch<{ success: boolean; message: string; data: { status: string } }>(`/admin/property-listings/mark-inactive/${id}`),
  markActive: (id: string) =>
    api.patch<{ success: boolean; message: string; data: { status: string } }>(`/admin/property-listings/mark-active/${id}`),
  markSold: (id: string) =>
    api.patch<{ success: boolean; message: string; data: { status: string; soldAt?: string } }>(`/admin/property-listings/mark-sold/${id}`),
  markRented: (id: string) =>
    api.patch<{ success: boolean; message: string; data: { status: string; rentedAt?: string } }>(`/admin/property-listings/mark-rented/${id}`),
  getMapPins: (filters: { purposeId?: string; categoryId?: string; typeId?: string; userId?: string; roleId?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.purposeId)  params.set("purposeId",  filters.purposeId);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.typeId)     params.set("typeId",      filters.typeId);
    if (filters.userId)     params.set("userId",      filters.userId);
    if (filters.roleId)     params.set("roleId",      filters.roleId);
    const qs = params.toString();
    return api.get<{ success: boolean; data: MapPin[] }>(`/admin/property-listings/map-pins${qs ? `?${qs}` : ""}`);
  },
};
