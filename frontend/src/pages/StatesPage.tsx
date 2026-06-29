import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { statesService, type State } from "@/services/statesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function StatesPage() {
  const { toast } = useToast();

  const [data, setData]                 = useState<State[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");

  // dialog state
  const [open, setOpen]           = useState(false);
  const [editTarget, setEditTarget] = useState<State | null>(null);
  const [name, setName]           = useState("");
  const [isActive, setIsActive]   = useState(true);
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<State | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  async function fetchStates(activeFilter?: "All" | "Yes" | "No", nameSearch?: string) {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      const filter = activeFilter ?? statusFilter;
      const q      = nameSearch  ?? search;
      if (filter === "Yes") params.isActive = "true";
      if (filter === "No")  params.isActive = "false";
      if (q.trim())         params.search   = q.trim();
      const res = await statesService.getAll(params);
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load states" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStates(); }, []);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setIsActive(true);
    setNameError("");
    setOpen(true);
  }

  function openEdit(s: State) {
    setEditTarget(s);
    setName(s.name);
    setIsActive(s.isActive);
    setNameError("");
    setOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) { setNameError("Name is required"); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await statesService.update(editTarget._id, { name: name.trim(), isActive });
        setData((prev) => prev.map((s) => s._id === editTarget._id ? res.data.data : s));
        toast({ title: "State updated successfully" });
      } else {
        const res = await statesService.create({ name: name.trim(), isActive });
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "State created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setNameError("State name already exists");
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(s: State) {
    try {
      const res = await statesService.update(s._id, { isActive: !s.isActive });
      setData((prev) => prev.map((item) => item._id === s._id ? res.data.data : item));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  function openDelete(s: State) { setDeleteTarget(s); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await statesService.remove(deleteTarget._id);
      setData((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      toast({ title: "State deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete state" });
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = search !== "" || statusFilter !== "All";

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    fetchStates("All", "");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">States</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage states available for property listings.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add State
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search states..." value={search} onChange={(e) => { setSearch(e.target.value); fetchStates(undefined, e.target.value); }} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} state{data.length !== 1 ? "s" : ""}</p>
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
            <DropdownMenuItem onClick={() => { setStatusFilter("All"); fetchStates("All"); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Yes"); fetchStates("Yes"); }}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("No");  fetchStates("No");  }}>No</DropdownMenuItem>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-16"><Spinner fullPage={false} size="md" label="Loading states..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-16">No states found</td></tr>
            ) : data.map((s, i) => (
              <tr key={s._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-20">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openDelete(s)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={s.isActive} onCheckedChange={() => toggleActive(s)} className="scale-90" />
                    <span className={`text-xs font-medium ${s.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {s.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(s.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(s.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(s.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(s.updatedAt).time}</p>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editTarget ? "Edit State" : "Add State"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="state-name">Name <span className="text-destructive">*</span></Label>
              <Input id="state-name" placeholder="e.g. Maharashtra" value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }} />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="state-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="state-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update State" : "Create State"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete State</DialogTitle></DialogHeader>
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
