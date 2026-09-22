import { Home, Users, Clock, Calendar, CheckCircle2 } from "lucide-react";
import type { PGDetails as PGDetailsType, RentInfo } from "@/services/propertyListingService";
import FurnishingsAmenitiesDisplay from "./FurnishingsAmenitiesDisplay";

interface Props {
  data: PGDetailsType;
  rentInfo?: RentInfo;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

export default function PGDetails({ data, rentInfo }: Props) {
  return (
    <div className="space-y-6">

      {/* PG Overview */}
      <section>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
          <Home className="h-4 w-4 text-primary" /> PG Overview
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Key details for this PG / co-living space</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <InfoItem label="PG Name"           value={data.pgName} />
          <InfoItem label="Total Beds"         value={data.totalBedsAvailable != null ? `${data.totalBedsAvailable} beds` : null} />
          <InfoItem label="Accommodation For"  value={data.pgFor} />
          <InfoItem label="Best Suited For"    value={data.bestSuitedFor?.join(", ")} />
          <InfoItem label="Notice Period"      value={data.noticePeriod != null ? `${data.noticePeriod} days` : null} />
          <InfoItem label="Lock-in Period"     value={data.lockInPeriod != null ? `${data.lockInPeriod} days` : null} />
          <InfoItem label="Available From"     value={formatDate(rentInfo?.availableFrom)} />
          <InfoItem label="Meals Included"
            value={
              data.mealsAvailable && data.meals?.length
                ? data.meals.join(", ")
                : data.mealsAvailable
                ? "Available"
                : "Not Available"
            }
          />
        </div>
      </section>

      {/* Room Options & Pricing */}
      {(data.rooms?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-primary" /> Room Options & Pricing
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Available room types with rent details</p>
          <div className="space-y-3">
            {data.rooms!.map((room, i) => (
              <div key={i} className="flex items-center justify-between border rounded-xl px-4 py-3 hover:border-primary/40 transition-colors">
                <div>
                  <p className="font-semibold text-foreground text-sm">{room.roomType}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.bedsAvailable} bed{room.bedsAvailable > 1 ? "s" : ""} available
                  </p>
                </div>
                <div className="text-right">
                  {room.rent != null && (
                    <p className="font-bold text-primary text-sm">₹{room.rent.toLocaleString("en-IN")}/mo</p>
                  )}
                  {room.securityDeposit != null && (
                    <p className="text-xs text-muted-foreground">
                      Security: ₹{room.securityDeposit.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Common Areas */}
      {(data.commonAreas?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-bold text-foreground mb-1">Common Areas & Facilities</h2>
          <p className="text-xs text-muted-foreground mb-4">Shared spaces available in the PG</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.commonAreas!.map((area, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <p className="text-sm font-medium text-foreground">{area}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Furnishings & Amenities — card grid */}
      <FurnishingsAmenitiesDisplay
        furnishType={data.furnishType}
        furnishings={data.furnishings ?? []}
        amenities={data.amenities ?? []}
      />

      {/* Rules & Policies */}
      {(data.noticePeriod != null || data.lockInPeriod != null || (data.bestSuitedFor?.length ?? 0) > 0) && (
        <section>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-primary" /> Rules & Policies
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Tenancy rules for this PG</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.noticePeriod != null && (
              <div className="flex items-start gap-3 p-3 border rounded-xl">
                <Calendar className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Notice Period</p>
                  <p className="text-xs text-muted-foreground">{data.noticePeriod} days advance notice required</p>
                </div>
              </div>
            )}
            {data.lockInPeriod != null && (
              <div className="flex items-start gap-3 p-3 border rounded-xl">
                <Clock className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Lock-in Period</p>
                  <p className="text-xs text-muted-foreground">Minimum {data.lockInPeriod} days stay required</p>
                </div>
              </div>
            )}
            {(data.bestSuitedFor?.length ?? 0) > 0 && (
              <div className="flex items-start gap-3 p-3 border rounded-xl">
                <Users className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Preferred Tenants</p>
                  <p className="text-xs text-muted-foreground">Best suited for {data.bestSuitedFor!.join(" and ")}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}
