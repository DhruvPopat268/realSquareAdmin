import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, ChevronDown } from "lucide-react";
import { PROPERTY_TYPES, type PropertyType } from "@/data/propertyTypesData";
import { PROPERTY_CATEGORIES } from "@/data/propertyCategoriesData";

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

const emptyForm = { name: "", category: "", description: "", isActive: true };

export default function PropertyTypesPage() {
  const [data, setData]                   = useState(PROPERTY_TYPES);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<"All" | "Yes" | "No">("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [open, setOpen]                   = useState(false);
  const [form, setForm]                   = useState(emptyForm);
  const [errors, setErrors]               = useState<{ name?: string; category?: string }>({});

  const categoryOptions = useMemo(() => PROPERTY_CATEGORIES.filter((c) => c.isActive).map((c) => c.name), []);
  const allCategories   = useMemo(() => ["All", ...PROPERTY_CATEGORIES.map((c) => c.name)], []);

  function toggleActive(id: string) {
    setData((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !t.isActive, updatedAt: new Date().toISOString() } : t));
  }

  function openDialog() { setForm(emptyForm); setErrors({}); setOpen(true); }

  function handleSubmit() {
    const errs: { name?: string; category?: string } = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.category)    errs.category = "Category is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const now = new Date().toISOString();
    const newEntry: PropertyType = {
      id: `pt-${Date.now()}`, name: form.name.trim(), category: form.category,
      description: form.description.trim(), isActive: form.isActive, createdAt: now, updatedAt: now,
    };
    setData((prev) => [newEntry, ...prev]);
    setOpen(false);
  }

  const filtered = useMemo(() =>
    data.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch  = t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      const matchStatus  = statusFilter === "All" || (statusFilter === "Yes" ? t.isActive : !t.isActive);
      const matchCat     = categoryFilter === "All" || t.category === categoryFilter;
      return matchSearch && matchStatus && matchCat;
    }), [data, search, statusFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Types</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage property types grouped by category.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openDialog}>
          <Plus className="h-3.5 w-3.5" /> Add Type
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search types..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{filtered.length} type{filtered.length !== 1 ? "s" : ""}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Category: {categoryFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {allCategories.map((c) => (
              <DropdownMenuItem key={c} onClick={() => setCategoryFilter(c)}>{c}</DropdownMenuItem>
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
            <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Yes")}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("No")}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-16">No property types found</td></tr>
            ) : filtered.map((t, i) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{t.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[t.category] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                    {t.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-sm"><span className="line-clamp-2">{t.description}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t.id)} className="scale-90" />
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
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(t.id)}>{t.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Property Type</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pt-name">Name <span className="text-destructive">*</span></Label>
              <Input id="pt-name" placeholder="e.g. Apartment, Office Space, Residential Plot"
                value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: undefined })); }} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className={form.category ? "text-foreground" : "text-muted-foreground"}>
                      {form.category || "Select a category"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {categoryOptions.map((c) => (
                    <DropdownMenuItem key={c} onClick={() => { setForm((f) => ({ ...f, category: c })); setErrors((er) => ({ ...er, category: undefined })); }}>
                      {c}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-desc">Description</Label>
              <Textarea id="pt-desc" placeholder="Brief description of this type..." rows={3}
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pt-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="pt-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                <span className={`text-xs font-medium ${form.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                  {form.isActive ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
