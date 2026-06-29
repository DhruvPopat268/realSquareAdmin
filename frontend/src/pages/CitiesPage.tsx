import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { citiesService, type City } from "@/services/citiesService";
import { statesService, type State } from "@/services/statesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function CitiesPage() {
  const { toast } = useToast();

  const [data, setData]                 = useState<City[]>([]);
  const [states, setStates]             = useState<State[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");
  const [stateFilter, setStateFilter]   = useState<{ id: string; name: string } | null>(null);

  // dialog
  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState<City | null>(null);
  const [name, setName]             = useState("");
  const [stateId, setStateId]       = useState("");
  const [isActive, setIsActive]     = useState(true);
  const [errors, setErrors]         = useState<{ name?: string; state?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<City | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  async function fetchCities(params?: Record<string, string>) {
    setLoading(true);
    try {
      const res = await citiesService.getAll(params ?? buildParams(statusFilter, stateFilter?.id, search));
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load cities" });
    } finally {
      setLoading(false);
    }
  }

  function buildParams(sf: "All" | "Yes" | "No", sid?: string, q?: string) {
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (sid)          p.state    = sid;
    if (q?.trim())    p.search   = q.trim();
    return p;
  }

  useEffect(() => {
    statesService.getAll({ isActive: "true" }).then((r) => setStates(r.data.data)).catch(() => {});
    fetchCities(buildParams("All", undefined, ""));
  }, []);

  function openCreate() {
    setEditTarget(null); setName(""); setStateId(""); setIsActive(true); setErrors({}); setOpen(true);
  }

  function openEdit(c: City) {
    setEditTarget(c); setName(c.name); setStateId(c.state._id); setIsActive(c.isActive); setErrors({}); setOpen(true);
  }

  async function handleSubmit() {
    const errs: { name?: string; state?: string } = {};
    if (!name.trim()) errs.name  = "Name is required";
    if (!stateId)     errs.state = "State is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await citiesService.update(editTarget._id, { name: name.trim(), state: stateId, isActive });
        setData((prev) => prev.map((c) => c._id === editTarget._id ? res.data.data : c));
        toast({ title: "City updated successfully" });
      } else {
        const res = await citiesService.create({ name: name.trim(), state: stateId, isActive });
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "City created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setErrors((e) => ({ ...e, name: "City name already exists in this state" }));
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(c: City) {
    try {
      const res = await citiesService.update(c._id, { isActive: !c.isActive });
      setData((prev) => prev.map((item) => item._id === c._id ? res.data.data : item));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  function openDelete(c: City) { setDeleteTarget(c); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await citiesService.remove(deleteTarget._id);
      setData((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      toast({ title: "City deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete city" });
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = search !== "" || statusFilter !== "All" || stateFilter !== null;

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setStateFilter(null);
    fetchCities(buildParams("All", undefined, ""));
  }

  function onSearch(q: string) {
    setSearch(q);
    fetchCities(buildParams(statusFilter, stateFilter?.id, q));
  }

  function onStatusFilter(sf: "All" | "Yes" | "No") {
    setStatusFilter(sf);
    fetchCities(buildParams(sf, stateFilter?.id, search));
  }

  function onStateFilter(s: { id: string; name: string } | null) {
    setStateFilter(s);
    fetchCities(buildParams(statusFilter, s?.id, search));
  }

  const selectedStateName = stateFilter ? stateFilter.name : "All";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage cities available for property listings.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add City
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search cities..." value={search} onChange={(e) => onSearch(e.target.value)} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} cit{data.length !== 1 ? "ies" : "y"}</p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">Clear all</button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              State: {selectedStateName} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => onStateFilter(null)}>All</DropdownMenuItem>
            {states.map((s) => (
              <DropdownMenuItem key={s._id} onClick={() => onStateFilter({ id: s._id, name: s.name })}>{s.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStatusFilter("All")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusFilter("Yes")}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusFilter("No")}>No</DropdownMenuItem>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16"><Spinner size="md" label="Loading cities..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-16">No cities found</td></tr>
            ) : data.map((c, i) => (
              <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-20">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openDelete(c)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.state?.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} className="scale-90" />
                    <span className={`text-xs font-medium ${c.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {c.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(c.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(c.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(c.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(c.updatedAt).time}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editTarget ? "Edit City" : "Add City"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="city-name">Name <span className="text-destructive">*</span></Label>
              <Input id="city-name" placeholder="e.g. Mumbai" value={name} onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: undefined })); }} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>State <span className="text-destructive">*</span></Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className={stateId ? "text-foreground" : "text-muted-foreground"}>
                      {stateId ? states.find((s) => s._id === stateId)?.name : "Select a state"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-52 overflow-y-auto">
                  {states.map((s) => (
                    <DropdownMenuItem key={s._id} onClick={() => { setStateId(s._id); setErrors((er) => ({ ...er, state: undefined })); }}>
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="city-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="city-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update City" : "Create City"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete City</DialogTitle></DialogHeader>
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
