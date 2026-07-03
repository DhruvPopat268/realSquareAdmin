import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { systemUsersService, type SystemUser } from "@/services/systemUsersService";
import { systemUsersRolesService, type SystemUserRole } from "@/services/systemUsersRolesService";
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
  name: "", email: "", password: "", phone: "",
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
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (rid)          p.role     = rid;
    if (q?.trim())    p.search   = q.trim();
    return p;
  }

  async function fetchUsers(sf = statusFilter, rid = roleFilter?.id, q = search) {
    setLoading(true);
    try {
      const res = await systemUsersService.getAll(buildParams(sf, rid, q));
      setData(res.data.data);
    } catch (err: any) {
      toast({ variant: "destructive", title: extractMsg(err, "Failed to load users") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    systemUsersRolesService.getAll({ isActive: "true" })
      .then((r) => setRoles(r.data.data))
      .catch(() => {});
    fetchUsers("All", undefined, "");
  }, []);

  // ── Filtered + paginated ───────────────────────────────────────────────────
  const filtered = useMemo(() => data, [data]);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters = search !== "" || statusFilter !== "All" || roleFilter !== null;

  function clearFilters() {
    setSearch(""); setStatusFilter("All"); setRoleFilter(null); setPage(1);
    fetchUsers("All", undefined, "");
  }

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
      name:         u.profile?.name || u.profile?.fullName || "",
      email:        u.profile?.email || "",
      phone:        u.profile?.phone || "",
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
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const payload: any = {
          profile: {
            name:  form.name.trim(),
            email: form.email.trim(),
            ...(form.phone.trim() && { phone: form.phone.trim() }),
          },
          role:         form.roleId || null,
          isActive:     form.isActive,
          isSuperAdmin: form.isSuperAdmin,
        };
        const res = await systemUsersService.update(editTarget._id, payload);
        setData((prev) => prev.map((u) => u._id === editTarget._id ? res.data.data : u));
        toast({ title: "User updated successfully" });
      } else {
        const payload: any = {
          profile: {
            name:     form.name.trim(),
            email:    form.email.trim(),
            password: form.password,
            ...(form.phone.trim() && { phone: form.phone.trim() }),
          },
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
        setErrors((e) => ({ ...e, email: "Email already in use" }));  // keep same key for form field
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); fetchUsers(statusFilter, roleFilter?.id, e.target.value); }}
            className="pl-8 h-9 w-64 text-sm"
          />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">
            Clear all
          </button>
        )}
        {/* Role filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Role: {roleFilter ? roleFilter.name : "All"} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => { setRoleFilter(null); setPage(1); fetchUsers(statusFilter, undefined, search); }}>All</DropdownMenuItem>
            {roles.map((r) => (
              <DropdownMenuItem key={r._id} onClick={() => { setRoleFilter({ id: r._id, name: r.name }); setPage(1); fetchUsers(statusFilter, r._id, search); }}>
                {r.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setStatusFilter("All"); setPage(1); fetchUsers("All", roleFilter?.id, search); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Yes"); setPage(1); fetchUsers("Yes", roleFilter?.id, search); }}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("No");  setPage(1); fetchUsers("No",  roleFilter?.id, search); }}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
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
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{u.profile?.name || u.profile?.fullName || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.profile?.email || "—"}</td>
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

            {/* Phone */}
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
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

            {/* Role */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
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

            {/* Is Active */}
            <div className="flex items-center justify-between">
              <Label>Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setField("isActive", v)} />
                <span className={`text-xs font-medium ${form.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                  {form.isActive ? "Yes" : "No"}
                </span>
              </div>
            </div>

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
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.profile?.name || deleteTarget?.profile?.fullName}</span>? This action cannot be undone.
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
