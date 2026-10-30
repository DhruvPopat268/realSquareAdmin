import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, ChevronLeft, ChevronRight, Map, MapPin, XCircle } from "lucide-react";
import { projectListingService, type ProjectConfiguration, type ProjectListingRecord } from "@/services/projectListingService";
import ListingMediaSection from "@/components/ListingMediaSection";

const STATUS_STYLE: Record<string, string> = {
  UnderReview: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Active: "bg-green-50 text-green-700 border-green-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
  Sold: "bg-gray-100 text-gray-600 border-gray-200",
  sold: "bg-gray-100 text-gray-600 border-gray-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
};

function statusOptions(status: string) {
  if (status === "Active") return ["Inactive", "Sold"];
  if (["Inactive", "Sold", "sold", "Rejected"].includes(status)) return ["Active"];
  return [];
}

function displayStatus(status: string) {
  return status === "UnderReview" ? "Under Review" : status === "sold" ? "Sold" : status;
}

function dateText(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function money(value?: number) {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

function Item({ label, value }: { label: string; value?: unknown }) {
  if (value == null || value === "") return null;
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 break-words text-sm font-semibold text-foreground">{String(value)}</p></div>;
}

function formatArea(area: number | undefined, areaUnit?: string) {
  if (area == null) return "—";
  const units: Record<string, string> = { sqft: "sq.ft", sqyd: "sq.yd", sqmt: "sq.m" };
  return `${area.toLocaleString("en-IN")} ${units[areaUnit ?? ""] ?? areaUnit ?? "sq.ft"}`;
}

function formatBhk(value?: string | number) {
  if (value == null || value === "") return "Other";
  const text = String(value).trim();
  const numeric = text.match(/^(\d+(?:\.\d+)?)\s*(?:BHK)?$/i);
  if (!numeric) return text;
  const count = Number(numeric[1]);
  return count === 0 ? "1 RK" : `${count} BHK`;
}

function ConfigurationMedia({ configuration }: { configuration: ProjectConfiguration }) {
  const [activeMedia, setActiveMedia] = useState<"3d" | "2d">("3d");

  return <div>
    <div className="mb-3 flex gap-2" role="tablist" aria-label="Configuration media">
      <button type="button" role="tab" aria-selected={activeMedia === "3d"} onClick={() => setActiveMedia("3d")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${activeMedia === "3d" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground ring-1 ring-border hover:bg-muted"}`}>3D Model</button>
      <button type="button" role="tab" aria-selected={activeMedia === "2d"} onClick={() => setActiveMedia("2d")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${activeMedia === "2d" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground ring-1 ring-border hover:bg-muted"}`}>2D Image</button>
    </div>
    {activeMedia === "3d" ? configuration.model3DUrl
      ? <><model-viewer src={configuration.model3DUrl} alt="Interactive 3D project configuration" camera-controls auto-rotate touch-action="pan-y" environment-image="neutral" shadow-intensity="1" exposure="0.8" style={{ display: "block", width: "100%", height: "260px", background: "#dbe3ee", border: "1px solid #cbd5e1", borderRadius: "0.5rem" }} /><p className="mt-1 text-xs text-muted-foreground">Drag to rotate the 3D model</p></>
      : <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">3D model not available</div>
      : configuration.image2DUrl
        ? <a href={configuration.image2DUrl} target="_blank" rel="noreferrer" className="block"><img src={configuration.image2DUrl} alt="2D configuration" className="h-[260px] w-full rounded-md border bg-background object-contain" /></a>
        : <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">2D image not available</div>}
  </div>;
}

function ConfigurationCard({ configuration, areaUnit }: { configuration: ProjectConfiguration; areaUnit?: string }) {
  return <article className="rounded-lg border bg-background p-4">
    <ConfigurationMedia configuration={configuration} />
    <div className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
      <Item label="Carpet Area" value={formatArea(configuration.carpetArea, areaUnit)} />
      <div><p className="text-xs text-muted-foreground">Furnishing Status</p>{configuration.furnishingOptions?.length ? <div className="mt-1 flex flex-wrap gap-1">{configuration.furnishingOptions.map((option, index) => <span key={`${option}-${index}`} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{option}</span>)}</div> : <p className="mt-0.5 text-sm font-semibold text-foreground">—</p>}</div>
      <Item label="Starting Price" value={money(configuration.price)} />
    </div>
  </article>;
}

function ConfigurationSection({ project, residential, configurations }: { project: ProjectListingRecord; residential: boolean; configurations: ProjectConfiguration[] }) {
  const areaUnit = residential ? project.residentialDetails?.areaUnit : project.commercialDetails?.areaUnit;
  type AreaGroup = { key: string; label: string; configurations: ProjectConfiguration[] };
  type PrimaryGroup = { key: string; label: string; carpetAreas?: AreaGroup[]; configurations?: ProjectConfiguration[] };
  const groups: PrimaryGroup[] = residential
    ? (project.configurationGroups?.residential ?? []).map((group) => ({
      key: group.bhk,
      label: formatBhk(group.bhk),
      carpetAreas: group.carpetAreas.map((area) => ({
        key: area.carpetArea == null ? "__unspecified__" : String(Number(area.carpetArea)),
        label: formatArea(area.carpetArea ?? undefined, areaUnit),
        configurations: area.configurations,
      })),
    }))
    : (project.configurationGroups?.commercial ?? []).map((group) => ({
      key: group.carpetArea == null ? "__unspecified__" : String(Number(group.carpetArea)),
      label: formatArea(group.carpetArea ?? undefined, areaUnit),
      configurations: group.configurations,
    }));
  const [selectedGroupKey, setSelectedGroupKey] = useState(groups[0]?.key ?? "");
  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) ?? groups[0];
  const areaGroups = residential ? selectedGroup?.carpetAreas ?? [] : [];
  const firstAreaKey = areaGroups[0]?.key ?? "";
  const [selectedAreaKey, setSelectedAreaKey] = useState(areaGroups[0]?.key ?? "");
  const selectedArea = residential ? areaGroups.find((area) => area.key === selectedAreaKey) ?? areaGroups[0] : selectedGroup;
  const currentConfigurations = selectedArea?.configurations ?? [];
  const [activeConfigurationIndex, setActiveConfigurationIndex] = useState(0);

  useEffect(() => {
    setSelectedAreaKey(firstAreaKey);
    setActiveConfigurationIndex(0);
  }, [selectedGroup?.key, firstAreaKey]);
  useEffect(() => setActiveConfigurationIndex(0), [selectedArea?.key]);

  return <section className="rounded-xl border bg-card p-5">
    <h2 className="mb-4 text-base font-bold">{residential ? "Residential Configurations" : "Commercial Carpet Area Configurations"}</h2>
    {!configurations.length ? <p className="text-sm text-muted-foreground">No configurations provided.</p> : <>
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3"><Item label="Area Unit" value={areaUnit} />{!residential && <><Item label="Zone Type" value={project.commercialDetails?.zoneType} /><Item label="Location Hub" value={project.commercialDetails?.locationHub} /></>}</div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={residential ? "Configurations by BHK" : "Configurations by carpet area"}>
        {groups.map((group) => <button key={group.key} type="button" role="tab" aria-selected={selectedGroup?.key === group.key} onClick={() => { setSelectedGroupKey(group.key); setActiveConfigurationIndex(0); }} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${selectedGroup?.key === group.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{group.label}</button>)}
      </div>
      {residential && areaGroups.length > 0 && <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Carpet area configurations">
        {areaGroups.map((area) => <button key={area.key} type="button" role="tab" aria-selected={selectedArea?.key === area.key} onClick={() => { setSelectedAreaKey(area.key); setActiveConfigurationIndex(0); }} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${selectedArea?.key === area.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{area.label}</button>)}
      </div>}
      {currentConfigurations.length > 0 && <>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{currentConfigurations.length} {currentConfigurations.length === 1 ? "configuration" : "configurations"} available</span>
          {currentConfigurations.length > 1 && <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous configuration" onClick={() => setActiveConfigurationIndex((index) => (index - 1 + currentConfigurations.length) % currentConfigurations.length)}>‹</Button>
            <span className="min-w-12 text-center text-xs text-muted-foreground">{activeConfigurationIndex + 1} / {currentConfigurations.length}</span>
            <Button variant="outline" size="icon" aria-label="Next configuration" onClick={() => setActiveConfigurationIndex((index) => (index + 1) % currentConfigurations.length)}>›</Button>
          </div>}
        </div>
        <ConfigurationCard key={`${selectedGroup?.key}-${selectedArea?.key}-${activeConfigurationIndex}`} configuration={currentConfigurations[activeConfigurationIndex] ?? currentConfigurations[0]} areaUnit={areaUnit} />
      </>}
    </>}
  </section>;
}

export default function ProjectDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectListingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const [mapsTarget, setMapsTarget] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectInput, setRejectInput] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    projectListingService.getById(id).then(({ data }) => {
      if (!cancelled) { setProject(data.data); setError(""); }
    }).catch((requestError) => {
      if (!cancelled) setError(requestError?.response?.data?.message ?? "Failed to load project details");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const approveProject = async () => {
    if (!project) return;
    setApproving(true);
    try {
      const { data } = await projectListingService.approve(project._id);
      setProject((current) => current ? { ...current, status: data.data.status, approvedAt: data.data.approvedAt, rejectedAt: null, rejectedReasons: [] } : current);
      setApproveOpen(false);
      toast.success(data.message);
    } catch (requestError: any) { toast.error(requestError?.response?.data?.message ?? "Failed to approve project"); }
    finally { setApproving(false); }
  };

  const rejectProject = async () => {
    if (!project || rejectReasons.length === 0) return;
    setRejecting(true);
    try {
      const { data } = await projectListingService.reject(project._id, rejectReasons);
      setProject((current) => current ? { ...current, status: data.data.status, rejectedAt: data.data.rejectedAt, rejectedReasons: data.data.rejectedReasons, approvedAt: null } : current);
      setRejectOpen(false);
      setRejectReasons([]);
      setRejectInput("");
      toast.success(data.message);
    } catch (requestError: any) { toast.error(requestError?.response?.data?.message ?? "Failed to reject project"); }
    finally { setRejecting(false); }
  };

  const updateStatus = async () => {
    if (!project || !selectedStatus || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const { data } = await projectListingService.updateStatus(project._id, selectedStatus);
      setProject((current) => current ? { ...current, status: data.data.status } : current);
      setStatusOpen(false);
      setSelectedStatus("");
      toast.success(data.message);
    } catch (requestError: any) { toast.error(requestError?.response?.data?.message ?? "Failed to update project status"); }
    finally { setUpdatingStatus(false); }
  };

  const addRejectReason = () => {
    const reason = rejectInput.trim();
    if (reason && !rejectReasons.includes(reason)) setRejectReasons((current) => [...current, reason]);
    setRejectInput("");
  };

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading project…</div>;
  if (!project) return <div className="space-y-4"><Button variant="outline" onClick={() => navigate("/projects")}><ArrowLeft className="mr-2 h-4 w-4" />Projects</Button><div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error || "Project not found"}</div></div>;

  const images = project.media?.images ?? [];
  const residential = project.category?.name?.toLowerCase().includes("residential") ?? false;
  const configurations = residential
    ? (project.residentialDetails?.configurations ?? [])
    : (project.commercialDetails?.configurations ?? []);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 px-0"><ArrowLeft className="mr-2 h-4 w-4" />Back to Projects</Button><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold">{project.projectName}</h1><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[project.status] ?? ""}`}>{displayStatus(project.status)}</span></div><p className="mt-1 text-sm text-muted-foreground">{project.developerName || "Developer not provided"} · {project.category?.name || "Project"}</p><p className="mt-2 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{project.locality?.latitude != null && project.locality?.longitude != null ? <button type="button" onClick={() => setMapsTarget({ address: [project.locality?.address, project.cityName].filter(Boolean).join(", ") || "Project location", lat: project.locality!.latitude!, lng: project.locality!.longitude! })} className="text-left text-blue-600 hover:underline">{[project.locality?.address, project.cityName].filter(Boolean).join(", ")}</button> : <span>{[project.locality?.address, project.cityName].filter(Boolean).join(", ") || "Location not provided"}</span>}</p></div>
      <div className="flex flex-wrap items-center gap-2">{statusOptions(project.status).length > 0 && <Button variant="outline" onClick={() => { setSelectedStatus(""); setStatusOpen(true); }}>Update Status</Button>}</div>
    </div>

    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {project.status === "UnderReview" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800"><span>This project is under review. Approve or reject it after review.</span><div className="flex gap-2"><Button size="sm" onClick={() => setApproveOpen(true)}>Approve</Button><Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button></div></div>}

    <ListingMediaSection
      images={images}
      onImageClick={setActiveImage}
      videoUrl={project.media?.videos?.videoUrl}
      ytVideoUrl={project.media?.videos?.ytVideoUrl}
      reelUrl={project.media?.reelVideo?.reelUrl}
      ytReelUrl={project.media?.reelVideo?.ytReelUrl}
      brochureUrl={project.brochureUrl}
    />

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><div className="space-y-6 xl:col-span-2">
      <section className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-base font-bold">Project Details</h2><div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3"><Item label="Project Name" value={project.projectName} /><Item label="Developer Name" value={project.developerName} /><Item label="Category" value={project.category?.name} /><Item label="Project Status" value={project.projectStatus} /><Item label="Listing Status" value={displayStatus(project.status)} /><Item label="Total Units" value={project.totalUnits} /><Item label="Available Units" value={project.availableUnits} /><Item label="Number of Towers" value={project.towerCount} /><Item label="Minimum Price" value={money(project.minPrice)} /><Item label="Maximum Price" value={money(project.maxPrice)} /><Item label="Launch Date" value={dateText(project.launchDate)} /><Item label="Possession Date" value={dateText(project.possessionDate)} /><Item label="Created At" value={dateText(project.createdAt)} /><Item label="Updated At" value={dateText(project.updatedAt)} /></div>{project.locality?.address && <div className="mt-4 border-t pt-4"><p className="text-xs text-muted-foreground">Locality</p>{project.locality.latitude != null && project.locality.longitude != null ? <button type="button" onClick={() => setMapsTarget({ address: project.locality!.address!, lat: project.locality!.latitude!, lng: project.locality!.longitude! })} className="mt-1 inline-flex items-center gap-1 text-left text-sm font-semibold text-blue-600 hover:underline"><MapPin className="h-3.5 w-3.5" />{project.locality.address}</button> : <p className="mt-1 text-sm font-semibold">{project.locality.address}</p>}</div>}{project.projectDescription && <div className="mt-4 border-t pt-4"><h3 className="text-sm font-semibold">Description</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{project.projectDescription}</p></div>}</section>

      {project.idealFor?.length ? <section className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-base font-bold">Ideal For</h2><div className="flex flex-wrap gap-3">{project.idealFor.map((item, index) => <div key={item.id ?? `${item.name}-${index}`} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">{item.image && <img src={item.image} alt="" className="h-8 w-8 object-contain" />}<span className="text-sm font-medium">{item.name}</span></div>)}</div></section> : null}

      <ConfigurationSection project={project} residential={residential} configurations={configurations} />

      {(project.furnishings?.length || project.amenities?.length) ? <section className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-base font-bold">Furnishings & Amenities</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{project.furnishings?.length ? <div><h3 className="mb-2 text-sm font-semibold">Furnishings</h3><ul className="space-y-1 text-sm text-muted-foreground">{project.furnishings.map((item, index) => <li key={index}>{item.name}{item.count != null ? ` × ${item.count}` : ""}</li>)}</ul></div> : null}{project.amenities?.length ? <div><h3 className="mb-2 text-sm font-semibold">Amenities</h3><ul className="space-y-1 text-sm text-muted-foreground">{project.amenities.map((item, index) => <li key={index}>{item.name}{item.count != null ? ` × ${item.count}` : ""}</li>)}</ul></div> : null}</div></section> : null}

      {project.rera?.reraId && <section className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-base font-bold">RERA Details</h2><div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><Item label="RERA ID" value={project.rera.reraId} /><Item label="Verification Status" value={project.rera.reraStatus} /><Item label="Admin Approved" value={project.rera.reraAdminApproved ? "Yes" : "No"} /><Item label="Verified At" value={dateText(project.rera.verifiedAt)} /></div>{project.rera.projectDetails && <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">{Object.entries(project.rera.projectDetails).filter(([, value]) => value != null && value !== "").map(([key, value]) => <Item key={key} label={key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())} value={value} />)}</div>}{project.rera.sources?.length ? <div className="mt-4 border-t pt-4"><h3 className="mb-2 text-sm font-semibold">Sources</h3>{project.rera.sources.map((source, index) => <a key={`${source}-${index}`} href={source} target="_blank" rel="noreferrer" className="block break-all text-sm text-blue-600 hover:underline">{source}</a>)}</div> : null}</section>}
    </div>

    <aside className="space-y-6"><section className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-base font-bold">Listed By</h2><div className="grid grid-cols-1 gap-4"><Item label="Name" value={project.listedBy?.name} /><Item label="Mobile" value={project.listedBy?.mobile} /><Item label="Email" value={project.listedBy?.email} /><Item label="Role" value={project.listedBy?.role?.name} /></div></section><section className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-base font-bold">Review History</h2><div className="grid grid-cols-1 gap-4"><Item label="Approved At" value={dateText(project.approvedAt ?? undefined)} /><Item label="Rejected At" value={dateText(project.rejectedAt ?? undefined)} /></div>{project.rejectedReasons?.length ? <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-red-600">{project.rejectedReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}</section>{project.locality?.latitude != null && project.locality?.longitude != null && <Button variant="outline" className="w-full" onClick={() => setMapsTarget({ address: project.locality?.address ?? project.cityName ?? "Project location", lat: project.locality!.latitude!, lng: project.locality!.longitude! })}><Map className="mr-2 h-4 w-4" />Open in Google Maps</Button>}</aside></div>

    {activeImage != null && images[activeImage] && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={() => setActiveImage(null)}><img src={images[activeImage]} alt="Project" className="max-h-[85vh] max-w-[85vw] object-contain" onClick={(event) => event.stopPropagation()} /><button type="button" aria-label="Close image" onClick={() => setActiveImage(null)} className="absolute right-5 top-4 text-3xl text-white">×</button>{images.length > 1 && <><button type="button" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage - 1 + images.length) % images.length); }} className="absolute left-4 top-1/2 rounded-full bg-black/50 p-3 text-white"><ChevronLeft /></button><button type="button" aria-label="Next image" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage + 1) % images.length); }} className="absolute right-4 top-1/2 rounded-full bg-black/50 p-3 text-white"><ChevronRight /></button></>}</div>}

    <Dialog open={approveOpen} onOpenChange={(open) => { if (!approving) setApproveOpen(open); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Approve Project</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Approve “{project.projectName}”? The listing will become Active.</p><DialogFooter><Button variant="outline" disabled={approving} onClick={() => setApproveOpen(false)}>Cancel</Button><Button disabled={approving} onClick={() => void approveProject()}>{approving ? "Approving…" : "Approve"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={rejectOpen} onOpenChange={(open) => { if (!rejecting && !open) { setRejectOpen(false); setRejectReasons([]); setRejectInput(""); } }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Reject Project</DialogTitle></DialogHeader><div className="space-y-3"><p className="text-sm text-muted-foreground">Add one or more rejection reasons. Press <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">Enter</kbd> after each reason to add it.</p>{rejectReasons.length > 0 && <div className="flex flex-wrap gap-2">{rejectReasons.map((reason, index) => <span key={`${reason}-${index}`} className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700">{reason}<button type="button" onClick={() => setRejectReasons((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="font-bold leading-none hover:text-red-900" aria-label={`Remove ${reason}`}>×</button></span>)}</div>}<input autoFocus value={rejectInput} onChange={(event) => setRejectInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addRejectReason(); } }} placeholder="Type a reason and press Enter..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />{rejectReasons.length === 0 && <p className="text-xs text-red-500">At least 1 reason is required</p>}</div><DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReasons([]); setRejectInput(""); }} disabled={rejecting}>Cancel</Button><Button variant="destructive" onClick={() => void rejectProject()} disabled={rejecting || rejectReasons.length === 0}>{rejecting ? "Rejecting..." : "Reject"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={statusOpen} onOpenChange={(open) => { if (!updatingStatus) setStatusOpen(open); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Update Project Status</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Current status: {displayStatus(project.status)}</p><div className="flex flex-col gap-2">{statusOptions(project.status).map((option) => <button key={option} type="button" onClick={() => setSelectedStatus(option)} className={`rounded-lg border px-3 py-2 text-left text-sm ${selectedStatus === option ? "border-primary bg-primary/5" : ""}`}>{option === "Active" ? "Mark as Active" : `Mark as ${option}`}</button>)}</div><DialogFooter><Button variant="outline" disabled={updatingStatus} onClick={() => { setStatusOpen(false); setSelectedStatus(""); }}>Cancel</Button><Button disabled={updatingStatus || !selectedStatus} onClick={() => void updateStatus()}>{updatingStatus ? "Updating…" : "Confirm"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!mapsTarget} onOpenChange={(open) => { if (!open) setMapsTarget(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="flex items-center gap-2"><Map className="h-4 w-4 text-blue-500" />Open in Google Maps</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Open “{mapsTarget?.address}” in Google Maps?</p><DialogFooter><Button variant="outline" onClick={() => setMapsTarget(null)}>Cancel</Button><Button onClick={() => { if (!mapsTarget) return; window.open(`https://www.google.com/maps?q=${mapsTarget.lat},${mapsTarget.lng}`, "_blank", "noopener,noreferrer"); setMapsTarget(null); }}>Open Maps</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
