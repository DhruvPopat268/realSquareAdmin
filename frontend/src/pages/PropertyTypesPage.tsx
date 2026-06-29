import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { propertyTypesService, type PropertyType } from "@/services/propertyTypesService";
import { propertyCategoriesService, type PropertyCategory } from "@/services/propertyCategoriesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

const categoryColors: Record<string, string> = {
  "Residential": "bg-blue-50 text-blue-700 border border-blue-200",
  "Commercial":  "bg-orange-50 text-orange-700 border border-orange-200",
  "Land / Plot": "bg-green-50 text-green-700 border border-green-200",
};

export default function PropertyTypesPage() {
  const { toast } = useToast();

  const [data, setData]                   = useState<PropertyType[]>([]);
  const [categories, setCategories]       = useState<PropertyCategory[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<"All" | "Yes" | "No">("All");
  const [categoryFilter, setCategoryFilter] = useState<{ id: string; name: string } | null>(null);

  // dialog
  const [open, setOpen]               = useState(false);
  const [editTarget, setEditTarget]   = useState<PropertyType | null>(null);
  const [name, setName]               = useState("");
  const [categoryId, setCategoryId]   = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive]       = useState(true);
  const [errors, setErrors]           = useState<{ name?: string; category?: string }>({});
  const [submitting, setSubmitting]   = useState(false);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<PropertyType | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  function buildParams(sf: "All" | "Yes" | "No", cid?: string, q?: string) {
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive         = "true";
    if (sf === "No")  p.isActive         = "false";
    if (cid)          p.propertyCategory = cid;
    if (q?.trim())    p.search           = q.trim();
    return p;
  }

  async function fetchTypes(sf: "All" | "Yes" | "No", cid: string | undefined, q: string) {
    setLoading(true);
    try {
      const res = await propertyTypesService.getAll(buildParams(sf, cid, q));
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load property types" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    propertyCategoriesService.getAll({ isActive: "true" }).then((r) => setCategories(r.data.data)).catch(() => {});
    fetchTypes("All", undefined, "");
  }, []);

  const hasFilters = search !== "" || statusFilter !== "All" || categoryFilter !== null;

  function clearFilters() {
    setSearch(""); setStatusFilter("All"); setCategoryFilter(null);
    fetchTypes("All", undefined, "");
  }

  function openCreate() {
    setEditTarget(null); setName(""); setCategoryId(""); setDescription(""); setIsActive(true); setErrors({}); setOpen(true);
  }

  function openEdit(t: PropertyType) {
    setEditTarget(t); setName(t.name); setCategoryId(t.propertyCategory._id); setDescription(t.description); setIsActive(t.isActive); setErrors({}); setOpen(true);
  }

  async function handleSubmit() {
    const errs: { name?: string; category?: string } = {};
    if (!name.trim())  errs.name     = "Name is required";
    if (!categoryId)   errs.category = "Category is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await propertyTypesService.update(editTarget._id, { name: name.trim(), propertyCategory: categoryId, description, isActive });
        setData((prev) => prev.map((t) => t._id === editTarget._id ? res.data.data : t));
        toast({ title: "Property type updated successfully" });
      } else {
        const res = await propertyTypesService.create({ name: name.trim(), propertyCategory: categoryId, description, isActive });
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "Property type created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setErrors((e) => ({ ...e, name: "Property type name already exists in this category" }));
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(t: PropertyType) {
    try {
      const res = await propertyTypesService.update(t._id, { isActive: !t.isActive });
      setData((prev) => prev.map((item) => item._id === t._id ? res.data.data : item));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  function openDelete(t: PropertyType) { setDeleteTarget(t); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await propertyTypesService.remove(deleteTarget._id);
      setData((prev) => prev.filter((t) => t._id !== deleteTarget._id));
      toast({ title: "Property type deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete property type" });
    } finally {
      setDeleting(false);
    }
  }

  const selectedCategoryName = categoryFilter ? categoryFilter.name : "All";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Types</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage property types grouped by category.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Type
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search types..." value={search} onChange={(e) => { setSearch(e.target.value); fetchTypes(statusFilter, categoryFilter?.id, e.target.value); }} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} type{data.length !== 1 ? "s" : ""}</p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">Clear all</button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Category: {selectedCategoryName} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => { setCategoryFilter(null); fetchTypes(statusFilter, undefined, search); }}>All</DropdownMenuItem>
            {categories.map((c) => (
              <DropdownMenuItem key={c._id} onClick={() => { setCategoryFilter({ id: c._id, name: c.name }); fetchTypes(statusFilter, c._id, search); }}>{c.name}</DropdownMenuItem>
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
            <DropdownMenuItem onClick={() => { setStatusFilter("All"); fetchTypes("All", categoryFilter?.id, search); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Yes"); fetchTypes("Yes", categoryFilter?.id, search); }}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("No");  fetchTypes("No",  categoryFilter?.id, search); }}>No</DropdownMenuItem>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-16"><Spinner size="md" label="Loading property types..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-16">No property types found</td></tr>
            ) : data.map((t, i) => (
              <tr key={t._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-20">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openDelete(t)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{t.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[t.propertyCategory?.name] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                    {t.propertyCategory?.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{t.description || "—"}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t)} className="scale-90" />
                    <span className={`text-xs font-medium ${t.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {t.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(t.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(t.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(t.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(t.updatedAt).time}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Property Type" : "Add Property Type"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pt-name">Name <span className="text-destructive">*</span></Label>
              <Input id="pt-name" placeholder="e.g. Apartment, Office Space" value={name} onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: undefined })); }} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className={categoryId ? "text-foreground" : "text-muted-foreground"}>
                      {categoryId ? categories.find((c) => c._id === categoryId)?.name : "Select a category"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-52 overflow-y-auto">
                  {categories.map((c) => (
                    <DropdownMenuItem key={c._id} onClick={() => { setCategoryId(c._id); setErrors((er) => ({ ...er, category: undefined })); }}>
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-desc">Description</Label>
              <Textarea id="pt-desc" placeholder="Brief description of this type..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pt-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="pt-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update Type" : "Create Type"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Property Type</DialogTitle></DialogHeader>
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
