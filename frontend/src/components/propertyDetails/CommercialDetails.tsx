import { Maximize2, Layers } from "lucide-react";
import type { CommercialDetails as CommercialDetailsType, RentInfo } from "@/services/propertyListingService";
import FurnishingsAmenitiesDisplay from "./FurnishingsAmenitiesDisplay";

interface Props {
  data: CommercialDetailsType;
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

export default function CommercialDetails({ data, rentInfo, propertyTypeName }: Props) {
  const isCoworking = (propertyTypeName ?? "").toLowerCase().includes("cowork");
  const isOffice =
    (propertyTypeName ?? "").toLowerCase().includes("office") ||
    data.minSeats != null ||
    data.minCabins != null ||
    data.minMeetingRooms != null;

  const hasFloorInfo  = !isCoworking && (data.totalFloors != null || !!data.yourFloor);
  const hasOfficeInfo = !isCoworking && isOffice && (data.minSeats != null || data.minCabins != null || data.minMeetingRooms != null);

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
          <InfoItem label="Other Property Type" value={data.propertyType} />
          {!isCoworking && <InfoItem label="Built-up Area"        value={formatArea(data.builtUpArea)} />}
          {!isCoworking && <InfoItem label="Carpet Area"          value={formatArea(data.carpetArea)} />}
          {!isCoworking && <InfoItem label="Plot Area"            value={formatArea(data.plotArea)} />}
          {!isCoworking && <InfoItem label="Dimensions"           value={data.length != null && data.width != null ? `${data.length} × ${data.width} ft` : null} />}
          <InfoItem label="Ownership"            value={formatOwnership(data.ownership)} />
          <InfoItem label="Zone Type"            value={formatZone(data.zoneType)} />
          <InfoItem label="Location Hub"         value={data.locationHub} />
          {!isCoworking && <InfoItem label="Construction Status"
            value={
              data.constructionStatus === "ReadyToMove"       ? "Ready to Move" :
              data.constructionStatus === "UnderConstruction" ? "Under Construction" :
              undefined
            }
          />}
          {!isCoworking && <InfoItem label="Property Status" value={data.propertyStatus === "NewlyAdded" ? "Newly Added" : data.propertyStatus === "Relaunch" ? "Re-release" : undefined} />}
          {!isCoworking && <InfoItem label="Age of Property"
            value={data.ageOfProperty != null ? `${data.ageOfProperty} year${data.ageOfProperty !== 1 ? "s" : ""}` : null}
          />}
          {!isCoworking && <InfoItem label="Available From" value={formatDate(data.constructionStatus === "UnderConstruction" && data.availableFrom ? data.availableFrom : rentInfo?.availableFrom)} />}
          {!isCoworking && <InfoItem
            label="Security Deposit"
            value={rentInfo?.securityDeposit == null ? null : rentInfo.securityDeposit === 0 ? "None" : `₹${rentInfo.securityDeposit.toLocaleString("en-IN")}`}
          />}
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

      {data.workspaces?.length ? (
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">Co-working Spaces</h2>
          {data.workSpaceFloor != null && (
            <p className="mb-4 text-sm text-muted-foreground">Workspace Floor: {data.workSpaceFloor}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {data.workspaces.map((workspace, index) => (
              <div key={index} className="rounded-xl border bg-card p-4">
                  <p className="font-semibold">
                    {workspace.type === "virtualSpace"
                      ? "Virtual Space"
                      : workspace.type === "cabin"
                        ? "Cabins"
                        : "Hall"}
                  </p>

                  {workspace.type === "virtualSpace" ? (
                    <>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ₹{workspace.monthlyRent?.toLocaleString("en-IN")} / month
                      </p>
                      {workspace.benefits?.length ? (
                        <div className="mt-2 space-y-2 text-sm">
                          {workspace.benefits.map((group) => (
                            <div key={group._id}>
                              <p className="font-medium">{group.title}</p>
                              <ul className="list-inside list-disc">
                                {group.benefits.map((benefit) => (
                                  <li key={benefit}>{benefit}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : workspace.type === "hall" ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {workspace.availableSeats} seats · ₹
                      {workspace.rentPerSeat?.toLocaleString("en-IN")} / seat / month
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {workspace.config?.map((cabin, cabinIndex) => (
                        <p key={cabinIndex}>
                          Cabin {cabinIndex + 1}: {cabin.availableSeats} seats · ₹
                          {cabin.rentPerSeat?.toLocaleString("en-IN")} / seat / month
                        </p>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Furnishings & Amenities — card grid */}
      {!isCoworking && (
        <FurnishingsAmenitiesDisplay
          furnishType={data.furnishType}
          furnishings={data.furnishings ?? []}
          amenities={data.amenities ?? []}
        />
      )}

    </div>
  );
}
