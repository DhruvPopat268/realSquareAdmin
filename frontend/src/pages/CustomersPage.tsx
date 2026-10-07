import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, CircleHelp, ChevronLeft, ChevronRight, Pencil, Trash2, Upload, X, BadgeCheck, CircleX } from "lucide-react";
import { customersService, type Customer } from "@/services/customersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";
import LocationPicker from "@/components/LocationPicker";
import UserStatusStats, { type UserStatusCounts } from "@/components/UserStatusStats";

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
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<UserStatusCounts>({ total: 0, active: 0, inactive: 0, deleted: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletionFilter, setDeletionFilter] = useState("false");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", mobile: "", email: "", bio: "", locationName: "", locationLat: "", locationLng: "",
  });
  const [createErrors, setCreateErrors] = useState<Partial<typeof createForm>>({});
  const [creating, setCreating] = useState(false);
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
  const [createPhotoPreview, setCreatePhotoPreview] = useState("");
  const createPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!createPhotoPreview) return;
    return () => URL.revokeObjectURL(createPhotoPreview);
  }, [createPhotoPreview]);

  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [editOpen, setEditOpen]     = useState(false);
  const [editForm, setEditForm]     = useState(INIT_EDIT);
  const [editErrors, setEditErrors] = useState<Partial<typeof INIT_EDIT>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState("");
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editPhotoPreview) return;
    return () => URL.revokeObjectURL(editPhotoPreview);
  }, [editPhotoPreview]);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
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
    customersService.getAll({
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
      .catch(() => {
        if (active) toast({ variant: "destructive", title: "Failed to load customers" });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deletionFilter, page, pageSize, debouncedSearch, refreshKey]);

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
    setEditPhotoFile(null);
    setEditPhotoPreview("");
    if (editPhotoInputRef.current) editPhotoInputRef.current.value = "";
    setEditOpen(true);
  }

  function openDelete(c: Customer) { setDeleteTarget(c); setDeleteOpen(true); }

  async function handleToggleStatus(c: Customer) {
    try {
      const res = await customersService.updateStatus(c._id, !c.isActive);
      setData((prev) => prev.map((item) => item._id === c._id ? res.data.data : item));
      setRefreshKey((key) => key + 1);
      toast({ title: `Customer ${!c.isActive ? "activated" : "deactivated"} successfully` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function handleEdit() {
    const errs: Partial<typeof INIT_EDIT> = {};
    if (!editForm.name.trim()) errs.name = "Name is required";
    if (editForm.mobile.trim() && !/^\d{10}$/.test(editForm.mobile.trim())) {
      errs.mobile = "Mobile must be exactly 10 digits";
    }
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("name", editForm.name.trim());
      if (editForm.email.trim()) payload.append("email", editForm.email.trim());
      if (editForm.bio.trim()) payload.append("bio", editForm.bio.trim());
      if (editForm.mobile.trim()) payload.append("mobile", editForm.mobile.trim());
      if (editForm.locationName.trim()) {
        payload.append("location", JSON.stringify({
          name: editForm.locationName.trim(),
          latitude: parseFloat(editForm.locationLat),
          longitude: parseFloat(editForm.locationLng),
        }));
      }
      if (editPhotoFile) payload.append("profilePhoto", editPhotoFile);

      const res = await customersService.update(editTarget!._id, payload);
      setData((prev) => prev.map((item) => item._id === editTarget!._id ? res.data.data : item));
      setRefreshKey((key) => key + 1);
      setEditPhotoFile(null);
      setEditPhotoPreview("");
      toast({ title: "Customer updated successfully" });
      setEditOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to update customer" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCustomer() {
    const name = createForm.name.trim();
    const mobile = createForm.mobile.trim();
    const errors: Partial<typeof createForm> = {};
    if (!name) errors.name = "Name is required";
    if (!mobile) errors.mobile = "Mobile is required";
    else if (!/^\d{10}$/.test(mobile)) errors.mobile = "Mobile must be exactly 10 digits";
    if (createForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (Object.keys(errors).length) {
      setCreateErrors(errors);
      return;
    }

    setCreating(true);
    try {
      const payload = new FormData();
      payload.append("name", name);
      payload.append("mobile", mobile);
      if (createForm.email.trim()) payload.append("email", createForm.email.trim());
      if (createForm.bio.trim()) payload.append("bio", createForm.bio.trim());
      if (createForm.locationName.trim()) {
        payload.append("location", JSON.stringify({
          name: createForm.locationName.trim(),
          latitude: parseFloat(createForm.locationLat),
          longitude: parseFloat(createForm.locationLng),
        }));
      }
      if (createPhotoFile) payload.append("profilePhoto", createPhotoFile);

      const res = await customersService.create(payload);
      setData((prev) => [res.data.data, ...prev.filter((customer) => customer._id !== res.data.data._id)]);
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setDeletionFilter("false");
      setRefreshKey((key) => key + 1);
      setCreateOpen(false);
      setCreateForm({ name: "", mobile: "", email: "", bio: "", locationName: "", locationLat: "", locationLng: "" });
      setCreatePhotoFile(null);
      setCreatePhotoPreview("");
      setCreateErrors({});
      toast({ title: "Customer created successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to create customer" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customersService.remove(deleteTarget._id);
      setData((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      setPage(1);
      setRefreshKey((key) => key + 1);
      toast({ title: "Customer deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete customer" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all registered customers.</p>
        </div>
        <Button onClick={() => { setCreateErrors({}); setCreateOpen(true); }}>+ Add Customer</Button>
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
              <button
                type="button"
                aria-label="Show searchable customer fields"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="space-y-1">
                <p>Search by:</p>
                <p>Name</p>
                <p>Email</p>
                <p>Mobile number</p>
              </div>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1" />
          <select aria-label="Deleted status" value={deletionFilter} onChange={(e) => { setDeletionFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="false">Not Deleted</option><option value="true">Deleted</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-8 rounded-md border bg-background px-3 text-xs"
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <p className="text-sm text-muted-foreground">{total} customer{total !== 1 ? "s" : ""}</p>
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
            ) : data.length === 0 ? (
              <tr><td colSpan={14} className="text-center text-muted-foreground py-16">No customers found</td></tr>
            ) : data.map((c, i) => (
              <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-24">
                  <div className="flex items-center gap-1">
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
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{c.email || "—"}</span>
                    {c.email && (c.emailVerified
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"><BadgeCheck className="h-3.5 w-3.5" />Verified</span>
                      : <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"><CircleX className="h-3.5 w-3.5" />Not verified</span>)}
                  </div>
                </td>
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
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} entries
          </span>
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

      {/* Add Customer Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!creating) setCreateOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Profile Photo</Label>
              <input
                ref={createPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setCreatePhotoFile(file);
                  setCreatePhotoPreview(URL.createObjectURL(file));
                }}
              />
              <div className="flex items-center gap-3">
                {createPhotoPreview ? (
                  <img src={createPhotoPreview} alt="Selected profile" className="h-14 w-14 rounded-full border object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full border bg-muted flex items-center justify-center text-xs text-muted-foreground">Optional</div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => createPhotoInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Choose Photo
                </Button>
                {createPhotoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreatePhotoFile(null);
                      setCreatePhotoPreview("");
                      if (createPhotoInputRef.current) createPhotoInputRef.current.value = "";
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="new-customer-name"
                value={createForm.name}
                onChange={(e) => {
                  setCreateForm((form) => ({ ...form, name: e.target.value }));
                  setCreateErrors((errors) => ({ ...errors, name: undefined }));
                }}
                placeholder="Customer name"
                autoFocus
              />
              {createErrors.name && <p className="text-xs text-destructive">{createErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-mobile">Mobile <span className="text-destructive">*</span></Label>
              <Input
                id="new-customer-mobile"
                type="tel"
                inputMode="tel"
                maxLength={10}
                value={createForm.mobile}
                onChange={(e) => {
                  setCreateForm((form) => ({ ...form, mobile: e.target.value }));
                  setCreateErrors((errors) => ({ ...errors, mobile: undefined }));
                }}
                placeholder="Mobile number"
              />
              {createErrors.mobile && <p className="text-xs text-destructive">{createErrors.mobile}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-email">Email</Label>
              <Input
                id="new-customer-email"
                type="email"
                value={createForm.email}
                onChange={(e) => {
                  setCreateForm((form) => ({ ...form, email: e.target.value }));
                  setCreateErrors((errors) => ({ ...errors, email: undefined }));
                }}
                placeholder="email@example.com"
              />
              {createErrors.email && <p className="text-xs text-destructive">{createErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <LocationPicker
                value={createForm.locationName ? {
                  name: createForm.locationName,
                  latitude: parseFloat(createForm.locationLat) || 0,
                  longitude: parseFloat(createForm.locationLng) || 0,
                } : null}
                onChange={(location) => setCreateForm((form) => ({
                  ...form,
                  locationName: location.name,
                  locationLat: location.latitude.toString(),
                  locationLng: location.longitude.toString(),
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-bio">Bio</Label>
              <Input
                id="new-customer-bio"
                value={createForm.bio}
                onChange={(e) => setCreateForm((form) => ({ ...form, bio: e.target.value }))}
                placeholder="Short bio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateCustomer} disabled={creating}>{creating ? "Creating..." : "Add Customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Profile Photo (optional)</Label>
              <input
                ref={editPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setEditPhotoFile(file);
                  setEditPhotoPreview(URL.createObjectURL(file));
                }}
              />
              <div className="flex items-center gap-3">
                {(editPhotoPreview || editTarget?.profilePhoto) ? (
                  <img
                    src={editPhotoPreview || editTarget?.profilePhoto}
                    alt="Customer profile"
                    className="h-14 w-14 rounded-full border object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full border bg-muted flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => editPhotoInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Choose Photo
                </Button>
                {editPhotoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditPhotoFile(null);
                      setEditPhotoPreview("");
                      if (editPhotoInputRef.current) editPhotoInputRef.current.value = "";
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Cancel Photo Change
                  </Button>
                )}
              </div>
            </div>
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
                onChange={(e) => {
                  setEditForm((f) => ({ ...f, mobile: e.target.value }));
                  setEditErrors((errors) => ({ ...errors, mobile: undefined }));
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
              {editErrors.mobile && <p className="text-xs text-destructive">{editErrors.mobile}</p>}
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
