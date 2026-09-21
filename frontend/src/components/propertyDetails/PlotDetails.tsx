import { Maximize2, Map } from "lucide-react";
import type { PlotDetails as PlotDetailsType, CommercialDetails, SellInfo } from "@/services/propertyListingService";

interface Props {
  data: PlotDetailsType;
  commercialDetails?: CommercialDetails; // commercial plots may have ownership/zone info
  sellInfo?: SellInfo;
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

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default function PlotDetails({ data, commercialDetails, sellInfo }: Props) {
  return (
    <div className="space-y-6">

      {/* Plot Overview */}
      <section>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
          <Maximize2 className="h-4 w-4 text-primary" /> Plot Overview
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Key specifications for this plot</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <InfoItem label="Plot Area"        value={formatArea(data.plotArea)} />
          <InfoItem label="Dimensions"
            value={data.length && data.width ? `${data.length} × ${data.width} ft` : null}
          />
          <InfoItem label="Society / Layout" value={data.societyName} />
          <InfoItem label="Ownership"        value={formatOwnership(commercialDetails?.ownership)} />
          <InfoItem label="Zone Type"        value={commercialDetails?.zoneType} />
          <InfoItem label="Location Hub"     value={commercialDetails?.locationHub} />
          <InfoItem label="Status"
            value={
              sellInfo?.constructionStatus === "ReadyToMove" ? "Ready for Construction" :
              sellInfo?.constructionStatus === "UnderConstruction" ? "Approved for Development" :
              undefined
            }
          />
          <InfoItem label="Available From"   value={formatDate(sellInfo?.availableFrom)} />
        </div>
      </section>

      {/* Plot Specifications */}
      <section>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
          <Map className="h-4 w-4 text-primary" /> Plot Specifications
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Area and dimension details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.plotArea?.value && (
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs font-semibold text-green-700 mb-1">Total Area</p>
              <p className="text-2xl font-bold text-green-600">{formatArea(data.plotArea)}</p>
            </div>
          )}
          {data.length && data.width && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">Plot Dimensions</p>
              <p className="text-xl font-bold text-blue-600">{data.length} ft × {data.width} ft</p>
              <p className="text-xs text-blue-500 mt-1">Perimeter: {2 * (data.length + data.width)} ft</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
