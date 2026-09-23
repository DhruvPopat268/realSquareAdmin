import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { propertyListingService, type PropertyListing } from "@/services/propertyListingService";
import { getAvailableStatusOptions, OPTION_COLOR_CONFIG, type StatusOption } from "@/lib/listingStatusOptions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import PropertyTypeDetails from "@/components/propertyDetails/PropertyTypeDetails";
import Spinner from "@/components/Spinner";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Tag, CalendarDays, ArrowLeft, MapPin, User, Maximize2,
  CheckCircle, XCircle, Map, Zap,
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

const STATUS_API_FN = {
  markInactive: propertyListingService.markInactive,
  markActive:   propertyListingService.markActive,
  markSold:     propertyListingService.markSold,
  markRented:   propertyListingService.markRented,
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

  const [lightbox, setLightbox] = useState<number | null>(null);

  // Maps dialog
  const [mapsDialog, setMapsDialog] = useState<{ address: string; lat: number; lng: number } | null>(null);

  // Approve / Reject
  const [approveDialog, setApproveDialog] = useState(false);
  const [approvingId, setApprovingId]     = useState(false);
  const [rejectDialog, setRejectDialog]   = useState(false);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectInput, setRejectInput]     = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Status update
  const [statusModal, setStatusModal] = useState<{
    options: StatusOption[];
    selectedOption: StatusOption | null;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleRejectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = rejectInput.trim();
      if (trimmed && !rejectReasons.includes(trimmed)) {
        setRejectReasons((prev) => [...prev, trimmed]);
      }
      setRejectInput("");
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setApprovingId(true);
    try {
      await propertyListingService.approve(id);
      toast.success("Property approved successfully");
      setProperty((prev) => prev ? { ...prev, status: "Active" } : prev);
      setApproveDialog(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to approve property");
    } finally {
      setApprovingId(false);
    }
  };

  const handleOpenStatusModal = () => {
    if (!property) return;
    const options = getAvailableStatusOptions(property.status, property.listingType?.id?.toString());
    if (options.length === 0) return;
    setStatusModal({
      options,
      selectedOption: options.length === 1 ? options[0] : null,
    });
  };

  const handleConfirmStatusUpdate = async () => {
    if (!statusModal?.selectedOption || !property) return;
    const apiFn = STATUS_API_FN[statusModal.selectedOption.apiAction];
    if (!apiFn) return;
    setStatusLoading(true);
    try {
      const { data } = await apiFn(property._id);
      if (data.success) {
        toast.success(data.message ?? "Status updated");
        setProperty((prev) => prev ? { ...prev, status: data.data.status } : prev);
        setStatusModal(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!id) return;
    if (rejectReasons.length === 0) { toast.error("Please add at least one rejection reason"); return; }
    setRejectLoading(true);
    try {
      await propertyListingService.reject(id, rejectReasons);
      toast.success("Property rejected");
      setProperty((prev) => prev ? { ...prev, status: "Rejected", rejectedReasons: rejectReasons } : prev);
      setRejectDialog(false);
      setRejectReasons([]);
      setRejectInput("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to reject property");
    } finally {
      setRejectLoading(false);
    }
  };

  // Close lightbox on Escape, navigate with arrow keys
  useEffect(() => {
    const total = property?.media?.images?.length ?? 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightbox(null); return; }
      if (e.key === "ArrowLeft")  setLightbox((i) => i !== null && total > 0 ? (i - 1 + total) % total : null);
      if (e.key === "ArrowRight") setLightbox((i) => i !== null && total > 0 ? (i + 1) % total : null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [property]);

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

      {/* Approve / Reject — banner above gallery for UnderReview */}
      {p.status === "UnderReview" && (
        <div className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
            <p className="text-sm font-medium text-yellow-800">This property is <span className="font-bold">Under Review</span> — approve or reject it.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => setApproveDialog(true)}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => { setRejectDialog(true); setRejectReasons([]); setRejectInput(""); }}
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        </div>
      )}

      {/* Update Status — above gallery */}
      {(() => {
        const statusOptions = getAvailableStatusOptions(p.status, p.listingType?.id?.toString());
        return statusOptions.length > 0 ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleOpenStatusModal}
            >
              <Zap className="h-3.5 w-3.5" /> Update Status
            </Button>
          </div>
        ) : null;
      })()}

      {/* Image Gallery — show first 4, 4th blurred with +N overlay */}
      {imgs.length > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden">
          {imgs.slice(0, 4).map((src, i) => {
            const isLast    = i === 3;
            const remaining = imgs.length - 4; // how many hidden beyond 4
            const showOverlay = isLast && remaining > 0;

            return (
              <div
                key={i}
                className="relative cursor-pointer overflow-hidden h-56 rounded-lg"
                onClick={() => setLightbox(i)}
              >
                <img
                  src={src}
                  alt={`Property ${i + 1}`}
                  className={`w-full h-full object-cover transition
                    ${showOverlay ? "blur-sm brightness-50 scale-105" : "hover:brightness-95"}`}
                />
                {showOverlay && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer"
                    onClick={() => setLightbox(3)}
                  >
                    <span className="text-white text-3xl font-bold drop-shadow">+{remaining}</span>
                    <span className="text-white/80 text-xs font-medium">more photos</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox — rendered via portal so it covers sidebar/header too */}
      {lightbox !== null && imgs[lightbox] && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Image */}
          <img
            src={imgs[lightbox]}
            alt=""
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-6 text-white text-2xl font-bold hover:opacity-70"
          >✕</button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {lightbox + 1} / {imgs.length}
          </div>

          {/* Left arrow */}
          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i! - 1 + imgs.length) % imgs.length); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Right arrow */}
          {lightbox < imgs.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i! + 1) % imgs.length); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Dot indicators (max 10 shown) */}
          {imgs.length > 1 && imgs.length <= 20 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightbox(i); }}
                  className={`rounded-full transition-all ${i === lightbox ? "w-4 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          )}
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
              {p.locality?.address && p.locality?.latitude && p.locality?.longitude ? (
                <button
                  onClick={() => setMapsDialog({ address: p.locality.address, lat: p.locality.latitude, lng: p.locality.longitude })}
                  className="text-blue-600 hover:underline"
                >
                  {[p.locality.address, p.cityName].filter(Boolean).join(", ")}
                </button>
              ) : (
                <span>{[p.locality?.address, p.cityName].filter(Boolean).join(", ")}</span>
              )}
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
              {p.locality?.address ? (
                <div>
                  <p className="text-xs text-muted-foreground">Locality</p>
                  {p.locality?.latitude && p.locality?.longitude ? (
                    <button
                      onClick={() => setMapsDialog({ address: p.locality.address, lat: p.locality.latitude, lng: p.locality.longitude })}
                      className="font-semibold text-blue-600 hover:underline mt-0.5 text-left"
                    >
                      {p.locality.address}
                    </button>
                  ) : (
                    <p className="font-semibold text-foreground mt-0.5">{p.locality.address}</p>
                  )}
                </div>
              ) : null}
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
          <div className="border rounded-xl p-4 bg-card space-y-3 mb-4">            <h3 className="text-sm font-bold text-foreground">Price Summary</h3>
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
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialog} onOpenChange={(open) => { if (!open) setApproveDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Property</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to approve this property listing? It will become{" "}
            <span className="font-semibold text-foreground">Active</span> and visible to customers.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(false)} disabled={approvingId}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approvingId}>
              {approvingId ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialog} onOpenChange={(open) => { if (!open) { setRejectDialog(false); setRejectReasons([]); setRejectInput(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add one or more rejection reasons. Press{" "}
              <kbd className="px-1.5 py-0.5 rounded border text-xs font-mono">Enter</kbd> after each reason.
            </p>
            {rejectReasons.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rejectReasons.map((r, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs rounded-full">
                    {r}
                    <button
                      onClick={() => setRejectReasons((prev) => prev.filter((_, idx) => idx !== i))}
                      className="hover:text-red-900 font-bold leading-none"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            <input
              autoFocus
              value={rejectInput}
              onChange={(e) => setRejectInput(e.target.value)}
              onKeyDown={handleRejectKeyDown}
              placeholder="Type a reason and press Enter..."
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            {rejectReasons.length === 0 && (
              <p className="text-xs text-red-500">At least 1 reason is required</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDialog(false); setRejectReasons([]); setRejectInput(""); }} disabled={rejectLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={rejectLoading || rejectReasons.length === 0}>
              {rejectLoading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status update dialog */}
      <Dialog
        open={!!statusModal}
        onOpenChange={(open) => { if (!open && !statusLoading) setStatusModal(null); }}
      >
        <DialogContent className="max-w-sm">
          {statusModal?.selectedOption ? (
            <>
              <DialogHeader>
                <DialogTitle>{statusModal.selectedOption.confirmTitle}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground py-2">
                {statusModal.selectedOption.confirmMessage}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusModal(null)} disabled={statusLoading}>
                  Cancel
                </Button>
                <Button
                  className={OPTION_COLOR_CONFIG[statusModal.selectedOption.color].confirmBtn}
                  onClick={handleConfirmStatusUpdate}
                  disabled={statusLoading}
                >
                  {statusLoading ? "Updating..." : "Confirm"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Update Status</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground mb-2">
                Current: <span className="font-semibold text-foreground">{p.status}</span>
              </p>
              <div className="flex flex-col gap-2">
                {statusModal?.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusModal((prev) => prev ? { ...prev, selectedOption: opt } : null)}
                    className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-left transition ${OPTION_COLOR_CONFIG[opt.color].btn}`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusModal(null)}>Cancel</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Maps Confirmation Dialog */}
      <Dialog open={!!mapsDialog} onOpenChange={(open) => { if (!open) setMapsDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-4 w-4 text-blue-500" /> Open in Google Maps
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-1">
            Do you want to view <span className="font-medium text-foreground">"{mapsDialog?.address}"</span> on Google Maps?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapsDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                window.open(`https://www.google.com/maps?q=${mapsDialog!.lat},${mapsDialog!.lng}`, "_blank", "noopener,noreferrer");
                setMapsDialog(null);
              }}
            >
              Open Maps
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
