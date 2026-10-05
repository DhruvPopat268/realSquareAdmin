import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { customersService, type Customer } from "@/services/customersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";
import LocationPicker from "@/components/LocationPicker";

const PAGE_SIZES = [10, 25, 50];

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

const INIT_EDIT = { name: "", email: "", bio: "", mobile: "", locationName: "", locationLat: "", locationLng: "" };

export default function CustomersPage() {
  const { toast } = useToast();
  const [data, setData]         = useState<Customer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletionFilter, setDeletionFilter] = useState("false");

  const [viewTarget, setViewTarget] = useState<Customer | null>(null);
  const [viewOpen, setViewOpen]     = useState(false);

  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [editOpen, setEditOpen]     = useState(false);
  const [editForm, setEditForm]     = useState(INIT_EDIT);
  const [editErrors, setEditErrors] = useState<Partial<typeof INIT_EDIT>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    setLoading(true);
    customersService.getAll({ isDeleted: deletionFilter })
      .then((res) => setData(res.data.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load customers" }))
      .finally(() => setLoading(false));
  }, [deletionFilter]);

  function openView(c: Customer) { setViewTarget(c); setViewOpen(true); }

  function openEdit(c: Customer) {
    setEditTarget(c);
    setEditForm({
      name:         c.name                                              || "",
      email:        c.email                                             || "",
      bio:          c.customerProfile?.bio                             || "",
      mobile:       c.mobile                                            || "",
      locationName: c.customerProfile?.location?.name                  || "",
      locationLat:  c.customerProfile?.location?.latitude?.toString()  || "",
      locationLng:  c.customerProfile?.location?.longitude?.toString() || "",
    });
    setEditErrors({});
    setEditOpen(true);
  }

  function openDelete(c: Customer) { setDeleteTarget(c); setDeleteOpen(true); }

  async function handleToggleStatus(c: Customer) {
    try {
      const res = await customersService.updateStatus(c._id, !c.isActive);
      setData((prev) => prev.map((item) => item._id === c._id ? res.data.data : item));
      toast({ title: `Customer ${!c.isActive ? "activated" : "deactivated"} successfully` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function handleEdit() {
    const errs: Partial<typeof INIT_EDIT> = {};
    if (!editForm.name.trim()) errs.name = "Name is required";
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setSubmitting(true);
    try {
      const res = await customersService.update(editTarget!._id, {
        name:   editForm.name.trim(),
        ...(editForm.email.trim()  && { email:  editForm.email.trim() }),
        ...(editForm.bio.trim()    && { bio:    editForm.bio.trim() }),
        ...(editForm.mobile.trim() && { mobile: editForm.mobile.trim() }),
        ...(editForm.locationName.trim() && {
          location: {
            name:      editForm.locationName.trim(),
            latitude:  parseFloat(editForm.locationLat),
            longitude: parseFloat(editForm.locationLng),
          },
        }),
      });
      setData((prev) => prev.map((item) => item._id === editTarget!._id ? res.data.data : item));
      toast({ title: "Customer updated successfully" });
      setEditOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to update customer" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customersService.remove(deleteTarget._id);
      setData((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      toast({ title: "Customer deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete customer" });
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.mobile?.includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">

      <div>
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all registered customers.</p>
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
        <p className="text-sm text-muted-foreground">{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</p>
        <select aria-label="Deleted status" value={deletionFilter} onChange={(e) => { setDeletionFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="false">Not Deleted</option><option value="true">Deleted</option>
        </select>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Bio</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Enquiry Cities</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Deleted</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Login</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Last Activity</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Joined At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="py-16"><Spinner fullPage={false} size="md" label="Loading customers..." /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={14} className="text-center text-muted-foreground py-16">No customers found</td></tr>
            ) : paged.map((c, i) => (
              <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-24">
                  <div className="flex items-center gap-1">
                    <button disabled onClick={() => openView(c)} className="p-1.5 rounded-md bg-green-50 text-green-600 opacity-40 cursor-not-allowed">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button disabled={c.isDeleted} onClick={() => openEdit(c)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-40">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button disabled={c.isDeleted} onClick={() => openDelete(c)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-40">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3">
                  {c.profilePhoto
                    ? <img src={c.profilePhoto} alt="profile" className="h-8 w-8 rounded-full object-cover border" />
                    : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                  }
                </td>
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{c.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.mobile || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.customerProfile?.location?.name || "—"}</td>
                <td className="px-4 py-3 w-40 max-w-[160px]">
                  {c.customerProfile?.bio ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate text-muted-foreground cursor-default">{c.customerProfile.bio}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs whitespace-normal">{c.customerProfile.bio}</TooltipContent>
                    </Tooltip>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {c.enquiryCities?.length ? c.enquiryCities.join(", ") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={c.isActive} onCheckedChange={() => handleToggleStatus(c)} disabled={c.isDeleted} className="scale-90" />
                    <span className={`text-xs font-medium ${c.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {c.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">{c.isDeleted ? "Yes" : "No"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.lastLogin ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(c.lastLogin).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(c.lastLogin).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.lastActivity ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(c.lastActivity).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(c.lastActivity).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(c.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(c.createdAt).time}</p>
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
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
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
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >
                {p}
              </button>
            ))}
          <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="space-y-3 py-2 text-sm">
              {viewTarget.profilePhoto && (
                <img src={viewTarget.profilePhoto} alt="profile" className="h-16 w-16 rounded-full object-cover border" />
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="text-muted-foreground">Name</span><span className="font-medium">{viewTarget.name || "—"}</span>
                <span className="text-muted-foreground">Email</span><span>{viewTarget.email || "—"}</span>
                <span className="text-muted-foreground">Mobile</span><span>{viewTarget.mobile || "—"}</span>
                <span className="text-muted-foreground">Location</span><span>{viewTarget.customerProfile?.location?.name || "—"}</span>
                <span className="text-muted-foreground">Enquiry Cities</span><span>{viewTarget.enquiryCities?.length ? viewTarget.enquiryCities.join(", ") : "—"}</span>
                <span className="text-muted-foreground">Is Active</span>
                <span className={viewTarget.isActive ? "text-green-600 font-medium" : "text-muted-foreground"}>{viewTarget.isActive ? "Yes" : "No"}</span>
              </div>
              {viewTarget.customerProfile?.bio && (
                <div>
                  <p className="text-muted-foreground mb-1">Bio</p>
                  <p className="text-foreground">{viewTarget.customerProfile.bio}</p>
                </div>
              )}
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
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.name}
                onChange={(e) => { setEditForm((f) => ({ ...f, name: e.target.value })); setEditErrors((e) => ({ ...e, name: undefined })); }}
                placeholder="Full name"
              />
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input
                value={editForm.mobile}
                onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <LocationPicker
                value={editForm.locationName ? { name: editForm.locationName, latitude: parseFloat(editForm.locationLat) || 0, longitude: parseFloat(editForm.locationLng) || 0 } : null}
                onChange={(loc) => setEditForm((f) => ({ ...f, locationName: loc.name, locationLat: loc.latitude.toString(), locationLng: loc.longitude.toString() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Input
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Short bio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting ? "Saving..." : "Update Customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Customer</DialogTitle></DialogHeader>
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
