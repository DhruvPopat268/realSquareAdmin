import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { systemUsersService, type SystemUser } from "@/services/systemUsersService";
import { type SystemUserRole } from "@/services/systemUsersRolesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

// ── Admin role ID ───────────────────────────────────────────────────────────
const ADMIN_ROLE_ID = import.meta.env.VITE_ADMIN_ROLE;

// ── Role IDs to exclude from the dropdown ────────────────────────────────────
const EXCLUDED_ROLE_IDS = new Set([
  import.meta.env.VITE_ADMIN_ROLE,
  import.meta.env.VITE_OWNER_ROLE,
  import.meta.env.VITE_BROKER_ROLE,
  import.meta.env.VITE_BUILDER_ROLE,
  import.meta.env.VITE_CUSTOMER_ROLE,
].filter(Boolean));

const PAGE_SIZES = [10, 25, 50];

// extract error message from any API error response
function extractMsg(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors?.length) return data.errors.map((e: any) => e.msg).join(", ");
  return fallback;
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

const INIT_FORM = {
  name: "", email: "", password: "", mobile: "",
  roleId: "", isActive: true, isSuperAdmin: false,
};

type FormState = typeof INIT_FORM;
type FormErrors = Partial<Record<keyof FormState, string>>;

export default function SystemUsersPage() {
  const { toast } = useToast();

  const [data, setData]                   = useState<SystemUser[]>([]);
  const [roles, setRoles]                 = useState<SystemUserRole[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [roleFilter, setRoleFilter]       = useState<{ id: string; name: string } | null>(null);
  const [statusFilter, setStatusFilter]   = useState<"All" | "Yes" | "No">("All");
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(10);
  const [total, setTotal]                 = useState(0);
  const [totalPages, setTotalPages]       = useState(1);

  // Pending filters (before Apply is clicked)
  const [pendingSearch, setPendingSearch]               = useState("");
  const [pendingRoleFilter, setPendingRoleFilter]       = useState<{ id: string; name: string } | null>(null);
  const [pendingStatusFilter, setPendingStatusFilter]   = useState<"All" | "Yes" | "No">("All");

  // dialog
  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState<SystemUser | null>(null);
  const [form, setForm]             = useState<FormState>(INIT_FORM);
  const [errors, setErrors]         = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass]     = useState(false);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  function buildParams(sf: "All" | "Yes" | "No", rid?: string, q?: string) {
    const p: Record<string, string | number> = {
      page: page,
      limit: pageSize
    };
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (rid)          p.role     = rid;
    if (q?.trim())    p.search   = q.trim();
    return p;
  }

  async function fetchUsers(sf: "All" | "Yes" | "No", rid?: string, q?: string) {
    setLoading(true);
    try {
      const res = await systemUsersService.getAll(buildParams(sf, rid, q));
      setData(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      toast({ variant: "destructive", title: extractMsg(err, "Failed to load users") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    systemUsersService.getRolesForSystemUsers()
      .then((r) => setRoles(r.data.data))
      .catch(() => {});
    fetchUsers("All", undefined, "");
    // Initialize pending filters to match applied filters on mount
    setPendingSearch("");
    setPendingRoleFilter(null);
    setPendingStatusFilter("All");
  }, []);

  // ── Filtered + paginated ───────────────────────────────────────────────────
  const filtered = data; // Data already filtered and paginated from backend
  const paged = data; // Already paginated from backend

  const hasFilters = search !== "" || statusFilter !== "All" || roleFilter !== null;

  function applyFilters() {
    setSearch(pendingSearch);
    setRoleFilter(pendingRoleFilter);
    setStatusFilter(pendingStatusFilter);
    setPage(1);
    fetchUsers(pendingStatusFilter, pendingRoleFilter?.id, pendingSearch);
  }

  async function clearFilters() {
    // Reset all states
    const resetSearch = "";
    const resetRole = null;
    const resetStatus: "All" | "Yes" | "No" = "All";
    
    setPendingSearch(resetSearch);
    setPendingRoleFilter(resetRole);
    setPendingStatusFilter(resetStatus);
    setSearch(resetSearch);
    setRoleFilter(resetRole);
    setStatusFilter(resetStatus);
    setPage(1);
    
    // Fetch with explicit reset values
    await fetchUsers(resetStatus, undefined, resetSearch);
  }

  function goToPage(p: number) {
    setPage(p);
  }

  // Refetch when page or pageSize changes
  useEffect(() => {
    if (roles.length > 0) { // Only fetch if roles are loaded (not initial render)
      fetchUsers(statusFilter, roleFilter?.id, search);
    }
  }, [page, pageSize]);

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function openCreate() {
    setEditTarget(null);
    setForm(INIT_FORM);
    setErrors({});
    setShowPass(false);
    setOpen(true);
  }

  function openEdit(u: SystemUser) {
    setEditTarget(u);
    setForm({
      name:         u.name || "",
      email:        u.email || "",
      mobile:       u.mobile || "",
      password:     "",
      roleId:       u.role?._id || "",
      isActive:     u.isActive,
      isSuperAdmin: u.isSuperAdmin,
    });
    setErrors({});
    setShowPass(false);
    setOpen(true);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.name.trim())  errs.name  = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!editTarget && !form.password.trim()) errs.password = "Password is required";
    if (form.mobile.trim() && !/^[0-9]{10}$/.test(form.mobile.trim())) {
      errs.mobile = "Mobile must be exactly 10 digits";
    }
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const payload: any = {
          name:  form.name.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          role:         form.roleId || null,
          isActive:     form.isActive,
          isSuperAdmin: form.isSuperAdmin,
        };
        const res = await systemUsersService.update(editTarget._id, payload);
        setData((prev) => prev.map((u) => u._id === editTarget._id ? res.data.data : u));
        toast({ title: "User updated successfully" });
      } else {
        const payload: any = {
          name:     form.name.trim(),
          email:    form.email.trim(),
          mobile:   form.mobile.trim(),
          profile:  { password: form.password },
          role:         form.roleId || undefined,
          isActive:     form.isActive,
          isSuperAdmin: form.isSuperAdmin,
        };
        const res = await systemUsersService.create(payload);
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "User created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = extractMsg(err, "Something went wrong");
      if (msg.toLowerCase().includes("email already")) {
        setErrors((e) => ({ ...e, email: "Email already in use" }));
      } else if (msg.toLowerCase().includes("mobile already")) {
        setErrors((e) => ({ ...e, mobile: "Mobile already in use" }));
      } else if (msg.toLowerCase().includes("mobile must be")) {
        setErrors((e) => ({ ...e, mobile: msg }));
      } else {
        toast({ variant: "destructive", title: msg });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u: SystemUser) {
    try {
      const res = await systemUsersService.update(u._id, { isActive: !u.isActive });
      setData((prev) => prev.map((item) => item._id === u._id ? res.data.data : item));
      toast({ title: `User ${!u.isActive ? "activated" : "deactivated"} successfully` });
    } catch (err: any) {
      toast({ variant: "destructive", title: extractMsg(err, "Failed to update status") });
    }
  }

  function openDelete(u: SystemUser) { setDeleteTarget(u); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await systemUsersService.remove(deleteTarget._id);
      setData((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      toast({ title: "User deleted successfully" });
      setDeleteOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: extractMsg(err, "Failed to delete user") });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage admin panel users and their access roles.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add User
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</p>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone..."
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
            className="pl-8 h-9 w-64 text-sm"
          />
        </div>
        {/* Role filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Role: {pendingRoleFilter ? pendingRoleFilter.name : "All"} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => setPendingRoleFilter(null)}>All</DropdownMenuItem>
            {roles.map((r) => (
              <DropdownMenuItem key={r._id} onClick={() => setPendingRoleFilter({ id: r._id, name: r.name })}>
                {r.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {pendingStatusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPendingStatusFilter("All")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPendingStatusFilter("Yes")}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPendingStatusFilter("No")}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" className="h-9" onClick={applyFilters}>Apply</Button>
        {hasFilters && (
          <Button size="sm" variant="destructive" className="h-9 gap-1.5" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mobile</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Activity</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-16"><Spinner fullPage={false} size="md" label="Loading users..." /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-muted-foreground py-16">No users found</td></tr>
            ) : paged.map((u, i) => (
              <tr key={u._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-20">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {u.role?._id !== ADMIN_ROLE_ID && (
                      <button onClick={() => openDelete(u)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  {u.name || "—"}
                </td>
                <td className="px-4 py-3 text-foreground">{u.mobile || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                <td className="px-4 py-3">
                  {u.role
                    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{u.role.name}</span>
                    : <span className="text-xs text-muted-foreground">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} disabled={u.role?._id === ADMIN_ROLE_ID} className="scale-90" />
                    <span className={`text-xs font-medium ${u.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {u.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {u.lastLogin ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(u.lastLogin).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(u.lastLogin).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {u.lastActivity ? (
                    <>
                      <p className="text-sm text-foreground">{fmtDate(u.lastActivity).date}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(u.lastActivity).time}</p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(u.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(u.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(u.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(u.updatedAt).time}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => goToPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page === totalPages || totalPages === 0} onClick={() => goToPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Full name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input placeholder="+91 XXXXX XXXXX" value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} />
              {errors.mobile && <p className="text-xs text-destructive">{errors.mobile}</p>}
            </div>
            {/* Password — only on create */}
            {!editTarget && (
              <div className="space-y-1.5">
                <Label>Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
            )}

            {/* Role — disabled for admin role in edit mode */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <DropdownMenu disabled={editTarget && editTarget.role?._id === ADMIN_ROLE_ID}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between font-normal"
                    disabled={editTarget && editTarget.role?._id === ADMIN_ROLE_ID}
                  >
                    <span className={form.roleId ? "text-foreground" : "text-muted-foreground"}>
                      {form.roleId ? roles.find((r) => r._id === form.roleId)?.name : "Select a role"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-52 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setField("roleId", "")}>— None —</DropdownMenuItem>
                  {roles.filter((r) => !EXCLUDED_ROLE_IDS.has(r._id)).map((r) => (
                    <DropdownMenuItem key={r._id} onClick={() => setField("roleId", r._id)}>{r.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Is Active — not shown for admin role in edit mode */}
            {!(editTarget && editTarget.role?._id === ADMIN_ROLE_ID) && (
              <div className="flex items-center justify-between">
                <Label>Is Active</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={form.isActive} onCheckedChange={(v) => setField("isActive", v)} />
                  <span className={`text-xs font-medium ${form.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                    {form.isActive ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editTarget ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
