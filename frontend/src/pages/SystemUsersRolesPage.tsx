import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { systemUsersRolesService, type SystemUserRole } from "@/services/systemUsersRolesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

// ── All available permissions ─────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  "dashboard",
  "properties",
  "projects",
  "leads",
  "enquiries",
  "states",
  "cities",
  "property-purposes",
  "property-categories",
  "property-types",
  "system-users",
  "system-users-roles",
  "owners",
  "agents-brokers",
  "builders-developers",
];

// ── Protected role IDs (seeded, cannot be deleted) ───────────────────────────
const PROTECTED_ROLE_IDS = new Set([
  import.meta.env.VITE_ADMIN_ROLE,
  import.meta.env.VITE_OWNER_ROLE,
  import.meta.env.VITE_BROKER_ROLE,
  import.meta.env.VITE_BUILDER_ROLE,
  import.meta.env.VITE_CUSTOMER_ROLE,
].filter(Boolean));

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function SystemUsersRolesPage() {
  const { toast } = useToast();

  const [data, setData]                 = useState<SystemUserRole[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");

  // dialog
  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState<SystemUserRole | null>(null);
  const [name, setName]             = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isActive, setIsActive]     = useState(true);
  const [nameError, setNameError]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<SystemUserRole | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  function buildParams(sf: "All" | "Yes" | "No", q?: string) {
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (q?.trim())    p.search   = q.trim();
    return p;
  }

  async function fetchRoles(sf = statusFilter, q = search) {
    setLoading(true);
    try {
      const res = await systemUsersRolesService.getAll(buildParams(sf, q));
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load roles" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRoles("All", ""); }, []);

  const hasFilters = search !== "" || statusFilter !== "All";

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    fetchRoles("All", "");
  }

  function openCreate() {
    setEditTarget(null);
    setName("");
    setPermissions([]);
    setIsActive(true);
    setNameError("");
    setOpen(true);
  }

  function openEdit(r: SystemUserRole) {
    setEditTarget(r);
    setName(r.name);
    setPermissions(r.permissions);
    setIsActive(r.isActive);
    setNameError("");
    setOpen(true);
  }

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  function toggleAllPermissions() {
    setPermissions((prev) =>
      prev.length === ALL_PERMISSIONS.length ? [] : [...ALL_PERMISSIONS]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) { setNameError("Name is required"); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await systemUsersRolesService.update(editTarget._id, { name: name.trim(), permissions, isActive });
        setData((prev) => prev.map((r) => r._id === editTarget._id ? res.data.data : r));
        toast({ title: "Role updated successfully" });
      } else {
        const res = await systemUsersRolesService.create({ name: name.trim(), permissions, isActive });
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "Role created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setNameError("Role name already exists");
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(r: SystemUserRole) {
    try {
      const res = await systemUsersRolesService.update(r._id, { isActive: !r.isActive });
      setData((prev) => prev.map((item) => item._id === r._id ? res.data.data : item));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  function openDelete(r: SystemUserRole) { setDeleteTarget(r); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await systemUsersRolesService.remove(deleteTarget._id);
      setData((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      toast({ title: "Role deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete role" });
    } finally {
      setDeleting(false);
    }
  }

  const allChecked = permissions.length === ALL_PERMISSIONS.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System User Roles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage roles and their permissions for system users.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Role
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchRoles(statusFilter, e.target.value); }}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} role{data.length !== 1 ? "s" : ""}</p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">
            Clear all
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setStatusFilter("All"); fetchRoles("All", search); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Yes"); fetchRoles("Yes", search); }}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("No");  fetchRoles("No",  search); }}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permissions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16"><Spinner fullPage={false} size="md" label="Loading roles..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-16">No roles found</td></tr>
            ) : data.map((r, i) => (
              <tr key={r._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-20">
                  <div className="flex items-center gap-1">
                    {!PROTECTED_ROLE_IDS.has(r._id) && (
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!PROTECTED_ROLE_IDS.has(r._id) && (
                      <button onClick={() => openDelete(r)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{r.name}</td>
                <td className="px-4 py-3">
                  {r.permissions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {r.permissions.map((p) => (
                        <Badge key={p} variant="secondary" className="text-[10px] px-2 py-0 font-medium capitalize">
                          {p.replace(/-/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={() => toggleActive(r)}
                      disabled={PROTECTED_ROLE_IDS.has(r._id)}
                      className="scale-90"
                    />
                    <span className={`text-xs font-medium ${r.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {r.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(r.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(r.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.updatedAt).time}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="role-name"
                placeholder="e.g. Support Team, Agent Manager"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>

            {/* Permissions */}
            <div className="space-y-2 opacity-50 pointer-events-none select-none">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                <button
                  type="button"
                  className="text-xs text-primary font-medium"
                  tabIndex={-1}
                >
                  {allChecked ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="border rounded-md p-3 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {ALL_PERMISSIONS.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-2 select-none"
                  >
                    <Checkbox
                      checked={permissions.includes(perm)}
                      disabled
                      className="shrink-0"
                    />
                    <span className="text-xs capitalize text-foreground">
                      {perm.replace(/-/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
              {permissions.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {permissions.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
                    >
                      {p.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between">
              <Label htmlFor="role-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="role-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={editTarget?._id ? PROTECTED_ROLE_IDS.has(editTarget._id) : false}
                />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
                  {isActive ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editTarget ? "Update Role" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Role</DialogTitle></DialogHeader>
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
