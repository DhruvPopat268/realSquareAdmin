import api from "@/lib/axiosInterceptor";

// ─── Sub-types matching the Mongoose model ────────────────────────────────────

export interface AreaValue {
  value: number;
  unit: "sqft" | "sqyd" | "sqmt";
}

export interface FurnishingItem {
  id: string;
  name: string;
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
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const propertyListingService = {
  getById: (id: string) =>
    api.get<{ success: boolean; data: PropertyListing }>(`/admin/property-listings/${id}`),
};
