import { Home, CheckCircle2 } from "lucide-react";
import type { ResidentialDetails as ResidentialDetailsType, SellInfo, RentInfo } from "@/services/propertyListingService";

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
    if (sd.type === "None") return "None";
    if (sd.type === "1Month") return "1 Month";
    if (sd.type === "2Month") return "2 Months";
    if (sd.amount) return `₹${sd.amount.toLocaleString("en-IN")}`;
    return "As per agreement";
  };

  return (
    <div className="space-y-6">

      {/* Property Overview */}
      <section>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
          <Home className="h-4 w-4 text-primary" /> Property Overview
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Key specifications for this residential property</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <InfoItem label="BHK Configuration" value={data.bhk ? `${data.bhk} BHK` : null} />
          <InfoItem label="Built-up Area"      value={formatArea(data.builtUpArea)} />
          <InfoItem label="Furnishing"         value={data.furnishType} />
          <InfoItem label="Society / Building" value={data.societyName} />
          <InfoItem label="Construction Status"
            value={
              sellInfo?.constructionStatus === "ReadyToMove" ? "Ready to Move" :
              sellInfo?.constructionStatus === "UnderConstruction" ? "Under Construction" :
              undefined
            }
          />
          <InfoItem label="Age of Property"
            value={sellInfo?.ageOfProperty != null ? `${sellInfo.ageOfProperty} year${sellInfo.ageOfProperty !== 1 ? "s" : ""}` : null}
          />
          <InfoItem label="Available From"    value={formatDate(sellInfo?.availableFrom ?? rentInfo?.availableFrom)} />
          <InfoItem label="Security Deposit"  value={securityDepositLabel()} />
        </div>
      </section>

      {/* Furnishings */}
      {(data.furnishings?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-bold text-foreground mb-1">Furnishings Included</h2>
          <p className="text-xs text-muted-foreground mb-4">Items provided with this property</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.furnishings!.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  {item.count != null && item.count > 1 && (
                    <p className="text-xs text-muted-foreground">×{item.count}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Amenities */}
      {(data.amenities?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-bold text-foreground mb-1">Amenities Available</h2>
          <p className="text-xs text-muted-foreground mb-4">Facilities available in the society / building</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.amenities!.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  {item.count != null && item.count > 1 && (
                    <p className="text-xs text-muted-foreground">×{item.count}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
