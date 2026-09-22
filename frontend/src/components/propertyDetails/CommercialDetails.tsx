import { Maximize2, Layers } from "lucide-react";
import type { CommercialDetails as CommercialDetailsType, SellInfo, RentInfo } from "@/services/propertyListingService";
import FurnishingsAmenitiesDisplay from "./FurnishingsAmenitiesDisplay";

interface Props {
  data: CommercialDetailsType;
  sellInfo?: SellInfo;
  rentInfo?: RentInfo;
  propertyTypeName?: string;
}

function formatArea(area?: { value: number; unit: string }) {
  if (!area?.value) return null;
  const unitLabel: Record<string, string> = { sqft: "sq.ft", sqyd: "sq.yd", sqmt: "sq.m" };
  return `${area.value} ${unitLabel[area.unit] ?? area.unit}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatOwnership(val?: string) {
  const map: Record<string, string> = {
    Freehold: "Freehold",
    Leasehold: "Leasehold",
    CooperativeSociety: "Cooperative Society",
    PowerOfAttorney: "Power of Attorney",
  };
  return val ? (map[val] ?? val) : null;
}

function formatZone(val?: string) {
  const map: Record<string, string> = {
    Industrial: "Industrial",
    Commercial: "Commercial",
    Residential: "Residential",
    SEZ: "Special Economic Zone (SEZ)",
    OpenSpaces: "Open Spaces",
    Agricultural: "Agricultural",
    Others: "Others",
  };
  return val ? (map[val] ?? val) : null;
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default function CommercialDetails({ data, sellInfo, rentInfo, propertyTypeName }: Props) {
  const isOffice =
    (propertyTypeName ?? "").toLowerCase().includes("office") ||
    data.minSeats != null ||
    data.minCabins != null ||
    data.minMeetingRooms != null;

  const hasFloorInfo  = data.totalFloors != null || !!data.yourFloor;
  const hasOfficeInfo = isOffice && (data.minSeats != null || data.minCabins != null || data.minMeetingRooms != null);

  return (
    <div className="space-y-6">

      {/* Property Overview */}
      <section>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
          <Maximize2 className="h-4 w-4 text-primary" /> Property Overview
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Key specifications for this commercial property</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <InfoItem label="Building / Project"  value={data.societyName} />
          <InfoItem label="Built-up Area"        value={formatArea(data.builtUpArea)} />
          <InfoItem label="Carpet Area"          value={formatArea(data.carpetArea)} />
          <InfoItem label="Plot Area"            value={formatArea(data.plotArea)} />
          <InfoItem label="Ownership"            value={formatOwnership(data.ownership)} />
          <InfoItem label="Zone Type"            value={formatZone(data.zoneType)} />
          <InfoItem label="Location Hub"         value={data.locationHub} />
          <InfoItem label="Construction Status"
            value={
              sellInfo?.constructionStatus === "ReadyToMove"       ? "Ready to Move" :
              sellInfo?.constructionStatus === "UnderConstruction" ? "Under Construction" :
              undefined
            }
          />
          <InfoItem label="Age of Property"
            value={sellInfo?.ageOfProperty != null ? `${sellInfo.ageOfProperty} year${sellInfo.ageOfProperty !== 1 ? "s" : ""}` : null}
          />
          <InfoItem label="Available From"      value={formatDate(sellInfo?.availableFrom ?? rentInfo?.availableFrom)} />
        </div>
      </section>

      {/* Floor Information */}
      {hasFloorInfo && (
        <section>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-primary" /> Floor Information
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Floor details of this unit</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
            <InfoItem label="Total Floors" value={data.totalFloors} />
            <InfoItem label="Unit Floor"   value={data.yourFloor} />
          </div>
        </section>
      )}

      {/* Office Facilities */}
      {hasOfficeInfo && (
        <section>
          <h2 className="text-base font-bold text-foreground mb-1">Office Facilities</h2>
          <p className="text-xs text-muted-foreground mb-4">Workspace capacity details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.minSeats != null && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center">
                <p className="text-3xl font-bold text-primary">{data.minSeats}+</p>
                <p className="text-xs text-muted-foreground mt-1">Workstations / Seats</p>
              </div>
            )}
            {data.minCabins != null && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                <p className="text-3xl font-bold text-blue-600">{data.minCabins}+</p>
                <p className="text-xs text-muted-foreground mt-1">Private Cabins</p>
              </div>
            )}
            {data.minMeetingRooms != null && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                <p className="text-3xl font-bold text-green-600">{data.minMeetingRooms}+</p>
                <p className="text-xs text-muted-foreground mt-1">Meeting Rooms</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Furnishings & Amenities — card grid */}
      <FurnishingsAmenitiesDisplay
        furnishType={data.furnishType}
        furnishings={data.furnishings ?? []}
        amenities={data.amenities ?? []}
      />

    </div>
  );
}
