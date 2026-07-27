import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, ChevronDown, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { propertyCategoriesService, type PropertyCategory } from "@/services/propertyCategoriesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function PropertyCategoriesPage() {
  const { toast } = useToast();

  const [data, setData]                 = useState<PropertyCategory[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");

  // dialog
  const [open, setOpen]               = useState(false);
  const [editTarget, setEditTarget]   = useState<PropertyCategory | null>(null);
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive]       = useState(true);
  const [nameError, setNameError]     = useState("");
  const [submitting, setSubmitting]   = useState(false);

  function buildParams(sf: "All" | "Yes" | "No", q?: string) {
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (q?.trim())    p.search   = q.trim();
    return p;
  }

  async function fetchCategories(sf = statusFilter, q = search) {
    setLoading(true);
    try {
      const res = await propertyCategoriesService.getAll(buildParams(sf, q));
      setData(res.data.data.sort((a, b) => a.order - b.order));
    } catch {
      toast({ variant: "destructive", title: "Failed to load property categories" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCategories("All", ""); }, []);

  const hasFilters = search !== "" || statusFilter !== "All";

  function clearFilters() { setSearch(""); setStatusFilter("All"); fetchCategories("All", ""); }

  function openEdit(c: PropertyCategory) {
    setEditTarget(c); setName(c.name); setDescription(c.description); setIsActive(c.isActive); setNameError(""); setOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) { setNameError("Name is required"); return; }
    setSubmitting(true);
    try {
      const res = await propertyCategoriesService.update(editTarget!._id, { name: name.trim(), description, isActive });
      setData((prev) => prev.map((c) => c._id === editTarget!._id ? res.data.data : c));
      toast({ title: "Property category updated successfully" });
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("name already exists")) setNameError("Property category name already exists");
      else toast({ variant: "destructive", title: msg || "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(c: PropertyCategory) {
    try {
      const res = await propertyCategoriesService.update(c._id, { isActive: !c.isActive });
      setData((prev) => prev.map((item) => item._id === c._id ? res.data.data : item));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function handleReorder(c: PropertyCategory, direction: "up" | "down") {
    try {
      const res = await propertyCategoriesService.reorder(c._id, direction);
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to reorder" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define broad categories that classify property types.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search categories..." value={search} onChange={(e) => { setSearch(e.target.value); fetchCategories(statusFilter, e.target.value); }} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} categor{data.length !== 1 ? "ies" : "y"}</p>
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
            <DropdownMenuItem onClick={() => { setStatusFilter("All"); fetchCategories("All", search); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Yes"); fetchCategories("Yes", search); }}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("No");  fetchCategories("No",  search); }}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-36">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Display Order</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-16"><Spinner size="md" label="Loading categories..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-16">No categories found</td></tr>
            ) : data.map((c, i) => {
              const isFirst = i === 0;
              const isLast  = i === data.length - 1;
              return (
                <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleReorder(c, "up")} disabled={isFirst} className="p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleReorder(c, "down")} disabled={isLast} className="p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{c.description || "—"}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} className="scale-90" />
                      <span className={`text-xs font-medium ${c.isActive ? "text-green-600" : "text-muted-foreground"}`}>{c.isActive ? "Yes" : "No"}</span>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Property Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pc-name">Name <span className="text-destructive">*</span></Label>
              <Input id="pc-name" placeholder="e.g. Residential, Commercial, Land / Plot" value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }} />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-desc">Description</Label>
              <Textarea id="pc-desc" placeholder="Brief description..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pc-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="pc-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Update Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
