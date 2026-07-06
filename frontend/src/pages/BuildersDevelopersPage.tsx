import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, Upload, X } from "lucide-react";
import { buildersService, type Builder } from "@/services/buildersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

const PAGE_SIZES = [10, 25, 50];

const INIT_FORM = {
  name: "", email: "", mobile: "",
  gstNumber: "", cinNumber: "", foundedYear: "", totalProjectsDelivered: "",
};

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function BuildersDevelopersPage() {
  const { toast } = useToast();
  const [data, setData]         = useState<Builder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [viewTarget, setViewTarget] = useState<Builder | null>(null);
  const [viewOpen, setViewOpen]     = useState(false);

  const [editTarget, setEditTarget]     = useState<Builder | null>(null);
  const [editOpen, setEditOpen]         = useState(false);
  const [isCreating, setIsCreating]     = useState(false);
  const [editForm, setEditForm]         = useState(INIT_FORM);
  const [editErrors, setEditErrors]     = useState<Partial<typeof INIT_FORM>>({});
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Builder | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    buildersService.getAll()
      .then((res) => setData(res.data.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load builders" }))
      .finally(() => setLoading(false));
  }, []);

  function openView(b: Builder) { setViewTarget(b); setViewOpen(true); }

  function openCreate() {
    setIsCreating(true);
    setEditTarget(null);
    setEditForm(INIT_FORM);
    setEditErrors({});
    setPhotoFile(null);
    setPhotoPreview("");
    setEditOpen(true);
  }

  function openEdit(b: Builder) {
    setIsCreating(false);
    setEditTarget(b);
    setEditForm({
      name:                   b.builderProfile?.name                              || "",
      email:                  b.builderProfile?.email                             || "",
      mobile:                 b.mobile                                            || "",
      gstNumber:              b.builderProfile?.gstNumber                         || "",
      cinNumber:              b.builderProfile?.cinNumber                         || "",
      foundedYear:            b.builderProfile?.foundedYear?.toString()           || "",
      totalProjectsDelivered: b.builderProfile?.totalProjectsDelivered?.toString() || "",
    });
    setEditErrors({});
    setPhotoFile(null);
    setPhotoPreview(b.builderProfile?.profilePhoto || "");
    setEditOpen(true);
  }

  function openDelete(b: Builder) { setDeleteTarget(b); setDeleteOpen(true); }

  async function handleToggleStatus(b: Builder) {
    try {
      const res = await buildersService.updateStatus(b._id, { isActive: !b.isActive });
      setData((prev) => prev.map((item) => item._id === b._id ? res.data.data : item));
      toast({ title: `Builder ${!b.isActive ? "activated" : "deactivated"} successfully` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function handleToggleAutoApproval(b: Builder) {
    try {
      const res = await buildersService.updateStatus(b._id, { autoApprovalProperties: !b.autoApprovalProperties });
      setData((prev) => prev.map((item) => item._id === b._id ? res.data.data : item));
      toast({ title: `Auto approval ${!b.autoApprovalProperties ? "enabled" : "disabled"} successfully` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update auto approval" });
    }
  }

  async function handleSubmit() {
    const errs: Partial<typeof INIT_FORM> = {};
    if (!editForm.name.trim())   errs.name   = "Name is required";
    if (!editForm.mobile.trim()) errs.mobile = "Mobile is required";
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name",   editForm.name.trim());
      fd.append("mobile", editForm.mobile.trim());
      if (editForm.email.trim())                  fd.append("email",                  editForm.email.trim());
      if (editForm.gstNumber.trim())              fd.append("gstNumber",              editForm.gstNumber.trim());
      if (editForm.cinNumber.trim())              fd.append("cinNumber",              editForm.cinNumber.trim());
      if (editForm.foundedYear.trim())            fd.append("foundedYear",            editForm.foundedYear.trim());
      if (editForm.totalProjectsDelivered.trim()) fd.append("totalProjectsDelivered", editForm.totalProjectsDelivered.trim());
      if (photoFile)                              fd.append("profilePhoto",           photoFile);

      if (isCreating) {
        const res = await buildersService.create(fd);
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "Builder created successfully" });
      } else {
        const res = await buildersService.update(editTarget!._id, fd);
        setData((prev) => prev.map((item) => item._id === editTarget!._id ? res.data.data : item));
        toast({ title: "Builder updated successfully" });
      }
      setEditOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to save builder" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await buildersService.remove(deleteTarget._id);
      setData((prev) => prev.filter((b) => b._id !== deleteTarget._id));
      toast({ title: "Builder deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete builder" });
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((b) =>
      b.builderProfile?.name?.toLowerCase().includes(q) ||
      b.builderProfile?.email?.toLowerCase().includes(q) ||
      b.mobile?.includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function setField(key: keyof typeof INIT_FORM, val: string) {
    setEditForm((f) => ({ ...f, [key]: val }));
    setEditErrors((e) => ({ ...e, [key]: undefined }));
  }

  return (
    <div className="space-y-4">

      <div>
        <h1 className="text-2xl font-bold text-foreground">Builders / Developers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all registered builders and developers.</p>
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
        <p className="text-sm text-muted-foreground">{filtered.length} builder{filtered.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate}>+ Add Builder</Button>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">GST Number</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">CIN Number</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[140px]">Founded Year</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[170px]">Projects Delivered</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">Auto Approval</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Login</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Activity</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Joined At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} className="py-16"><Spinner fullPage={false} size="md" label="Loading builders..." /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={15} className="text-center text-muted-foreground py-16">No builders found</td></tr>
            ) : paged.map((b, i) => (
              <tr key={b._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-24">
                  <div className="flex items-center gap-1">
                    <button disabled onClick={() => openView(b)} className="p-1.5 rounded-md bg-green-50 text-green-600 opacity-40 cursor-not-allowed">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openDelete(b)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3">
                  {b.builderProfile?.profilePhoto
                    ? <img src={b.builderProfile.profilePhoto} alt="profile" className="h-8 w-8 rounded-full object-cover border" />
                    : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                  }
                </td>
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{b.builderProfile?.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.builderProfile?.email || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.mobile || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{b.builderProfile?.gstNumber || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{b.builderProfile?.cinNumber || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-center">{b.builderProfile?.foundedYear ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-center">{b.builderProfile?.totalProjectsDelivered ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={b.isActive} onCheckedChange={() => handleToggleStatus(b)} className="scale-90" />
                    <span className={`text-xs font-medium ${b.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {b.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={b.autoApprovalProperties} onCheckedChange={() => handleToggleAutoApproval(b)} className="scale-90" />
                    <span className={`text-xs font-medium ${b.autoApprovalProperties ? "text-green-600" : "text-muted-foreground"}`}>
                      {b.autoApprovalProperties ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {b.lastLogin ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(b.lastLogin).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(b.lastLogin).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {b.lastActivity ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(b.lastActivity).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(b.lastActivity).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(b.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(b.createdAt).time}</p>
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
          <DialogHeader><DialogTitle>Builder Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="space-y-3 py-2 text-sm">
              {viewTarget.builderProfile?.profilePhoto && (
                <img src={viewTarget.builderProfile.profilePhoto} alt="profile" className="h-16 w-16 rounded-full object-cover border" />
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="text-muted-foreground">Name</span><span className="font-medium">{viewTarget.builderProfile?.name || "—"}</span>
                <span className="text-muted-foreground">Email</span><span>{viewTarget.builderProfile?.email || "—"}</span>
                <span className="text-muted-foreground">Mobile</span><span>{viewTarget.mobile || "—"}</span>
                <span className="text-muted-foreground">GST</span><span>{viewTarget.builderProfile?.gstNumber || "—"}</span>
                <span className="text-muted-foreground">CIN</span><span>{viewTarget.builderProfile?.cinNumber || "—"}</span>
                <span className="text-muted-foreground">Founded</span><span>{viewTarget.builderProfile?.foundedYear ?? "—"}</span>
                <span className="text-muted-foreground">Projects</span><span>{viewTarget.builderProfile?.totalProjectsDelivered ?? "—"}</span>
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

      {/* Create / Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isCreating ? "Add Builder" : "Edit Builder"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {photoPreview
                    ? <img src={photoPreview} alt="photo" className="h-full w-full object-cover" />
                    : <span className="text-xs text-muted-foreground">No photo</span>
                  }
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => photoRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </Button>
                  {photoPreview && (
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(""); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editForm.name} onChange={(e) => setField("name", e.target.value)} placeholder="Builder / company name" />
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile <span className="text-destructive">*</span></Label>
              <Input value={editForm.mobile} onChange={(e) => setField("mobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} disabled={!isCreating} />
              {editErrors.mobile && <p className="text-xs text-destructive">{editErrors.mobile}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>GST Number</Label>
              <Input value={editForm.gstNumber} onChange={(e) => setField("gstNumber", e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5">
              <Label>CIN Number</Label>
              <Input value={editForm.cinNumber} onChange={(e) => setField("cinNumber", e.target.value)} placeholder="U12345MH2020PTC123456" />
            </div>
            <div className="space-y-1.5">
              <Label>Founded Year</Label>
              <Input type="number" min={1900} max={new Date().getFullYear()} value={editForm.foundedYear} onChange={(e) => setField("foundedYear", e.target.value)} placeholder="e.g. 2005" />
            </div>
            <div className="space-y-1.5">
              <Label>Total Projects Delivered</Label>
              <Input type="number" min={0} value={editForm.totalProjectsDelivered} onChange={(e) => setField("totalProjectsDelivered", e.target.value)} placeholder="e.g. 12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : isCreating ? "Create Builder" : "Update Builder"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Builder</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.builderProfile?.name || deleteTarget?.mobile}</span>? This action cannot be undone.
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
