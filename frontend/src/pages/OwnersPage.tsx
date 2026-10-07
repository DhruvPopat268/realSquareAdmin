import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, CircleHelp, ChevronLeft, ChevronRight, Pencil, Trash2, ChevronDown, Upload, X, BadgeCheck, CircleX } from "lucide-react";
import { ownersService, type Owner } from "@/services/ownersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";
import EnquiryCitiesPicker from "@/components/EnquiryCitiesPicker";
import UserStatusStats, { type UserStatusCounts } from "@/components/UserStatusStats";

const PAGE_SIZES = [10, 25, 50];

const BUSINESS_TYPES = [
  { value: "private_owner",                label: "Private Owner" },
  { value: "real_estate_investment_trust", label: "Real Estate Investment Trust" },
  { value: "property_management_group",    label: "Property Management Group" },
  { value: "family_office",               label: "Family Office" },
];

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

const INIT_EDIT = {
  fullName: "", email: "", mobile: "",
  bizName: "", bizType: "", bizGst: "", bizEmail: "", bizMobile: "", bizWebsite: "",
};

export default function OwnersPage() {
  const { toast } = useToast();
  const [data, setData]         = useState<Owner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<UserStatusCounts>({ total: 0, active: 0, inactive: 0, deleted: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletionFilter, setDeletionFilter] = useState("false");

  const [editTarget, setEditTarget]     = useState<Owner | null>(null);
  const [editOpen, setEditOpen]         = useState(false);
  const [editForm, setEditForm]         = useState(INIT_EDIT);
  const [editErrors, setEditErrors]     = useState<Partial<typeof INIT_EDIT>>({});
  const [editProfilePhoto, setEditProfilePhoto] = useState<File | null>(null);
  const [editProfilePhotoPreview, setEditProfilePhotoPreview] = useState("");
  const editProfilePhotoRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile]         = useState<File | null>(null);
  const [logoPreview, setLogoPreview]   = useState("");
  const logoRef                         = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [editEnquiryCities, setEditEnquiryCities] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_EDIT);
  const [createErrors, setCreateErrors] = useState<Partial<typeof INIT_EDIT>>({});
  const [creating, setCreating] = useState(false);
  const [createEnquiryCities, setCreateEnquiryCities] = useState<string[]>([]);
  const [createProfilePhoto, setCreateProfilePhoto] = useState<File | null>(null);
  const [createProfilePhotoPreview, setCreateProfilePhotoPreview] = useState("");
  const [createBusinessLogo, setCreateBusinessLogo] = useState<File | null>(null);
  const [createBusinessLogoPreview, setCreateBusinessLogoPreview] = useState("");
  const createProfilePhotoRef = useRef<HTMLInputElement>(null);
  const createBusinessLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!createProfilePhotoPreview) return;
    return () => URL.revokeObjectURL(createProfilePhotoPreview);
  }, [createProfilePhotoPreview]);

  useEffect(() => {
    if (!editProfilePhotoPreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(editProfilePhotoPreview);
  }, [editProfilePhotoPreview]);

  useEffect(() => {
    if (!createBusinessLogoPreview) return;
    return () => URL.revokeObjectURL(createBusinessLogoPreview);
  }, [createBusinessLogoPreview]);

  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ownersService.getAll({
      isDeleted: deletionFilter,
      page,
      limit: pageSize,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    })
      .then((res) => {
        if (!active) return;
        setData(res.data.data);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
        setStats(res.data.stats);
      })
      .catch(() => { if (active) toast({ variant: "destructive", title: "Failed to load owners" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deletionFilter, page, pageSize, debouncedSearch, refreshKey]);

  function openEdit(o: Owner) {
    setEditTarget(o);
    setEditForm({
      fullName:   o.name                                        || "",
      email:      o.email                                       || "",
      mobile:     o.mobile                                      || "",
      bizName:    o.ownerProfile?.businessDetails?.name         || "",
      bizType:    o.ownerProfile?.businessDetails?.type         || "",
      bizGst:     o.ownerProfile?.businessDetails?.gstNumber    || "",
      bizEmail:   o.ownerProfile?.businessDetails?.email        || "",
      bizMobile:  o.ownerProfile?.businessDetails?.mobile       || "",
      bizWebsite: o.ownerProfile?.businessDetails?.website      || "",
    });
    setEditEnquiryCities(o.enquiryCities || []);
    setEditErrors({});
    setEditProfilePhoto(null);
    setEditProfilePhotoPreview(o.profilePhoto || "");
    if (editProfilePhotoRef.current) editProfilePhotoRef.current.value = "";
    setLogoFile(null);
    setLogoPreview(o.ownerProfile?.businessDetails?.logo || "");
    setEditOpen(true);
  }

  function openDelete(o: Owner) { setDeleteTarget(o); setDeleteOpen(true); }

  async function handleToggleStatus(o: Owner) {
    try {
      const res = await ownersService.updateStatus(o._id, { isActive: !o.isActive });
      setData((prev) => prev.map((item) => item._id === o._id ? res.data.data : item));
      setRefreshKey((key) => key + 1);
      toast({ title: `Owner ${!o.isActive ? "activated" : "deactivated"} successfully` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function handleToggleAutoApproval(o: Owner) {
    try {
      const res = await ownersService.updateStatus(o._id, { autoApprovalProperties: !o.autoApprovalProperties });
      setData((prev) => prev.map((item) => item._id === o._id ? res.data.data : item));
      toast({ title: `Auto approval ${!o.autoApprovalProperties ? "enabled" : "disabled"} successfully` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update auto approval" });
    }
  }

  async function handleEdit() {
    const errs: Partial<typeof INIT_EDIT> = {};
    if (!editForm.fullName.trim()) errs.fullName = "Name is required";
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("fullName",  editForm.fullName.trim());
      if (editForm.email.trim())      fd.append("email",     editForm.email.trim());
      if (editForm.mobile.trim())     fd.append("mobile",    editForm.mobile.trim());
      if (editForm.bizName.trim())    fd.append("bizName",   editForm.bizName.trim());
      if (editForm.bizType)           fd.append("bizType",   editForm.bizType);
      if (editForm.bizGst.trim())     fd.append("bizGst",    editForm.bizGst.trim());
      if (editForm.bizEmail.trim())   fd.append("bizEmail",  editForm.bizEmail.trim());
      if (editForm.bizMobile.trim())  fd.append("bizMobile", editForm.bizMobile.trim());
      if (editForm.bizWebsite.trim()) fd.append("bizWebsite",editForm.bizWebsite.trim());
      fd.append("enquiryCities", JSON.stringify(editEnquiryCities));
      if (editProfilePhoto)        fd.append("profilePhoto", editProfilePhoto);
      if (logoFile)                   fd.append("businessLogo", logoFile);

      const res = await ownersService.update(editTarget!._id, fd);
      setData((prev) => prev.map((item) => item._id === editTarget!._id ? res.data.data : item));
      setRefreshKey((key) => key + 1);
      setEditProfilePhoto(null);
      setEditProfilePhotoPreview("");
      toast({ title: "Owner updated successfully" });
      setEditOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to update owner" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateOwner() {
    const errors: Partial<typeof INIT_EDIT> = {};
    if (!createForm.fullName.trim()) errors.fullName = "Name is required";
    if (!/^\d{10}$/.test(createForm.mobile.trim())) errors.mobile = "Mobile must be exactly 10 digits";
    if (createForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (createForm.bizMobile.trim() && !/^\d{10}$/.test(createForm.bizMobile.trim())) {
      errors.bizMobile = "Business mobile must be exactly 10 digits";
    }
    if (Object.keys(errors).length) { setCreateErrors(errors); return; }

    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("fullName", createForm.fullName.trim());
      fd.append("mobile", createForm.mobile.trim());
      if (createForm.email.trim()) fd.append("email", createForm.email.trim());
      if (createForm.bizName.trim()) fd.append("bizName", createForm.bizName.trim());
      if (createForm.bizType) fd.append("bizType", createForm.bizType);
      if (createForm.bizGst.trim()) fd.append("bizGst", createForm.bizGst.trim());
      if (createForm.bizMobile.trim()) fd.append("bizMobile", createForm.bizMobile.trim());
      if (createForm.bizWebsite.trim()) fd.append("bizWebsite", createForm.bizWebsite.trim());
      fd.append("enquiryCities", JSON.stringify(createEnquiryCities));
      if (createProfilePhoto) fd.append("profilePhoto", createProfilePhoto);
      if (createBusinessLogo) fd.append("businessLogo", createBusinessLogo);

      await ownersService.create(fd);
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setDeletionFilter("false");
      setRefreshKey((key) => key + 1);
      setCreateOpen(false);
      setCreateForm(INIT_EDIT);
      setCreateErrors({});
      setCreateEnquiryCities([]);
      setCreateProfilePhoto(null);
      setCreateProfilePhotoPreview("");
      setCreateBusinessLogo(null);
      setCreateBusinessLogoPreview("");
      toast({ title: "Owner created successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to create owner" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ownersService.remove(deleteTarget._id);
      setData((prev) => prev.filter((o) => o._id !== deleteTarget._id));
      setPage(1);
      setRefreshKey((key) => key + 1);
      toast({ title: "Owner deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete owner" });
    } finally {
      setDeleting(false);
    }
  }

  function setField(key: keyof typeof INIT_EDIT, val: string) {
    setEditForm((f) => ({ ...f, [key]: val }));
    setEditErrors((e) => ({ ...e, [key]: undefined }));
  }

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Owners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all registered property owners.</p>
        </div>
        <Button onClick={() => { setCreateErrors({}); setCreateOpen(true); }}>+ Add Owner</Button>
      </div>

      <UserStatusStats stats={stats} />

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, email, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-64 text-sm"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Show searchable owner fields" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                <CircleHelp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="space-y-1"><p>Search by:</p><p>Name</p><p>Email</p><p>Mobile number</p></div>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1" />
          <select aria-label="Deleted status" value={deletionFilter} onChange={(e) => { setDeletionFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="false">Not Deleted</option><option value="true">Deleted</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 rounded-md border bg-background px-2 text-xs">
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <p className="text-sm text-muted-foreground">{total} owner{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Photo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mobile</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">Business Logo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">Business Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[180px]">Business Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">GST Number</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Enquiry Cities</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Deleted</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">Auto Approval</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Login</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Activity</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Joined At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={17} className="py-16"><Spinner fullPage={false} size="md" label="Loading owners..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={17} className="text-center text-muted-foreground py-16">No owners found</td></tr>
            ) : data.map((o, i) => (
              <tr key={o._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-24">
                  <div className="flex items-center gap-1">
                    <button disabled={o.isDeleted} onClick={() => openEdit(o)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-40"><Pencil className="h-3.5 w-3.5" /></button>
                    <button disabled={o.isDeleted} onClick={() => openDelete(o)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3">
                  {o.profilePhoto
                    ? <img src={o.profilePhoto} alt="profile" className="h-8 w-8 rounded-full object-cover border" />
                    : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>}
                </td>
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{o.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{o.email || "—"}</span>
                    {o.email && (o.emailVerified
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"><BadgeCheck className="h-3.5 w-3.5" />Verified</span>
                      : <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"><CircleX className="h-3.5 w-3.5" />Not verified</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{o.mobile || "—"}</td>
                <td className="px-4 py-3">
                  {o.ownerProfile?.businessDetails?.logo
                    ? <img src={o.ownerProfile.businessDetails.logo} alt="logo" className="h-8 w-8 rounded object-cover border" />
                    : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{o.ownerProfile?.businessDetails?.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{BUSINESS_TYPES.find((t) => t.value === o.ownerProfile?.businessDetails?.type)?.label || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{o.ownerProfile?.businessDetails?.gstNumber || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{o.enquiryCities?.length ? o.enquiryCities.join(", ") : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={o.isActive} onCheckedChange={() => handleToggleStatus(o)} disabled={o.isDeleted} className="scale-90" />
                    <span className={`text-xs font-medium ${o.isActive ? "text-green-600" : "text-muted-foreground"}`}>{o.isActive ? "Yes" : "No"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{o.isDeleted ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={o.autoApprovalProperties} onCheckedChange={() => handleToggleAutoApproval(o)} disabled={o.isDeleted} className="scale-90" />
                    <span className={`text-xs font-medium ${o.autoApprovalProperties ? "text-green-600" : "text-muted-foreground"}`}>{o.autoApprovalProperties ? "Yes" : "No"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {o.lastLogin ? (<><p className="text-sm text-foreground">{fmtDate(o.lastLogin).date}</p><p className="text-xs text-muted-foreground">{fmtDate(o.lastLogin).time}</p></>) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {o.lastActivity ? (<><p className="text-sm text-foreground">{fmtDate(o.lastActivity).date}</p><p className="text-xs text-muted-foreground">{fmtDate(o.lastActivity).time}</p></>) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(o.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(o.createdAt).time}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} entries</span>
        </div>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => { if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("..."); acc.push(p); return acc; }, [])
            .map((p, i) => p === "..." ? <span key={`e-${i}`} className="px-1">···</span> : (
              <button key={p} onClick={() => setPage(p as number)} className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{p}</button>
            ))}
          <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Add Owner Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!creating) setCreateOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Owner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Profile Photo</Label>
              <input ref={createProfilePhotoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setCreateProfilePhoto(file); setCreateProfilePhotoPreview(URL.createObjectURL(file)); }
              }} />
              <div className="flex items-center gap-3">
                {createProfilePhotoPreview ? <img src={createProfilePhotoPreview} alt="Owner profile" className="h-12 w-12 rounded-full border object-cover" /> : <div className="h-12 w-12 rounded-full border bg-muted" />}
                <Button type="button" variant="outline" size="sm" onClick={() => createProfilePhotoRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Choose Photo</Button>
                {createProfilePhoto && <Button type="button" variant="ghost" size="sm" onClick={() => { setCreateProfilePhoto(null); setCreateProfilePhotoPreview(""); if (createProfilePhotoRef.current) createProfilePhotoRef.current.value = ""; }}>Remove</Button>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={createForm.fullName} onChange={(e) => setCreateForm((form) => ({ ...form, fullName: e.target.value }))} placeholder="Full name" />
              {createErrors.fullName && <p className="text-xs text-destructive">{createErrors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile <span className="text-destructive">*</span></Label>
              <Input type="tel" inputMode="tel" maxLength={10} value={createForm.mobile} onChange={(e) => setCreateForm((form) => ({ ...form, mobile: e.target.value }))} placeholder="10-digit mobile" />
              {createErrors.mobile && <p className="text-xs text-destructive">{createErrors.mobile}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((form) => ({ ...form, email: e.target.value }))} placeholder="email@example.com" />
              {createErrors.email && <p className="text-xs text-destructive">{createErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Enquiry Cities</Label>
              <EnquiryCitiesPicker value={createEnquiryCities} onChange={setCreateEnquiryCities} />
              <p className="text-xs text-muted-foreground">Add cities where this owner wants to receive enquiries.</p>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Business Details</p>
            <div className="space-y-1.5">
              <Label>Business Logo</Label>
              <input ref={createBusinessLogoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setCreateBusinessLogo(file); setCreateBusinessLogoPreview(URL.createObjectURL(file)); }
              }} />
              <div className="flex items-center gap-3">
                {createBusinessLogoPreview ? <img src={createBusinessLogoPreview} alt="Business logo" className="h-12 w-12 rounded border object-cover" /> : <div className="h-12 w-12 rounded border bg-muted" />}
                <Button type="button" variant="outline" size="sm" onClick={() => createBusinessLogoRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Choose Logo</Button>
                {createBusinessLogo && <Button type="button" variant="ghost" size="sm" onClick={() => { setCreateBusinessLogo(null); setCreateBusinessLogoPreview(""); if (createBusinessLogoRef.current) createBusinessLogoRef.current.value = ""; }}>Remove</Button>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input value={createForm.bizName} onChange={(e) => setCreateForm((form) => ({ ...form, bizName: e.target.value }))} placeholder="Business name" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Type</Label>
              <select value={createForm.bizType} onChange={(e) => setCreateForm((form) => ({ ...form, bizType: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select type</option>
                {BUSINESS_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>GST Number</Label>
              <Input value={createForm.bizGst} onChange={(e) => setCreateForm((form) => ({ ...form, bizGst: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Mobile</Label>
              <Input type="tel" inputMode="tel" maxLength={10} value={createForm.bizMobile} onChange={(e) => setCreateForm((form) => ({ ...form, bizMobile: e.target.value }))} placeholder="10-digit mobile" />
              {createErrors.bizMobile && <p className="text-xs text-destructive">{createErrors.bizMobile}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={createForm.bizWebsite} onChange={(e) => setCreateForm((form) => ({ ...form, bizWebsite: e.target.value }))} placeholder="https://example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateOwner} disabled={creating}>{creating ? "Creating..." : "Add Owner"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Owner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Profile Photo (optional)</Label>
              <input ref={editProfilePhotoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setEditProfilePhoto(file); setEditProfilePhotoPreview(URL.createObjectURL(file)); }
              }} />
              <div className="flex items-center gap-3">
                {editProfilePhotoPreview
                  ? <img src={editProfilePhotoPreview} alt="Owner profile" className="h-14 w-14 rounded-full border object-cover" />
                  : <div className="h-14 w-14 rounded-full border bg-muted flex items-center justify-center text-xs text-muted-foreground">No photo</div>}
                <Button type="button" variant="outline" size="sm" onClick={() => editProfilePhotoRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Choose Photo</Button>
                {editProfilePhoto && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditProfilePhoto(null); setEditProfilePhotoPreview(editTarget?.profilePhoto || ""); if (editProfilePhotoRef.current) editProfilePhotoRef.current.value = ""; }}>Cancel Photo Change</Button>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editForm.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Full name" />
              {editErrors.fullName && <p className="text-xs text-destructive">{editErrors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input value={editForm.mobile} onChange={(e) => setField("mobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Enquiry Cities</Label>
              <EnquiryCitiesPicker value={editEnquiryCities} onChange={setEditEnquiryCities} />
              <p className="text-xs text-muted-foreground">Add cities where this owner wants to receive enquiries.</p>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Business Details</p>
            <div className="space-y-1.5">
              <Label>Business Logo</Label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? <img src={logoPreview} alt="logo" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">No logo</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => logoRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </Button>
                  {logoPreview && (
                    <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(""); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input value={editForm.bizName} onChange={(e) => setField("bizName", e.target.value)} placeholder="Business name" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Type</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className={editForm.bizType ? "text-foreground" : "text-muted-foreground"}>
                      {BUSINESS_TYPES.find((t) => t.value === editForm.bizType)?.label || "Select type"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {BUSINESS_TYPES.map((t) => <DropdownMenuItem key={t.value} onClick={() => setField("bizType", t.value)}>{t.label}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-1.5">
              <Label>GST Number</Label>
              <Input value={editForm.bizGst} onChange={(e) => setField("bizGst", e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Email</Label>
              <Input type="email" value={editForm.bizEmail} onChange={(e) => setField("bizEmail", e.target.value)} placeholder="biz@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Mobile</Label>
              <Input value={editForm.bizMobile} onChange={(e) => setField("bizMobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={editForm.bizWebsite} onChange={(e) => setField("bizWebsite", e.target.value)} placeholder="https://example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting ? "Saving..." : "Update Owner"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Owner</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name || deleteTarget?.mobile}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
