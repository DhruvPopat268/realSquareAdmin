import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { propertyListingService, type PropertyListing } from "@/services/propertyListingService";
import { Button } from "@/components/ui/button";
import PropertyTypeDetails from "@/components/propertyDetails/PropertyTypeDetails";
import Spinner from "@/components/Spinner";
import {
  ChevronRight, Tag, CalendarDays, ArrowLeft, MapPin, User, Maximize2,
} from "lucide-react";

const statusStyle: Record<string, string> = {
  UnderReview: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Active:      "bg-green-50 text-green-700 border border-green-200",
  Inactive:    "bg-slate-100 text-slate-600 border border-slate-200",
  Sold:        "bg-gray-100 text-gray-600 border border-gray-200",
  Rented:      "bg-teal-50 text-teal-700 border border-teal-200",
  Rejected:    "bg-red-50 text-red-600 border border-red-200",
};

const purposeStyle: Record<string, string> = {
  "Sell":           "bg-blue-50 text-blue-700 border border-blue-200",
  "Rent":           "bg-green-50 text-green-700 border border-green-200",
  "PG / Co-living": "bg-purple-50 text-purple-700 border border-purple-200",
};

function formatPrice(price?: number) {
  if (!price) return null;
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (price >= 100000)   return `₹${(price / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    propertyListingService.getById(id)
      .then((res) => {
        if (res.data.success) setProperty(res.data.data);
        else setError("Property not found.");
      })
      .catch(() => setError("Failed to load property."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner fullPage={false} size="md" label="Loading property..." /></div>;
  }

  if (error || !property) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground text-lg">{error ?? "Property not found."}</p>
        <Button variant="outline" onClick={() => navigate("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  const p = property;
  const imgs = p.media?.images ?? [];

  const displayPrice = p.sellInfo?.price
    ? formatPrice(p.sellInfo.price)
    : p.rentInfo?.monthlyRent
    ? `${formatPrice(p.rentInfo.monthlyRent)}/month`
    : "Price on request";

  const handleComment = () => {
    if (!comment.trim()) return;
    setComments((c) => [...c, comment.trim()]);
    setComment("");
  };

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

      {/* Image Gallery — 3 per row */}
      {imgs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden">
          {imgs.map((src, i) => (
            <div key={i} className="relative cursor-pointer overflow-hidden h-64 rounded-lg" onClick={() => setLightbox(i)}>
              <img src={src} alt={`Property ${i + 1}`} className="w-full h-full object-cover hover:brightness-95 transition" />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox — rendered via portal so it covers sidebar/header too */}
      {lightbox !== null && imgs[lightbox] && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={imgs[lightbox]}
            alt=""
            className="max-h-screen max-w-screen object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-6 text-white text-2xl font-bold hover:opacity-70"
          >✕</button>
        </div>,
        document.body
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status] ?? "bg-muted text-muted-foreground border"}`}>
              {p.status}
            </span>
            {p.listingType?.name && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${purposeStyle[p.listingType.name] ?? "bg-muted text-muted-foreground border"}`}>
                {p.listingType.name}
              </span>
            )}
            {p.category?.name && (
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                {p.category.name}
              </span>
            )}
            {p.propertyType?.name && (
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                {p.propertyType.name}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground">{displayPrice}</p>
          {(p.locality?.address || p.cityName) && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[p.locality?.address, p.cityName].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
        </div>
      </div>

      {/* Main Content + Side Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">

          {/* Listing Details */}
          <section>
            <h2 className="text-base font-bold text-foreground">Listing Details</h2>
            <p className="text-xs text-muted-foreground mb-4">Pricing and listing information</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <DetailItem label="Status"       value={p.status} />
              <DetailItem label="Purpose"      value={p.listingType?.name} />
              <DetailItem label="Category"     value={p.category?.name} />
              <DetailItem label="Type"         value={p.propertyType?.name} />
              <DetailItem label="City"         value={p.cityName} />
              <DetailItem label="Locality"     value={p.locality?.address} />
              {p.sellInfo?.price && (
                <DetailItem label="Sale Price" value={formatPrice(p.sellInfo.price) ?? undefined} />
              )}
              {p.rentInfo?.monthlyRent && (
                <DetailItem label="Monthly Rent" value={`${formatPrice(p.rentInfo.monthlyRent)}/month`} />
              )}
              <DetailItem label="Listed On"    value={formatDate(p.createdAt)} />
              <DetailItem label="Last Updated" value={formatDate(p.updatedAt)} />
            </div>
          </section>

          {/* Listed By */}
          <section>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
              <User className="h-4 w-4" /> Listed By
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Owner / agent details</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <DetailItem label="Name"   value={p.listedBy?.name} />
              <DetailItem label="Mobile" value={p.listedBy?.mobile} />
              <DetailItem label="Email"  value={p.listedBy?.email} />
              <DetailItem label="Role"   value={p.listedBy?.role?.name} />
            </div>
          </section>

          {/* Property Type-specific Details */}
          <section>
            <h2 className="text-base font-bold text-foreground mb-1">Property Details</h2>
            <p className="text-xs text-muted-foreground mb-4">Specific details based on property type</p>
            <PropertyTypeDetails listing={p} />
          </section>

        </div>

        {/* Side Panel */}
        <div className="xl:col-span-1">
          {/* Price summary card */}
          <div className="border rounded-xl p-4 bg-card space-y-3 mb-4">
            <h3 className="text-sm font-bold text-foreground">Price Summary</h3>
            <div className="space-y-2">
              {p.sellInfo?.price && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Sale Price</span>
                  <span className="font-bold text-foreground text-base">{formatPrice(p.sellInfo.price)}</span>
                </div>
              )}
              {p.rentInfo?.monthlyRent && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Monthly Rent</span>
                  <span className="font-bold text-foreground text-base">{formatPrice(p.rentInfo.monthlyRent)}/month</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Listed On</span>
                <span className="font-medium text-foreground">{formatDate(p.createdAt)}</span>
              </div>
              {(p.locality?.latitude && p.locality?.longitude) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" /> Location</span>
                  <span className="font-medium text-foreground text-xs">{p.locality.latitude.toFixed(4)}, {p.locality.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="sticky top-4 border rounded-xl p-4 bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Comments</h3>
            <p className="text-xs text-muted-foreground">Admin notes for this listing</p>

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
              placeholder="Add a note..."
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
