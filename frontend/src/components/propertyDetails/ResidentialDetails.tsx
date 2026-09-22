import { Home } from "lucide-react";
import type { ResidentialDetails as ResidentialDetailsType, SellInfo, RentInfo } from "@/services/propertyListingService";
import FurnishingsAmenitiesDisplay from "./FurnishingsAmenitiesDisplay";

interface Props {
  data: ResidentialDetailsType;
  sellInfo?: SellInfo;
  rentInfo?: RentInfo;
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

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default function ResidentialDetails({ data, sellInfo, rentInfo }: Props) {
  const securityDepositLabel = () => {
    const sd = rentInfo?.securityDeposit;
    if (!sd) return null;
    if (sd.type === "None")    return "None";
    if (sd.type === "1Month")  return "1 Month";
    if (sd.type === "2Month")  return "2 Months";
    if (sd.amount)             return `₹${sd.amount.toLocaleString("en-IN")}`;
    return "As per agreement";
  };

  const bhkLabel = data.bhk === 0 ? "1 RK" : data.bhk ? `${data.bhk} BHK` : null;

  return (
    <div className="space-y-6">

      {/* Property Overview */}
      <section>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
          <Home className="h-4 w-4 text-primary" /> Property Overview
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Key specifications for this residential property</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <InfoItem label="BHK Configuration"   value={bhkLabel} />
          <InfoItem label="Built-up Area"        value={formatArea(data.builtUpArea)} />
          <InfoItem label="Society / Building"   value={data.societyName} />
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
          <InfoItem label="Security Deposit"    value={securityDepositLabel()} />
        </div>
      </section>

      {/* Furnishings & Amenities — card grid */}
      <FurnishingsAmenitiesDisplay
        furnishType={data.furnishType}
        furnishings={data.furnishings ?? []}
        amenities={data.amenities ?? []}
      />

    </div>
  );
}
