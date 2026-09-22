/**
 * FurnishingsAmenitiesDisplay.tsx
 *
 * Read-only Housing.com-style card grid for admin property detail page.
 * Icon is stored in the listing document itself (denormalized at PATCH time).
 */

interface FurnishingItem {
  id?: string;
  name: string;
  icon?: string;
  count?: number;
}

interface AmenityItem {
  id?: string;
  name: string;
  icon?: string;
  count?: number;
}

interface Props {
  furnishType?: string;
  furnishings?: FurnishingItem[];
  amenities?:   AmenityItem[];
}

// ── Icon: real image if URL present, else letter-abbreviation SVG ─────────────

function ItemIcon({ icon, label }: { icon?: string; label: string }) {
  if (icon) {
    return (
      <img
        src={icon}
        alt={label}
        className="w-8 h-8 object-contain"
      />
    );
  }
  const abbr = label
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="currentColor" opacity="0.1" />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
        {abbr}
      </text>
    </svg>
  );
}

// ── Single item card ──────────────────────────────────────────────────────────

function ItemCard({ name, icon, count }: { name: string; icon?: string; count?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border
      border-primary/30 bg-primary/5 text-primary p-3 select-none">
      <ItemIcon icon={icon} label={name} />
      <span className="text-[11px] font-semibold text-center leading-tight line-clamp-2">
        {name}
      </span>
      {count != null && count > 1 && (
        <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
          ×{count}
        </span>
      )}
    </div>
  );
}

// ── Furnish type badge ────────────────────────────────────────────────────────

function FurnishTypeBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    "Fully-Furnished": "bg-green-50 text-green-700 border-green-200",
    "Semi-Furnished":  "bg-amber-50 text-amber-700 border-amber-200",
    "Unfurnished":     "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[value] ?? "bg-muted text-muted-foreground border"}`}>
      {value}
    </span>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function FurnishingsAmenitiesDisplay({ furnishType, furnishings = [], amenities = [] }: Props) {
  const hasFurnishings = furnishings.length > 0;
  const hasAmenities   = amenities.length > 0;

  if (!furnishType && !hasFurnishings && !hasAmenities) return null;

  return (
    <div className="space-y-6">

      {/* Furnish Type */}
      {furnishType && (
        <section>
          <h2 className="text-base font-bold text-foreground mb-1">Furnishing Status</h2>
          <p className="text-xs text-muted-foreground mb-3">Overall furnishing level of this property</p>
          <FurnishTypeBadge value={furnishType} />
        </section>
      )}

      {/* Flat Furnishings */}
      {hasFurnishings && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-foreground">Flat Furnishings</h2>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {furnishings.length} item{furnishings.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Items included with this property</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {furnishings.map((f, i) => (
              <ItemCard key={f.id ?? i} name={f.name} icon={f.icon} count={f.count} />
            ))}
          </div>
        </section>
      )}

      {/* Society Amenities */}
      {hasAmenities && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-foreground">Society Amenities</h2>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {amenities.length} item{amenities.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Facilities available in the society / building</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {amenities.map((a, i) => (
              <ItemCard key={a.id ?? i} name={a.name} icon={a.icon} count={undefined} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
