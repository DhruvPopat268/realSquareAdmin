import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, ChevronDown, Upload, X } from "lucide-react";
import { ownersService, type Owner } from "@/services/ownersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

const PAGE_SIZES = [10, 25, 50];

const BUSINESS_TYPES = [
  { value: "private_owner",                  label: "Private Owner" },
  { value: "real_estate_investment_trust",   label: "Real Estate Investment Trust" },
  { value: "property_management_group",      label: "Property Management Group" },
  { value: "family_office",                  label: "Family Office" },
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

  const [viewTarget, setViewTarget] = useState<Owner | null>(null);
  const [viewOpen, setViewOpen]     = useState(false);

  const [editTarget, setEditTarget] = useState<Owner | null>(null);
  const [editOpen, setEditOpen]     = useState(false);
  const [editForm, setEditForm]     = useState(INIT_EDIT);
  const [editErrors, setEditErrors] = useState<Partial<typeof INIT_EDIT>>({});
  const [logoFile, setLogoFile]     = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    ownersService.getAll()
      .then((res) => setData(res.data.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load owners" }))
      .finally(() => setLoading(false));
  }, []);

  function openView(o: Owner) { setViewTarget(o); setViewOpen(true); }

  function openEdit(o: Owner) {
    setEditTarget(o);
    setEditForm({
      fullName:   o.ownerProfile?.fullName                      || "",
      email:      o.ownerProfile?.email                         || "",
      mobile:     o.mobile                                      || "",
      bizName:    o.ownerProfile?.businessDetails?.name         || "",
      bizType:    o.ownerProfile?.businessDetails?.type         || "",
      bizGst:     o.ownerProfile?.businessDetails?.gstNumber    || "",
      bizEmail:   o.ownerProfile?.businessDetails?.email        || "",
      bizMobile:  o.ownerProfile?.businessDetails?.mobile       || "",
      bizWebsite: o.ownerProfile?.businessDetails?.website      || "",
    });
    setEditErrors({});
    setLogoFile(null);
    setLogoPreview(o.ownerProfile?.businessDetails?.logo || "");
    setEditOpen(true);
  }

  function openDelete(o: Owner) { setDeleteTarget(o); setDeleteOpen(true); }

  async function handleToggleStatus(o: Owner) {
    try {
      const res = await ownersService.updateStatus(o._id, { isActive: !o.isActive });
      setData((prev) => prev.map((item) => item._id === o._id ? res.data.data : item));
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
    if (!editForm.email.trim())    errs.email    = "Email is required";
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("fullName",  editForm.fullName.trim());
      fd.append("email",     editForm.email.trim());
      if (editForm.mobile.trim())     fd.append("mobile",     editForm.mobile.trim());
      if (editForm.bizName.trim())    fd.append("bizName",    editForm.bizName.trim());
      if (editForm.bizType)           fd.append("bizType",    editForm.bizType);
      if (editForm.bizGst.trim())     fd.append("bizGst",     editForm.bizGst.trim());
      if (editForm.bizEmail.trim())   fd.append("bizEmail",   editForm.bizEmail.trim());
      if (editForm.bizMobile.trim())  fd.append("bizMobile",  editForm.bizMobile.trim());
      if (editForm.bizWebsite.trim()) fd.append("bizWebsite", editForm.bizWebsite.trim());
      if (logoFile)                   fd.append("businessLogo", logoFile);

      const res = await ownersService.update(editTarget!._id, fd);
      setData((prev) => prev.map((item) => item._id === editTarget!._id ? res.data.data : item));
      toast({ title: "Owner updated successfully" });
      setEditOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to update owner" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ownersService.remove(deleteTarget._id);
      setData((prev) => prev.filter((o) => o._id !== deleteTarget._id));
      toast({ title: "Owner deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete owner" });
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((o) =>
      o.ownerProfile?.fullName?.toLowerCase().includes(q) ||
      o.ownerProfile?.email?.toLowerCase().includes(q) ||
      o.mobile?.includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function setField(key: keyof typeof INIT_EDIT, val: string) {
    setEditForm((f) => ({ ...f, [key]: val }));
    setEditErrors((e) => ({ ...e, [key]: undefined }));
  }

  return (
    <div className="space-y-4">

      <div>
        <h1 className="text-2xl font-bold text-foreground">Owners</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all registered property owners.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9 w-64 text-sm"
          />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{filtered.length} owner{filtered.length !== 1 ? "s" : ""}</p>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">Auto Approval</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Login</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Activity</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Joined At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} className="py-16"><Spinner fullPage={false} size="md" label="Loading owners..." /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={15} className="text-center text-muted-foreground py-16">No owners found</td></tr>
            ) : paged.map((o, i) => (
              <tr key={o._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-24">
                  <div className="flex items-center gap-1">
                    <button disabled onClick={() => openView(o)} className="p-1.5 rounded-md bg-green-50 text-green-600 opacity-40 cursor-not-allowed">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openEdit(o)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openDelete(o)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3">
                  {o.ownerProfile?.profilePhoto
                    ? <img src={o.ownerProfile.profilePhoto} alt="profile" className="h-8 w-8 rounded-full object-cover border" />
                    : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                  }
                </td>
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{o.ownerProfile?.fullName || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.ownerProfile?.email || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.mobile || "—"}</td>
                <td className="px-4 py-3">
                  {o.ownerProfile?.businessDetails?.logo
                    ? <img src={o.ownerProfile.businessDetails.logo} alt="logo" className="h-8 w-8 rounded object-cover border" />
                    : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                  }
                </td>
                <td className="px-4 py-3 text-muted-foreground">{o.ownerProfile?.businessDetails?.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {BUSINESS_TYPES.find((t) => t.value === o.ownerProfile?.businessDetails?.type)?.label || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{o.ownerProfile?.businessDetails?.gstNumber || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={o.isActive} onCheckedChange={() => handleToggleStatus(o)} className="scale-90" />
                    <span className={`text-xs font-medium ${o.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {o.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={o.autoApprovalProperties} onCheckedChange={() => handleToggleAutoApproval(o)} className="scale-90" />
                    <span className={`text-xs font-medium ${o.autoApprovalProperties ? "text-green-600" : "text-muted-foreground"}`}>
                      {o.autoApprovalProperties ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {o.lastLogin ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(o.lastLogin).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(o.lastLogin).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {o.lastActivity ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(o.lastActivity).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(o.lastActivity).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
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
          <span>
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 rounded-md border bg-background px-2 text-xs">
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === "..." ? (
              <span key={`e-${i}`} className="px-1">···</span>
            ) : (
              <button key={p} onClick={() => setPage(p as number)} className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{p}</button>
            ))}
          <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Owner Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="space-y-3 py-2 text-sm">
              {viewTarget.ownerProfile?.profilePhoto && (
                <img src={viewTarget.ownerProfile.profilePhoto} alt="profile" className="h-16 w-16 rounded-full object-cover border" />
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="text-muted-foreground">Name</span><span className="font-medium">{viewTarget.ownerProfile?.fullName || "—"}</span>
                <span className="text-muted-foreground">Email</span><span>{viewTarget.ownerProfile?.email || "—"}</span>
                <span className="text-muted-foreground">Mobile</span><span>{viewTarget.mobile || "—"}</span>
                <span className="text-muted-foreground">Business</span><span>{viewTarget.ownerProfile?.businessDetails?.name || "—"}</span>
                <span className="text-muted-foreground">GST</span><span>{viewTarget.ownerProfile?.businessDetails?.gstNumber || "—"}</span>
                <span className="text-muted-foreground">Is Active</span>
                <span className={viewTarget.isActive ? "text-green-600 font-medium" : "text-muted-foreground"}>{viewTarget.isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Owner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editForm.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Full name" />
              {editErrors.fullName && <p className="text-xs text-destructive">{editErrors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={editForm.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@example.com" />
              {editErrors.email && <p className="text-xs text-destructive">{editErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input value={editForm.mobile} onChange={(e) => setField("mobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Business Details</p>
            <div className="space-y-1.5">
              <Label>Business Logo</Label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="h-full w-full object-cover" />
                    : <span className="text-xs text-muted-foreground">No logo</span>
                  }
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
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }}
                />
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
                  {BUSINESS_TYPES.map((t) => (
                    <DropdownMenuItem key={t.value} onClick={() => setField("bizType", t.value)}>{t.label}</DropdownMenuItem>
                  ))}
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

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Owner</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.ownerProfile?.fullName || deleteTarget?.mobile}</span>? This action cannot be undone.
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
