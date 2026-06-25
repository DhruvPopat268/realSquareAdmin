import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PROPERTIES, LISTING_STATUS_LABEL } from "@/data/propertiesData";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, Mail, Share2, MoreVertical, Bed, Bath,
  Maximize2, CheckCircle2, Car, Layers, CalendarDays, Tag, ArrowLeft,
} from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function fmtFull(n: number) {
  return "$" + n.toLocaleString();
}

const purposeStyle: Record<string, string> = {
  "Sell":           "bg-blue-50 text-blue-700 border border-blue-200",
  "Rent":           "bg-green-50 text-green-700 border border-green-200",
  "PG / Co-living": "bg-purple-50 text-purple-700 border border-purple-200",
};

const statusStyle: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ACTIVE:           "bg-green-50 text-green-700 border border-green-200",
  RESERVED:         "bg-blue-50 text-blue-700 border border-blue-200",
  SOLD:             "bg-gray-100 text-gray-600 border border-gray-200",
  RENTED:           "bg-teal-50 text-teal-700 border border-teal-200",
  EXPIRED:          "bg-orange-50 text-orange-700 border border-orange-200",
  INACTIVE:         "bg-slate-100 text-slate-500 border border-slate-200",
  ARCHIVED:         "bg-stone-100 text-stone-500 border border-stone-200",
  REJECTED:         "bg-red-50 text-red-600 border border-red-200",
};

function DetailItem({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const property = PROPERTIES.find((p) => p.id === Number(id));
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground text-lg">Property not found.</p>
        <Button variant="outline" onClick={() => navigate("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  const p = property;

  const handleComment = () => {
    if (!comment.trim()) return;
    setComments((c) => [...c, comment.trim()]);
    setComment("");
  };

  const imgs = p.images;

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="space-y-1">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Properties</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Property Details</span>
        </nav>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-3 gap-2 h-72 rounded-xl overflow-hidden">
        <div className="col-span-1 row-span-2 cursor-pointer" onClick={() => setLightbox(0)}>
          <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover hover:brightness-95 transition" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative cursor-pointer overflow-hidden" onClick={() => setLightbox(i)}>
            <img
              src={imgs[i] ?? imgs[0]}
              alt={`${p.title} ${i}`}
              className="w-full h-full object-cover hover:brightness-95 transition"
            />
            {i === 4 && imgs.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">30+</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img
            src={imgs[lightbox]}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-6 text-white text-2xl font-bold hover:opacity-70">✕</button>
        </div>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{p.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{p.address}, {p.city}</p>

          {/* Quick spec chips */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{LISTING_STATUS_LABEL[p.status]}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${purposeStyle[p.purpose] ?? "bg-muted text-muted-foreground border"}`}>{p.purpose}</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">{p.category}</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">{p.type}</span>
            {p.beds   !== undefined && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Bed className="h-4 w-4" />{p.beds}</span>}
            {p.baths  !== undefined && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Bath className="h-4 w-4" />{p.baths}</span>}
            <span className="flex items-center gap-1 text-sm text-muted-foreground"><Maximize2 className="h-4 w-4" />{p.sqft.toLocaleString()} sqft</span>
            {p.parking !== undefined && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Car className="h-4 w-4" />{p.parking} Parking</span>}
            {p.floor   !== undefined && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Layers className="h-4 w-4" />Floor {p.floor}{p.totalFloors ? ` / ${p.totalFloors}` : ""}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Content + Comment Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">

          {/* About */}
          <section>
            <h2 className="text-base font-bold text-foreground mb-2">About the Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
          </section>

          {/* Listing Details */}
          <section>
            <h2 className="text-base font-bold text-foreground">Listing Details</h2>
            <p className="text-xs text-muted-foreground mb-4">Pricing and listing information</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <DetailItem label="Purpose"         value={p.purpose} />
              <DetailItem label="Status"           value={LISTING_STATUS_LABEL[p.status]} />
              <DetailItem label="List Price"       value={fmtFull(p.price)} />
              <DetailItem label="Previous Price"   value={fmtFull(p.previousPrice)} />
              <DetailItem label="Days on Market"   value={p.daysOnMarket} />
              <DetailItem label="Agent"            value={p.agent} />
            </div>
          </section>

          {/* Property Classification */}
          <section>
            <h2 className="text-base font-bold text-foreground">Property Classification</h2>
            <p className="text-xs text-muted-foreground mb-4">Purpose and type</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <DetailItem label="Purpose"   value={p.purpose} />
              <DetailItem label="Category"  value={p.category} />
              <DetailItem label="Type"      value={p.type} />
              <DetailItem label="Ref #"     value={p.refNo} />
            </div>
          </section>

          {/* Property Specifications */}
          <section>
            <h2 className="text-base font-bold text-foreground">Specifications</h2>
            <p className="text-xs text-muted-foreground mb-4">Size, layout and physical details</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <DetailItem label="Built-up Area"       value={p.sqft ? `${p.sqft.toLocaleString()} sqft` : undefined} />
              <DetailItem label="Plot / Land Area"    value={p.plotSqft ? `${p.plotSqft.toLocaleString()} sqft` : undefined} />
              <DetailItem label="Bedrooms"            value={p.beds} />
              <DetailItem label="Bathrooms"           value={p.baths} />
              <DetailItem label="Parking Spaces"      value={p.parking} />
              <DetailItem label="Floor"               value={p.floor !== undefined ? `${p.floor}${p.totalFloors ? ` of ${p.totalFloors}` : ""}` : undefined} />
              <DetailItem label="Furnishing"          value={p.furnishing} />
              <DetailItem label="Construction Year"   value={p.constructionYear} />
              <DetailItem label="Occupancy"           value={p.occupancyType} />
              <DetailItem label="Meals Included"      value={p.mealsIncluded !== undefined ? (p.mealsIncluded ? "Yes" : "No") : undefined} />
            </div>
          </section>

          {/* Amenities & Features */}
          {p.amenities.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-foreground">Amenities & Features</h2>
              <p className="text-xs text-muted-foreground mb-4">What this property includes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
                {p.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-1.5 text-sm text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />{a}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Comments Panel */}
        <div className="xl:col-span-1">
          {/* Price summary card */}
          <div className="border rounded-xl p-4 bg-card space-y-3 mb-4">
            <h3 className="text-sm font-bold text-foreground">Price Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> List Price</span>
                <span className="font-bold text-foreground text-base">{fmt(p.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Previous Price</span>
                <span className="text-muted-foreground line-through">{fmt(p.previousPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Days on Market</span>
                <span className="font-medium text-foreground">{p.daysOnMarket}</span>
              </div>
            </div>
            <Button className="w-full" size="sm">Contact Agent</Button>
          </div>

          <div className="sticky top-4 border rounded-xl p-4 bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Comments</h3>
            <p className="text-xs text-muted-foreground">It's good to talk</p>

            {comments.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map((c, i) => (
                  <div key={i} className="bg-muted rounded-lg px-3 py-2 text-sm text-foreground">{c}</div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleComment(); }}
              placeholder="Say something"
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            <p className="text-[10px] text-muted-foreground">Press Ctrl+Enter to submit</p>
            <Button className="w-full" size="sm" onClick={handleComment}>Submit</Button>
          </div>
        </div>
      </div>

    </div>
  );
}
