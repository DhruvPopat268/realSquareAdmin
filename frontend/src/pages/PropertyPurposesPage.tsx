import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { propertyPurposesService, type PropertyPurpose } from "@/services/propertyPurposesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function PropertyPurposesPage() {
  const { toast } = useToast();

  const [data, setData]                 = useState<PropertyPurpose[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");

  // dialog
  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState<PropertyPurpose | null>(null);
  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive]     = useState(true);
  const [nameError, setNameError]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<PropertyPurpose | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  function buildParams(sf: "All" | "Yes" | "No", q?: string) {
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (q?.trim())    p.search   = q.trim();
    return p;
  }

  async function fetchPurposes(sf = statusFilter, q = search) {
    setLoading(true);
    try {
      const res = await propertyPurposesService.getAll(buildParams(sf, q));
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load property purposes" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPurposes("All", ""); }, []);

  const hasFilters = search !== "" || statusFilter !== "All";

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    fetchPurposes("All", "");
  }

  function openCreate() {
    setEditTarget(null); setName(""); setDescription(""); setIsActive(true); setNameError(""); setOpen(true);
  }

  function openEdit(p: PropertyPurpose) {
    setEditTarget(p); setName(p.name); setDescription(p.description); setIsActive(p.isActive); setNameError(""); setOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) { setNameError("Name is required"); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await propertyPurposesService.update(editTarget._id, { name: name.trim(), description, isActive });
        setData((prev) => prev.map((p) => p._id === editTarget._id ? res.data.data : p));
        toast({ title: "Property purpose updated successfully" });
      } else {
        const res = await propertyPurposesService.create({ name: name.trim(), description, isActive });
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "Property purpose created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setNameError("Property purpose name already exists");
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(p: PropertyPurpose) {
    try {
      const res = await propertyPurposesService.update(p._id, { isActive: !p.isActive });
      setData((prev) => prev.map((item) => item._id === p._id ? res.data.data : item));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  function openDelete(p: PropertyPurpose) { setDeleteTarget(p); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await propertyPurposesService.remove(deleteTarget._id);
      setData((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      toast({ title: "Property purpose deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete property purpose" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Purposes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define the intent of a listing — Sell, Rent, PG / Co-living, etc.</p>
        </div>
        {/* <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Purpose
        </Button> */}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search purposes..." value={search} onChange={(e) => { setSearch(e.target.value); fetchPurposes(statusFilter, e.target.value); }} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} purpose{data.length !== 1 ? "s" : ""}</p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">Clear all</button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setStatusFilter("All"); fetchPurposes("All", search); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Yes"); fetchPurposes("Yes", search); }}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("No");  fetchPurposes("No",  search); }}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16"><Spinner size="md" label="Loading purposes..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-16">No purposes found</td></tr>
            ) : data.map((p, i) => (
              <tr key={p._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-20">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {/* <button onClick={() => openDelete(p)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button> */}
                  </div>
                </td>
                <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="line-clamp-2">{p.description || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={p.isActive} onCheckedChange={() => toggleActive(p)} className="scale-90" />
                    <span className={`text-xs font-medium ${p.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {p.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(p.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(p.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(p.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(p.updatedAt).time}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Property Purpose" : "Add Property Purpose"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pp-name">Name <span className="text-destructive">*</span></Label>
              <Input id="pp-name" placeholder="e.g. Sell, Rent, PG / Co-living" value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }} />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-desc">Description</Label>
              <Textarea id="pp-desc" placeholder="Brief description of this purpose..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pp-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="pp-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update Purpose" : "Create Purpose"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Property Purpose</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
