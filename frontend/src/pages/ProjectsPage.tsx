import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axiosInterceptor";
import { systemUsersService, type ActiveUser } from "@/services/systemUsersService";
import { projectListingService, type ProjectListingRecord } from "@/services/projectListingService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Eye, LayoutGrid, List, MapPin, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STATUSES = ["UnderReview", "Active", "Inactive", "Sold", "Rejected"];
const STATUS_STYLE: Record<string, string> = {
  UnderReview: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Active: "bg-green-50 text-green-700 border-green-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
  Sold: "bg-gray-100 text-gray-600 border-gray-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
};
const PROJECT_STATUS_STYLE: Record<string, string> = {
  "Ready to Move": "bg-green-50 text-green-700 border-green-200",
  "Under Construction": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "New Launch": "bg-blue-50 text-blue-700 border-blue-200",
};

function getStatusOptions(status: string) {
  if (status === "Active") return ["Inactive", "Sold"];
  if (["Inactive", "Sold", "sold", "Rejected"].includes(status)) return ["Active"];
  return [];
}

function formatStatus(status: string) {
  return status === "UnderReview" ? "Under Review" : status === "sold" ? "Sold" : status;
}

function formatPrice(value?: number) {
  if (value == null) return "—";
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDateTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListingRecord[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({ total: 0, Active: 0, Inactive: 0, Sold: 0, UnderReview: 0, Rejected: 0 });
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ _id: string; name: string }>>([]);
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [roleId, setRoleId] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const [pendingCategoryId, setPendingCategoryId] = useState("");
  const [pendingCity, setPendingCity] = useState("");
  const [pendingRoleId, setPendingRoleId] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ProjectListingRecord | null>(null);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectInput, setRejectInput] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ project: ProjectListingRecord; status: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [mapsTarget, setMapsTarget] = useState<{ address: string; lat: number; lng: number } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/admin/property-categories"),
      api.get("/admin/property-listings/listing-user-roles"),
    ]).then(([categoryResponse, roleResponse]) => {
      setCategories(categoryResponse.data?.data ?? []);
      setRoles(roleResponse.data?.data ?? []);
    }).catch(() => toast.error("Failed to load project filter options"));
  }, []);

  useEffect(() => {
    if (!userSearch.trim()) {
      systemUsersService.getActiveUsers()
        .then((response) => setUsers(response.data?.data ?? []))
        .catch(() => setUsers([]));
      return;
    }
    const timer = window.setTimeout(() => {
      systemUsersService.getActiveUsers({ search: userSearch.trim() })
        .then((response) => setUsers(response.data?.data ?? []))
        .catch(() => setUsers([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    projectListingService.getAll({ page, limit, categoryId, city, roleId, userId, status })
      .then(({ data }) => {
        if (cancelled) return;
        setProjects(data.data.projects);
        setStats(data.data.stats);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
        setError("");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError?.response?.data?.message ?? "Failed to load project listings");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, limit, categoryId, city, roleId, userId, status]);

  const selectedUser = useMemo(() => users.find((user) => user._id === pendingUserId), [users, pendingUserId]);

  const updateLocalStatus = (projectId: string, nextStatus: string, extra: Partial<ProjectListingRecord> = {}) => {
    setProjects((current) => current.map((project) => project._id === projectId ? { ...project, ...extra, status: nextStatus } : project));
    setStats((current) => {
      const next = { ...current };
      const old = projects.find((project) => project._id === projectId)?.status;
      const oldKey = old === "sold" ? "Sold" : old;
      if (oldKey && next[oldKey] > 0) next[oldKey] -= 1;
      const nextKey = nextStatus === "sold" ? "Sold" : nextStatus;
      next[nextKey] = (next[nextKey] ?? 0) + 1;
      return next;
    });
  };

  const handleApprove = async (project: ProjectListingRecord) => {
    try {
      const { data } = await projectListingService.approve(project._id);
      updateLocalStatus(project._id, data.data.status, { approvedAt: data.data.approvedAt, rejectedAt: null, rejectedReasons: [] });
      toast.success(data.message);
    } catch (requestError: any) {
      toast.error(requestError?.response?.data?.message ?? "Failed to approve project");
    }
  };

  const addRejectReason = () => {
    const reason = rejectInput.trim();
    if (reason && !rejectReasons.includes(reason)) setRejectReasons((current) => [...current, reason]);
    setRejectInput("");
  };

  const handleReject = async () => {
    if (!rejectTarget || rejectReasons.length === 0) return;
    setRejectLoading(true);
    try {
      const { data } = await projectListingService.reject(rejectTarget._id, rejectReasons);
      updateLocalStatus(rejectTarget._id, data.data.status, { rejectedAt: data.data.rejectedAt, rejectedReasons: data.data.rejectedReasons, approvedAt: null });
      toast.success(data.message);
      setRejectTarget(null);
      setRejectReasons([]);
      setRejectInput("");
    } catch (requestError: any) {
      toast.error(requestError?.response?.data?.message ?? "Failed to reject project");
    } finally {
      setRejectLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget || statusLoading) return;
    setStatusLoading(true);
    try {
      const { data } = await projectListingService.updateStatus(statusTarget.project._id, statusTarget.status);
      updateLocalStatus(statusTarget.project._id, data.data.status);
      toast.success(data.message);
      setStatusTarget(null);
    } catch (requestError: any) {
      toast.error(requestError?.response?.data?.message ?? "Failed to update project status");
    } finally {
      setStatusLoading(false);
    }
  };

  const applyFilters = () => {
    setCategoryId(pendingCategoryId);
    setCity(pendingCity.trim());
    setRoleId(pendingRoleId);
    setUserId(pendingUserId);
    setStatus(pendingStatus);
    setPage(1);
  };
  const clearFilters = () => {
    setPendingCategoryId(""); setPendingCity(""); setPendingRoleId(""); setPendingUserId(""); setPendingStatus(""); setUserSearch("");
    setCategoryId(""); setCity(""); setRoleId(""); setUserId(""); setStatus(""); setPage(1);
  };
  const hasAppliedFilters = Boolean(categoryId || city || roleId || userId || status);

  const actions = (project: ProjectListingRecord) => (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <button onClick={() => navigate(`/projects/${project._id}`)} className="rounded-md bg-green-50 p-1.5 text-green-600 transition-colors hover:bg-green-100" title="View" aria-label="View project"><Eye className="h-3.5 w-3.5" /></button>
      {project.status === "UnderReview" && <>
        <button onClick={() => void handleApprove(project)} className="rounded-md bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100" title="Approve" aria-label="Approve project"><CheckCircle className="h-3.5 w-3.5" /></button>
        <button onClick={() => { setRejectTarget(project); setRejectReasons([]); setRejectInput(""); }} className="rounded-md bg-red-50 p-1.5 text-red-500 transition-colors hover:bg-red-100" title="Reject" aria-label="Reject project"><XCircle className="h-3.5 w-3.5" /></button>
      </>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Review and manage project listings</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[["Total", stats.total], ["Under Review", stats.UnderReview], ["Active", stats.Active], ["Sold", stats.Sold], ["Inactive", stats.Inactive], ["Rejected", stats.Rejected]].map(([label, count]) => (
          <div key={String(label)} className={`rounded-xl border p-4 ${label === "Under Review" ? "bg-yellow-50" : label === "Active" ? "bg-green-50" : label === "Sold" ? "bg-gray-50" : label === "Inactive" ? "bg-slate-100" : label === "Rejected" ? "bg-red-50" : "bg-card"}`}><p className={`text-xs ${label === "Under Review" ? "text-yellow-600" : label === "Active" ? "text-green-600" : label === "Sold" ? "text-gray-500" : label === "Inactive" ? "text-slate-500" : label === "Rejected" ? "text-red-500" : "text-muted-foreground"}`}>{label === "Total" ? "Total Projects" : label}</p><p className={`mt-1 text-2xl font-bold ${label === "Under Review" ? "text-yellow-700" : label === "Active" ? "text-green-700" : label === "Sold" ? "text-gray-600" : label === "Inactive" ? "text-slate-600" : label === "Rejected" ? "text-red-600" : "text-foreground"}`}>{count}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Rows per page</span><select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-8 w-20 rounded-md border bg-background px-2 text-sm">{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></div>
        <p className="text-sm text-muted-foreground">{total} project{total === 1 ? "" : "s"}</p>
        <div className="flex-1" />
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">{pendingCategoryId ? categories.find((item) => item._id === pendingCategoryId)?.name ?? "All Categories" : "All Categories"}<ChevronDown className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onClick={() => setPendingCategoryId("")}>All Categories</DropdownMenuItem>{categories.map((item) => <DropdownMenuItem key={item._id} onClick={() => setPendingCategoryId(item._id)}>{item.name}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">{pendingStatus ? formatStatus(pendingStatus) : "All Statuses"}<ChevronDown className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onClick={() => setPendingStatus("")}>All Statuses</DropdownMenuItem>{STATUSES.map((value) => <DropdownMenuItem key={value} onClick={() => setPendingStatus(value)}>{formatStatus(value)}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        <div className="flex items-center gap-0.5 rounded-lg border p-1"><button type="button" title="Grid view" onClick={() => setView("grid")} className={`rounded-md p-1.5 ${view === "grid" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}><LayoutGrid className="h-3.5 w-3.5" /></button><button type="button" title="List view" onClick={() => setView("list")} className={`rounded-md p-1.5 ${view === "list" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}><List className="h-3.5 w-3.5" /></button></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={pendingCity} onChange={(event) => setPendingCity(event.target.value)} placeholder="Search by city or locality..." className="h-9 w-[300px]" />
        <div className="flex-1" />
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">{pendingRoleId ? roles.find((item) => item._id === pendingRoleId)?.name ?? "All Roles" : "All Roles"}<ChevronDown className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onClick={() => setPendingRoleId("")}>All Roles</DropdownMenuItem>{roles.map((item) => <DropdownMenuItem key={item._id} onClick={() => setPendingRoleId(item._id)}>{item.name}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              {selectedUser ? (selectedUser.name || selectedUser.mobile) : pendingUserId ? "Selected User" : "All Users"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-1.5">
              <input
                autoFocus
                value={userSearch}
                onChange={(event) => { setUserSearch(event.target.value); setPendingUserId(""); }}
                onKeyDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                placeholder="Search by name..."
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <DropdownMenuItem onClick={() => { setPendingUserId(""); setUserSearch(""); }}>All Users</DropdownMenuItem>
            {users.map((user) => <DropdownMenuItem key={user._id} onClick={() => setPendingUserId(user._id)}>{user.name ?? user.mobile} — {user.roleName || user.role}</DropdownMenuItem>)}
            {userSearch.trim() && users.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No users found</div>}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2"><Button size="sm" className="h-9" onClick={applyFilters}>Apply</Button>{hasAppliedFilters && <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors ml-1 underline underline-offset-2">Clear all</button>}</div>
      </div>

      {loading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading projects…</div> : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : projects.length === 0 ? <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">No projects found.</div> : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => <article key={project._id} className="overflow-hidden rounded-xl border bg-card">
            {project.media?.images?.[0] ? <img src={project.media.images[0]} alt={project.projectName} className="h-48 w-full object-cover" /> : <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">No project photo</div>}
            <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><h2 className="font-bold">{project.projectName}</h2><span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLE[project.status] ?? ""}`}>{formatStatus(project.status)}</span></div>
              <p className="text-xs text-muted-foreground">{project.category?.name ?? "—"} · {project.developerName ?? "Developer not provided"}</p>
              <p className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{[project.locality?.address, project.cityName].filter(Boolean).join(", ") || "—"}</p>
              <p className="text-sm font-semibold">{formatPrice(project.minPrice)} – {formatPrice(project.maxPrice)}</p>{actions(project)}
            </div>
          </article>)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-max w-full text-sm">
            <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">{["Actions", "#", "Image", "Project Name", "Developer Name", "Category", "City", "Locality", "Project Status", "Price Range", "Units", "Status", "Rejected Reasons", "Listed By", "Approved At", "Rejected At", "Created At", "Updated At"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
            <tbody>{projects.map((project, index) => <tr key={project._id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
              <td className="px-4 py-3">{actions(project)}</td><td className="whitespace-nowrap px-4 py-3 font-medium">{(page - 1) * limit + index + 1}</td>
              <td className="px-4 py-3">{project.media?.images?.[0] ? <img src={project.media.images[0]} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" /> : <span className="text-muted-foreground">—</span>}</td>
              <td className="max-w-56 px-4 py-3 font-semibold"><span className="block truncate" title={project.projectName}>{project.projectName || "—"}</span></td><td className="max-w-48 px-4 py-3"><span className="block truncate" title={project.developerName || "—"}>{project.developerName || "—"}</span></td><td className="whitespace-nowrap px-4 py-3">{project.category?.name || "—"}</td><td className="whitespace-nowrap px-4 py-3">{project.cityName || "—"}</td>
              <td className="px-4 py-3"><div className="w-36">{project.locality?.address ? <button type="button" title={project.locality.address} disabled={project.locality.latitude == null || project.locality.longitude == null} onClick={() => setMapsTarget({ address: project.locality!.address!, lat: project.locality!.latitude!, lng: project.locality!.longitude! })} className="block w-full truncate text-left text-blue-600 hover:underline disabled:text-muted-foreground disabled:no-underline">{project.locality.address}</button> : <span className="text-muted-foreground">—</span>}</div></td>
              <td className="whitespace-nowrap px-4 py-3">{project.projectStatus ? <span className={`rounded-full border px-2 py-0.5 text-xs ${PROJECT_STATUS_STYLE[project.projectStatus] ?? "bg-muted text-muted-foreground border-border"}`}>{project.projectStatus}</span> : "—"}</td><td className="whitespace-nowrap px-4 py-3 font-semibold">{formatPrice(project.minPrice)} – {formatPrice(project.maxPrice)}</td><td className="whitespace-nowrap px-4 py-3">{project.availableUnits ?? "—"}/{project.totalUnits ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3">{getStatusOptions(project.status).length ? <select value={project.status === "sold" ? "Sold" : project.status} onChange={(event) => setStatusTarget({ project, status: event.target.value })} className={`h-8 rounded-full border px-2 text-xs ${STATUS_STYLE[project.status] ?? ""}`}><option value={project.status === "sold" ? "Sold" : project.status}>{formatStatus(project.status)}</option>{getStatusOptions(project.status).map((option) => <option key={option} value={option}>{option}</option>)}</select> : <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[project.status] ?? ""}`}>{formatStatus(project.status)}</span>}</td>
              <td className="max-w-[180px] px-4 py-3 text-xs"><div className="space-y-0.5">{project.rejectedReasons?.length ? project.rejectedReasons.map((reason, reasonIndex) => <p key={`${reason}-${reasonIndex}`} className="line-clamp-2 break-words text-red-500" title={reason}>{reason}</p>) : "—"}</div></td><td className="px-4 py-3 text-xs"><p className="whitespace-nowrap font-medium">{project.listedBy?.name || "—"}</p><p className="whitespace-nowrap text-muted-foreground">{project.listedBy?.role?.name || "—"}</p></td>
              {[project.approvedAt, project.rejectedAt, project.createdAt, project.updatedAt].map((value, dateIndex) => {
                const formatted = formatDateTime(value);
                return <td key={dateIndex} className="whitespace-nowrap px-4 py-3 text-xs">{formatted ? <><p className="font-medium text-foreground">{formatted.date}</p><p className="text-muted-foreground">{formatted.time}</p></> : <span className="text-muted-foreground">—</span>}</td>;
              })}
            </tr>)}</tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-3"><span className="text-sm text-muted-foreground">Page {page} of {Math.max(1, totalPages)}</span><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open && !rejectLoading) { setRejectTarget(null); setRejectReasons([]); setRejectInput(""); } }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Reject Project</DialogTitle></DialogHeader><div className="space-y-3"><p className="text-sm text-muted-foreground">Add one or more rejection reasons. Press <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">Enter</kbd> after each reason to add it.</p>{rejectReasons.length > 0 && <div className="flex flex-wrap gap-2">{rejectReasons.map((reason, index) => <span key={`${reason}-${index}`} className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700">{reason}<button type="button" onClick={() => setRejectReasons((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="font-bold leading-none hover:text-red-900" aria-label={`Remove ${reason}`}>×</button></span>)}</div>}<input autoFocus value={rejectInput} onChange={(event) => setRejectInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addRejectReason(); } }} placeholder="Type a reason and press Enter..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />{rejectReasons.length === 0 && <p className="text-xs text-red-500">At least 1 reason is required</p>}</div><DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReasons([]); setRejectInput(""); }} disabled={rejectLoading}>Cancel</Button><Button variant="destructive" onClick={() => void handleReject()} disabled={rejectLoading || rejectReasons.length === 0}>{rejectLoading ? "Rejecting..." : "Reject"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!statusTarget} onOpenChange={(open) => { if (!open && !statusLoading) setStatusTarget(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Update Project Status</DialogTitle></DialogHeader><p>Change {statusTarget?.project.projectName} to <strong>{statusTarget ? formatStatus(statusTarget.status) : ""}</strong>?</p><DialogFooter><Button variant="outline" disabled={statusLoading} onClick={() => setStatusTarget(null)}>Cancel</Button><Button disabled={statusLoading} onClick={() => void handleStatusUpdate()}>{statusLoading ? "Updating…" : "Confirm"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!mapsTarget} onOpenChange={(open) => { if (!open) setMapsTarget(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Open in Google Maps</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Open “{mapsTarget?.address}” in Google Maps?</p><DialogFooter><Button variant="outline" onClick={() => setMapsTarget(null)}>Cancel</Button><Button onClick={() => { if (!mapsTarget) return; window.open(`https://www.google.com/maps?q=${mapsTarget.lat},${mapsTarget.lng}`, "_blank", "noopener,noreferrer"); setMapsTarget(null); }}>Open Maps</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
